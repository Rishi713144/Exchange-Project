import axios from "axios";

const BASE_URL = process.env.API_URL || "http://localhost:3000";
const MARKET = process.env.LIQUIDITY_MARKET || "TATA_INR";
const USER_ID = process.env.LIQUIDITY_USER_ID || "5";
const LEVELS = 19;
const CENTER_PRICE = Number(process.env.LIQUIDITY_CENTER_PRICE || 1005);
const LEVEL_STEP = 0.2;
const LOOP_DELAY_MS = 1000;

type OpenOrder = {
    orderId: string;
    price: number | string;
    quantity: number | string;
    side: "buy" | "sell";
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getOpenOrders(): Promise<OpenOrder[]> {
    const response = await axios.get(`${BASE_URL}/api/v1/order/open`, {
        params: { userId: USER_ID, market: MARKET }
    });
    return response.data;
}

async function cancelOrder(orderId: string) {
    await axios.delete(`${BASE_URL}/api/v1/order`, {
        data: { orderId, market: MARKET }
    });
}

async function placeOrder(side: "buy" | "sell", price: string, quantity: string) {
    await axios.post(`${BASE_URL}/api/v1/order`, {
        market: MARKET,
        price,
        quantity,
        side,
        userId: USER_ID
    });
}

function targetPrice(side: "buy" | "sell", index: number) {
    const distance = 0.1 + index * LEVEL_STEP;
    const price = side === "buy" ? CENTER_PRICE - distance : CENTER_PRICE + distance;
    return price.toFixed(2);
}

async function resetLiquidity() {
    const openOrders = await getOpenOrders();
    await Promise.all(openOrders.map(order => cancelOrder(order.orderId).catch(() => undefined)));
}

async function refreshLiquidity() {
    const openOrders = await getOpenOrders();
    const bids = openOrders.filter(order => order.side === "buy");
    const asks = openOrders.filter(order => order.side === "sell");
    const bidPrices = new Set(bids.map(order => Number(order.price).toFixed(2)));
    const askPrices = new Set(asks.map(order => Number(order.price).toFixed(2)));

    const staleBids = bids.filter(order => !Array.from({ length: LEVELS }, (_, index) => targetPrice("buy", index)).includes(Number(order.price).toFixed(2)));
    const staleAsks = asks.filter(order => !Array.from({ length: LEVELS }, (_, index) => targetPrice("sell", index)).includes(Number(order.price).toFixed(2)));

    const orderToRefresh = [
        staleBids[0],
        staleAsks[0],
        bids[Math.floor(Math.random() * bids.length)],
        asks[Math.floor(Math.random() * asks.length)]
    ].filter((order): order is OpenOrder => Boolean(order));

    const seen = new Set<string>();
    for (const order of orderToRefresh) {
        if (seen.has(order.orderId)) continue;
        seen.add(order.orderId);
        await cancelOrder(order.orderId).catch(() => undefined);
        if (order.side === "buy") bidPrices.delete(Number(order.price).toFixed(2));
        else askPrices.delete(Number(order.price).toFixed(2));
    }

    for (let index = 0; index < LEVELS; index++) {
        const price = targetPrice("buy", index);
        if (!bidPrices.has(price)) {
            const quantity = (0.5 + Math.random() * 4.5).toFixed(2);
            await placeOrder("buy", price, quantity).catch(() => undefined);
        }
    }

    for (let index = 0; index < LEVELS; index++) {
        const price = targetPrice("sell", index);
        if (!askPrices.has(price)) {
            const quantity = (0.5 + Math.random() * 4.5).toFixed(2);
            await placeOrder("sell", price, quantity).catch(() => undefined);
        }
    }
}

async function main() {
    while (true) {
        try {
            await refreshLiquidity();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Liquidity refresh failed:", message);
            await sleep(2000);
        }
        await sleep(LOOP_DELAY_MS);
    }
}

async function start() {
    await sleep(2000);
    await resetLiquidity().catch(error => {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Liquidity reset failed:", message);
    });
    await main();
}

start();
