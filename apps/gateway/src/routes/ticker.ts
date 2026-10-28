import { Router, type Router as ExpressRouter } from "express";
import { pool } from "../db";

export const tickersRouter: ExpressRouter = Router();

function normalize(value: unknown): string {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toString() : "0";
}

tickersRouter.get("/", async (_req, res) => {
    try {
        const result = await pool.query(`
            SELECT symbol, first_price, last_price, high, low, volume, quote_volume, trades, updated_at
            FROM ticker
            ORDER BY quote_volume DESC, symbol ASC
        `);

        res.json(result.rows.map((row) => {
            const firstPrice = Number(row.first_price);
            const lastPrice = Number(row.last_price);
            const priceChange = lastPrice - firstPrice;
            const priceChangePercent = firstPrice === 0 ? 0 : (priceChange / firstPrice) * 100;

            return {
                firstPrice: normalize(row.first_price),
                high: normalize(row.high),
                lastPrice: normalize(row.last_price),
                low: normalize(row.low),
                priceChange: normalize(priceChange),
                priceChangePercent: priceChangePercent.toFixed(4),
                quoteVolume: normalize(row.quote_volume),
                symbol: row.symbol,
                trades: String(row.trades),
                volume: normalize(row.volume),
            };
        }));
    } catch (err) {
        console.error("Failed to fetch tickers", err);
        res.status(500).json({ error: "Failed to fetch tickers" });
    }
});
