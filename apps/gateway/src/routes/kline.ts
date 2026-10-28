import { Router, type Router as ExpressRouter } from "express";
import { pool } from "../db";

export const klineRouter: ExpressRouter = Router();

klineRouter.get("/", async (req, res) => {
    const market = (req.query.market || req.query.symbol) as string | undefined;
    const { interval, startTime, endTime } = req.query;

    if (!market) {
        return res.status(400).json({ error: "market is required" });
    }

    let bucket;
    switch (interval) {
        case '1m':
            bucket = '1 minute';
            break;
        case '1h':
            bucket = '1 hour';
            break;
        case '1w':
            bucket = '1 week';
            break;
        default:
            return res.status(400).json({ error: "Invalid interval" });
    }

    try {
        const result = await pool.query(
            `SELECT
                time_bucket($1::interval, time) AS bucket,
                first(price, time) AS open,
                max(price) AS high,
                min(price) AS low,
                last(price, time) AS close,
                sum(volume) AS volume,
                sum(price * COALESCE(volume, 0)) AS quote_volume,
                count(*) AS trades,
                currency_code
            FROM tata_prices
            WHERE currency_code = $2 AND time >= $3 AND time <= $4
            GROUP BY bucket, currency_code
            ORDER BY bucket`,
            [
                bucket,
                market,
                new Date(Number(startTime) * 1000),
                new Date(Number(endTime) * 1000),
            ]
        );

        res.json(result.rows.map(x => ({
            close: x.close,
            end: x.bucket,
            high: x.high,
            low: x.low,
            open: x.open,
            quoteVolume: x.quote_volume,
            start: x.bucket,
            trades: x.trades,
            volume: x.volume,
        })));
    } catch (err) {
        console.error("Failed to fetch klines", err);
        res.status(500).json({ error: "Failed to fetch klines" });
    }
});
