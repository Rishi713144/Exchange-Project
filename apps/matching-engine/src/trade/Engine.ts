import fs from "fs";
import { RedisManager } from "../RedisManager";
import { ORDER_UPDATE, TRADE_ADDED } from "../types/index";
import { CANCEL_ORDER, CREATE_ORDER, GET_DEPTH, GET_OPEN_ORDERS, MessageFromApi, ON_RAMP } from "../types/fromApi";
import { Fill, Order, Orderbook, formatNumber, toUnits } from "./Orderbook";

// Balances are kept as decimal numbers; orderbook price/quantity math uses fixed precision units.
export const BASE_CURRENCY = "INR";

interface UserBalance {
    [key: string]: {
        available: number;
        locked: number;
    }
}

export class Engine {
    private orderbooks: Orderbook[] = [];
    private balances: Map<string, UserBalance> = new Map();

    constructor() {
        let snapshot = null
        try {
            if (process.env.WITH_SNAPSHOT) {
                snapshot = fs.readFileSync("./snapshot.json");
            }
        } catch (e) {
            console.log("No snapshot found");
        }

        if (snapshot) {
            const snapshotSnapshot = JSON.parse(snapshot.toString());
            this.orderbooks = snapshotSnapshot.orderbooks.map((o: any) => new Orderbook(o.baseAsset, o.bids, o.asks, o.lastTradeId, o.currentPrice));
            this.balances = new Map(snapshotSnapshot.balances);
        } else {
            this.orderbooks = [new Orderbook(`TATA`, [], [], 0, 0)];
            this.setBaseBalances();
        }
        setInterval(() => {
            this.saveSnapshot();
        }, 1000 * 3);
    }

    saveSnapshot() {
        const snapshotSnapshot = {
            orderbooks: this.orderbooks.map(o => o.getSnapshot()),
            balances: Array.from(this.balances.entries())
        }
        fs.writeFileSync("./snapshot.json", JSON.stringify(snapshotSnapshot));
    }

    process({ message, clientId }: {message: MessageFromApi, clientId: string}) {
        switch (message.type) {
            case CREATE_ORDER:
                try {
                    const { executedQty, fills, orderId } = this.createOrder(message.data.market, message.data.price, message.data.quantity, message.data.side, message.data.userId);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_PLACED",
                        payload: {
                            orderId,
                            executedQty,
                            fills
                        }
                    });
                } catch (e) {
                    console.log(e);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId: "",
                            executedQty: 0,
                            remainingQty: 0
                        }
                    });
                }
                break;
            case CANCEL_ORDER:
                try {
                    const orderId = message.data.orderId;
                    const cancelMarket = message.data.market;
                    const cancelOrderbook = this.orderbooks.find(o => o.ticker() === cancelMarket);
                    const quoteAsset = cancelMarket.split("_")[1];
                    if (!cancelOrderbook) {
                        throw new Error("No orderbook found");
                    }

                    const order = cancelOrderbook.asks.find(o => o.orderId === orderId) || cancelOrderbook.bids.find(o => o.orderId === orderId);
                    if (!order) {
                        console.log("No order found");
                        throw new Error("No order found");
                    }

                    if (order.side === "buy") {
                        const price = cancelOrderbook.cancelBid(order)
                        const leftQuantity = toUnits((order.quantity - order.filled) * order.price);
                        //@ts-ignore
                        this.balances.get(order.userId)[BASE_CURRENCY].available += leftQuantity;
                        //@ts-ignore
                        this.balances.get(order.userId)[BASE_CURRENCY].locked -= leftQuantity;
                        if (price) {
                            this.sendUpdatedDepthAt(price.toString(), cancelMarket);
                        }
                    } else {
                        const price = cancelOrderbook.cancelAsk(order)
                        const leftQuantity = toUnits(order.quantity - order.filled);
                        //@ts-ignore
                        this.balances.get(order.userId)[quoteAsset].available += leftQuantity;
                        //@ts-ignore
                        this.balances.get(order.userId)[quoteAsset].locked -= leftQuantity;
                        if (price) {
                            this.sendUpdatedDepthAt(price.toString(), cancelMarket);
                        }
                    }

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId,
                            executedQty: 0,
                            remainingQty: 0
                        }
                    });

                    RedisManager.getInstance().pushMessage({
                        type: ORDER_UPDATE,
                        data: {
                            orderId: order.orderId,
                            executedQty: order.filled,
                            market: cancelMarket,
                            price: formatNumber(order.price),
                            quantity: formatNumber(order.quantity),
                            side: order.side,
                            userId: order.userId,
                            status: "cancelled",
                            timestamp: Date.now()
                        }
                    });
                    
                } catch (e) {
                    console.log("Error hwile cancelling order", );
                    console.log(e);
                }
                break;
            case GET_OPEN_ORDERS:
                try {
                    const openOrderbook = this.orderbooks.find(o => o.ticker() === message.data.market);
                    if (!openOrderbook) {
                        throw new Error("No orderbook found");
                    }
                    const openOrders = openOrderbook.getOpenOrders(message.data.userId);

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "OPEN_ORDERS",
                        payload: openOrders
                    }); 
                } catch(e) {
                    console.log(e);
                }
                break;
            case ON_RAMP:
                const userId = message.data.userId;
                const amount = Number(message.data.amount);
                this.onRamp(userId, amount);
                break;
            case GET_DEPTH:
                try {
                    const market = message.data.market;
                    const orderbook = this.orderbooks.find(o => o.ticker() === market);
                    if (!orderbook) {
                        throw new Error("No orderbook found");
                    }
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: orderbook.getDepth()
                    });
                } catch (e) {
                    console.log(e);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: {
                            bids: [],
                            asks: []
                        }
                    });
                }
                break;
        }
    }

    addOrderbook(orderbook: Orderbook) {
        this.orderbooks.push(orderbook);
    }

    createOrder(market: string, price: string, quantity: string, side: "buy" | "sell", userId: string) {

        const orderbook = this.orderbooks.find(o => o.ticker() === market)
        const baseAsset = market.split("_")[0];
        const quoteAsset = market.split("_")[1];

        if (!orderbook) {
            throw new Error("No orderbook found");
        }

        this.checkAndLockFunds(baseAsset, quoteAsset, side, userId, quoteAsset, price, quantity);

        const order: Order = {
            price: Number(price),
            quantity: Number(quantity),
            orderId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            filled: 0,
            side,
            userId
        }
        
        const { fills, executedQty } = orderbook.addOrder(order);
        this.updateBalance(userId, baseAsset, quoteAsset, side, fills, executedQty);

        this.createDbTrades(fills, market, userId, side);
        this.updateDbOrders(order, executedQty, fills, market);
        this.publisWsDepthUpdates(fills, price, side, market);
        this.publishWsTrades(fills, userId, market, order.orderId, side);
        return { executedQty, fills, orderId: order.orderId };
    }

    private getOrderStatus(executedQty: number, quantity: number): "open" | "partially_filled" | "filled" {
        if (toUnits(executedQty) >= toUnits(quantity)) {
            return "filled";
        }
        return toUnits(executedQty) > 0 ? "partially_filled" : "open";
    }

    updateDbOrders(order: Order, executedQty: number, fills: Fill[], market: string) {
        RedisManager.getInstance().pushMessage({
            type: ORDER_UPDATE,
            data: {
                orderId: order.orderId,
                executedQty: executedQty,
                market: market,
                price: formatNumber(order.price),
                quantity: formatNumber(order.quantity),
                side: order.side,
                userId: order.userId,
                status: this.getOrderStatus(executedQty, order.quantity),
                timestamp: Date.now()
            }
        });

        const makerSide = order.side === "buy" ? "sell" : "buy";
        fills.forEach(fill => {
            RedisManager.getInstance().pushMessage({
                type: ORDER_UPDATE,
                data: {
                    orderId: fill.markerOrderId,
                    executedQty: fill.makerFilled,
                    market: market,
                    price: formatNumber(Number(fill.price)),
                    quantity: formatNumber(fill.makerQuantity),
                    side: makerSide,
                    userId: fill.otherUserId,
                    status: this.getOrderStatus(fill.makerFilled, fill.makerQuantity),
                    timestamp: Date.now()
                }
            });
        });
    }

    createDbTrades(fills: Fill[], market: string, userId: string, side: "buy" | "sell") {
        const isBuyerMaker = side === "sell";
        fills.forEach(fill => {
            RedisManager.getInstance().pushMessage({
                type: TRADE_ADDED,
                data: {
                    market: market,
                    id: fill.tradeId.toString(),
                    isBuyerMaker,
                    price: fill.price,
                    quantity: fill.qty.toString(),
                    quoteQuantity: (fill.qty * Number(fill.price)).toString(),
                    timestamp: Date.now()
                }
            });
        });
    }

    publishWsTrades(fills: Fill[], userId: string, market: string, orderId: string, side: "buy" | "sell") {
        const makerSide = side === "buy" ? "sell" : "buy";
        fills.forEach(fill => {
            const isBuyerMaker = side === "sell";
            RedisManager.getInstance().publishMessage(`trade@${market}`, {
                stream: `trade@${market}`,
                data: {
                    e: "trade",
                    t: fill.tradeId,
                    m: isBuyerMaker,
                    p: fill.price,
                    q: fill.qty.toString(),
                    s: market,
                }
            });

            RedisManager.getInstance().publishMessage(`user@${userId}`, {
                stream: `user@${userId}`,
                data: {
                    e: "fill",
                    t: fill.tradeId,
                    s: market,
                    p: fill.price,
                    q: fill.qty.toString(),
                    side,
                    o: orderId,
                    m: false
                }
            });

            RedisManager.getInstance().publishMessage(`user@${fill.otherUserId}`, {
                stream: `user@${fill.otherUserId}`,
                data: {
                    e: "fill",
                    t: fill.tradeId,
                    s: market,
                    p: fill.price,
                    q: fill.qty.toString(),
                    side: makerSide,
                    o: fill.markerOrderId,
                    m: true
                }
            });
        });
    }

    sendUpdatedDepthAt(price: string, market: string) {
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        if (!orderbook) {
            return;
        }
        const depth = orderbook.getDepth();
        const updatedBids = depth?.bids.filter(x => x[0] === price);
        const updatedAsks = depth?.asks.filter(x => x[0] === price);
        
        RedisManager.getInstance().publishMessage(`depth@${market}`, {
            stream: `depth@${market}`,
            data: {
                a: updatedAsks.length ? updatedAsks : [[price, "0"]],
                b: updatedBids.length ? updatedBids : [[price, "0"]],
                e: "depth"
            }
        });
    }

    publisWsDepthUpdates(fills: Fill[], price: string, side: "buy" | "sell", market: string) {
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        if (!orderbook) {
            return;
        }
        const depth = orderbook.getDepth();
        if (side === "buy") {
            const updatedAsks = depth?.asks.filter(x => fills.map(f => f.price).includes(x[0].toString()));
            const updatedBid = depth?.bids.find(x => x[0] === price);
            console.log("publish ws depth updates")
            RedisManager.getInstance().publishMessage(`depth@${market}`, {
                stream: `depth@${market}`,
                data: {
                    a: updatedAsks,
                    b: updatedBid ? [updatedBid] : [],
                    e: "depth"
                }
            });
        }
        if (side === "sell") {
           const updatedBids = depth?.bids.filter(x => fills.map(f => f.price).includes(x[0].toString()));
           const updatedAsk = depth?.asks.find(x => x[0] === price);
           console.log("publish ws depth updates")
           RedisManager.getInstance().publishMessage(`depth@${market}`, {
               stream: `depth@${market}`,
               data: {
                   a: updatedAsk ? [updatedAsk] : [],
                   b: updatedBids,
                   e: "depth"
               }
           });
        }
    }

    updateBalance(userId: string, baseAsset: string, quoteAsset: string, side: "buy" | "sell", fills: Fill[], executedQty: number) {
        if (side === "buy") {
            fills.forEach(fill => {
                const quoteAmount = toUnits(fill.qty * Number(fill.price));
                const baseAmount = toUnits(fill.qty);

                //@ts-ignore
                this.balances.get(fill.otherUserId)[quoteAsset].available += quoteAmount;

                //@ts-ignore
                this.balances.get(userId)[quoteAsset].locked -= quoteAmount;

                //@ts-ignore
                this.balances.get(fill.otherUserId)[baseAsset].locked -= baseAmount;

                //@ts-ignore
                this.balances.get(userId)[baseAsset].available += baseAmount;
            });
        } else {
            fills.forEach(fill => {
                const quoteAmount = toUnits(fill.qty * Number(fill.price));
                const baseAmount = toUnits(fill.qty);

                //@ts-ignore
                this.balances.get(fill.otherUserId)[quoteAsset].locked -= quoteAmount;

                //@ts-ignore
                this.balances.get(userId)[quoteAsset].available += quoteAmount;

                //@ts-ignore
                this.balances.get(fill.otherUserId)[baseAsset].available += baseAmount;

                //@ts-ignore
                this.balances.get(userId)[baseAsset].locked -= baseAmount;
            });
        }
    }

    checkAndLockFunds(baseAsset: string, quoteAsset: string, side: "buy" | "sell", userId: string, asset: string, price: string, quantity: string) {
        if (side === "buy") {
            const quoteAmount = toUnits(Number(quantity) * Number(price));
            if ((this.balances.get(userId)?.[quoteAsset]?.available || 0) < quoteAmount) {
                throw new Error("Insufficient funds");
            }
            //@ts-ignore
            this.balances.get(userId)[quoteAsset].available -= quoteAmount;
            
            //@ts-ignore
            this.balances.get(userId)[quoteAsset].locked += quoteAmount;
        } else {
            const baseAmount = toUnits(Number(quantity));
            if ((this.balances.get(userId)?.[baseAsset]?.available || 0) < baseAmount) {
                throw new Error("Insufficient funds");
            }
            //@ts-ignore
            this.balances.get(userId)[baseAsset].available -= baseAmount;
            
            //@ts-ignore
            this.balances.get(userId)[baseAsset].locked += baseAmount;
        }
    }

    onRamp(userId: string, amount: number) {
        const amountUnits = toUnits(amount);
        const userBalance = this.balances.get(userId);
        if (!userBalance) {
            this.balances.set(userId, {
                [BASE_CURRENCY]: {
                    available: amountUnits,
                    locked: 0
                }
            });
        } else {
            userBalance[BASE_CURRENCY].available += amountUnits;
        }
    }

    setBaseBalances() {
        this.balances.set("1", {
            [BASE_CURRENCY]: {
                available: toUnits(10000000),
                locked: 0
            },
            "TATA": {
                available: toUnits(10000000),
                locked: 0
            }
        });

        this.balances.set("2", {
            [BASE_CURRENCY]: {
                available: toUnits(10000000),
                locked: 0
            },
            "TATA": {
                available: toUnits(10000000),
                locked: 0
            }
        });

        this.balances.set("5", {
            [BASE_CURRENCY]: {
                available: toUnits(10000000),
                locked: 0
            },
            "TATA": {
                available: toUnits(10000000),
                locked: 0
            }
        });
    }

}