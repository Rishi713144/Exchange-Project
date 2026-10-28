import { BASE_CURRENCY } from "./Engine";

export interface Order {
    price: number;
    quantity: number;
    orderId: string;
    filled: number;
    side: "buy" | "sell";
    userId: string;
}

export interface Fill {
    price: string;
    qty: number;
    tradeId: number;
    otherUserId: string;
    markerOrderId: string;
    makerFilled: number;
    makerQuantity: number;
}

const PRECISION = 8;
const SCALE = 10 ** PRECISION;

export function toUnits(value: number): number {
    return Math.round(value * SCALE);
}

export function fromUnits(units: number): number {
    return units / SCALE;
}

export function formatUnits(units: number): string {
    const sign = units < 0 ? "-" : "";
    const absolute = Math.abs(units);
    const whole = Math.floor(absolute / SCALE);
    const fraction = (absolute % SCALE).toString().padStart(PRECISION, "0").replace(/0+$/, "");
    return fraction.length > 0 ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
}

export function formatNumber(value: number): string {
    return formatUnits(toUnits(value));
}

export class Orderbook {
    bids: Order[];
    asks: Order[];
    baseAsset: string;
    quoteAsset: string = BASE_CURRENCY;
    lastTradeId: number;
    currentPrice: number;

    constructor(baseAsset: string, bids: Order[], asks: Order[], lastTradeId: number, currentPrice: number) {
        this.bids = bids;
        this.asks = asks;
        this.baseAsset = baseAsset;
        this.lastTradeId = lastTradeId || 0;
        this.currentPrice = currentPrice || 0;
        this.sortBook();
    }

    ticker() {
        return `${this.baseAsset}_${this.quoteAsset}`;
    }

    getSnapshot() {
        return {
            baseAsset: this.baseAsset,
            bids: this.bids,
            asks: this.asks,
            lastTradeId: this.lastTradeId,
            currentPrice: this.currentPrice
        }
    }

    private sortBook() {
        this.bids.sort((a, b) => toUnits(b.price) - toUnits(a.price) || a.orderId.localeCompare(b.orderId));
        this.asks.sort((a, b) => toUnits(a.price) - toUnits(b.price) || a.orderId.localeCompare(b.orderId));
    }

    addOrder(order: Order): {
        executedQty: number,
        fills: Fill[]
    } {
        const match = order.side === "buy" ? this.matchBid(order) : this.matchAsk(order);
        const { executedQty, fills } = match;

        order.filled = executedQty;
        if (toUnits(executedQty) < toUnits(order.quantity)) {
            if (order.side === "buy") {
                this.bids.push(order);
            } else {
                this.asks.push(order);
            }
            this.sortBook();
        }

        return {
            executedQty,
            fills
        }
    }

    matchBid(order: Order): { fills: Fill[], executedQty: number } {
        const fills: Fill[] = [];
        let executedUnits = 0;
        const orderPriceUnits = toUnits(order.price);
        const orderQtyUnits = toUnits(order.quantity);

        for (let i = 0; i < this.asks.length && executedUnits < orderQtyUnits; i++) {
            const ask = this.asks[i];
            const askPriceUnits = toUnits(ask.price);
            if (askPriceUnits > orderPriceUnits) {
                break;
            }
            if (ask.userId === order.userId) {
                continue;
            }

            const askQtyUnits = toUnits(ask.quantity);
            const askFilledUnits = toUnits(ask.filled);
            const availableUnits = askQtyUnits - askFilledUnits;
            if (availableUnits <= 0) {
                continue;
            }

            const filledUnits = Math.min(orderQtyUnits - executedUnits, availableUnits);
            executedUnits += filledUnits;

            const cumulativeFilledUnits = askFilledUnits + filledUnits;
            ask.filled = fromUnits(cumulativeFilledUnits);

            fills.push({
                price: formatUnits(askPriceUnits),
                qty: fromUnits(filledUnits),
                tradeId: this.lastTradeId++,
                otherUserId: ask.userId,
                markerOrderId: ask.orderId,
                makerFilled: ask.filled,
                makerQuantity: ask.quantity
            });
        }

        this.removeFilled(this.asks);

        return {
            fills,
            executedQty: fromUnits(executedUnits)
        };
    }

    matchAsk(order: Order): { fills: Fill[], executedQty: number } {
        const fills: Fill[] = [];
        let executedUnits = 0;
        const orderPriceUnits = toUnits(order.price);
        const orderQtyUnits = toUnits(order.quantity);

        for (let i = 0; i < this.bids.length && executedUnits < orderQtyUnits; i++) {
            const bid = this.bids[i];
            const bidPriceUnits = toUnits(bid.price);
            if (bidPriceUnits < orderPriceUnits) {
                break;
            }
            if (bid.userId === order.userId) {
                continue;
            }

            const bidQtyUnits = toUnits(bid.quantity);
            const bidFilledUnits = toUnits(bid.filled);
            const availableUnits = bidQtyUnits - bidFilledUnits;
            if (availableUnits <= 0) {
                continue;
            }

            const filledUnits = Math.min(orderQtyUnits - executedUnits, availableUnits);
            executedUnits += filledUnits;

            const cumulativeFilledUnits = bidFilledUnits + filledUnits;
            bid.filled = fromUnits(cumulativeFilledUnits);

            fills.push({
                price: formatUnits(bidPriceUnits),
                qty: fromUnits(filledUnits),
                tradeId: this.lastTradeId++,
                otherUserId: bid.userId,
                markerOrderId: bid.orderId,
                makerFilled: bid.filled,
                makerQuantity: bid.quantity
            });
        }

        this.removeFilled(this.bids);

        return {
            fills,
            executedQty: fromUnits(executedUnits)
        };
    }

    private removeFilled(orders: Order[]) {
        for (let i = orders.length - 1; i >= 0; i--) {
            if (toUnits(orders[i].filled) >= toUnits(orders[i].quantity)) {
                orders.splice(i, 1);
            }
        }
    }

    getDepth() {
        const bids = this.aggregateDepth(this.bids, true);
        const asks = this.aggregateDepth(this.asks, false);
        return { bids, asks };
    }

    private aggregateDepth(orders: Order[], descending: boolean): [string, string][] {
        const levels: Map<number, number> = new Map();

        for (const order of orders) {
            const priceUnits = toUnits(order.price);
            const remainingUnits = toUnits(order.quantity) - toUnits(order.filled);
            if (remainingUnits <= 0) {
                continue;
            }
            levels.set(priceUnits, (levels.get(priceUnits) || 0) + remainingUnits);
        }

        return Array.from(levels.entries())
            .sort(([a], [b]) => descending ? b - a : a - b)
            .map(([priceUnits, quantityUnits]) => [formatUnits(priceUnits), formatUnits(quantityUnits)]);
    }

    getOpenOrders(userId: string): Order[] {
        const asks = this.asks.filter(x => x.userId === userId);
        const bids = this.bids.filter(x => x.userId === userId);
        return [...asks, ...bids];
    }

    cancelBid(order: Order) {
        const index = this.bids.findIndex(x => x.orderId === order.orderId);
        if (index !== -1) {
            const price = this.bids[index].price;
            this.bids.splice(index, 1);
            return price
        }
    }

    cancelAsk(order: Order) {
        const index = this.asks.findIndex(x => x.orderId === order.orderId);
        if (index !== -1) {
            const price = this.asks[index].price;
            this.asks.splice(index, 1);
            return price
        }
    }

}
