import axios from "axios";
import type { Depth, KLine, Ticker, Trade } from "./types";

function getBaseUrl() {
    if (typeof window === "undefined") {
        return "http://localhost:3000/api/v1";
    }
    return `http://${window.location.hostname}:3000/api/v1`;
}

export async function getTicker(market: string): Promise<Ticker> {
    const tickers = await getTickers();
    const ticker = tickers.find(t => t.symbol === market);
    if (!ticker) {
        throw new Error(`No ticker found for ${market}`);
    }
    return ticker;
}

export async function getTickers(): Promise<Ticker[]> {
    const response = await axios.get(`${getBaseUrl()}/tickers`);
    return response.data;
}


export async function getDepth(market: string): Promise<Depth> {
    const response = await axios.get(`${getBaseUrl()}/depth?symbol=${market}`);
    return response.data;
}
export async function getTrades(market: string): Promise<Trade[]> {
    const response = await axios.get(`${getBaseUrl()}/trades?symbol=${market}`);
    return response.data;
}

export async function getKlines(market: string, interval: string, startTime: number, endTime: number): Promise<KLine[]> {
    const response = await axios.get(`${getBaseUrl()}/klines?symbol=${market}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`);
    const data: KLine[] = response.data;
    return data.sort((x, y) => new Date(x.end).getTime() - new Date(y.end).getTime());
}
