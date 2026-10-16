import { Client } from 'pg';
import { Router, type Router as ExpressRouter } from "express";

const pgClient = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://exchange_user:exchange_secret@localhost:5432/exchange_db',
});
pgClient.connect();

export const klineRouter: ExpressRouter = Router();

klineRouter.get("/", async (req, res) => {
    const { interval, startTime, endTime } = req.query;
    const market = (req.query.market || req.query.symbol) as string;

    let table: string;
    switch (interval) {
        case '1m':
            table = 'klines_1m';
            break;
        case '1h':
            table = 'klines_1h';
            break;
        case '1w':
            table = 'klines_1w';
            break;
        default:
            return res.status(400).send('Invalid interval');
    }

    try {
        const result = await pgClient.query(
            `SELECT * FROM ${table} WHERE bucket >= $1 AND bucket <= $2 AND currency_code = $3 ORDER BY bucket ASC`,
            [new Date(Number(startTime) * 1000), new Date(Number(endTime) * 1000), market]
        );
        res.json(result.rows.map(x => ({
            close: x.close,
            end: x.bucket,
            high: x.high,
            low: x.low,
            open: x.open,
            quoteVolume: x.volume,
            start: x.bucket,
            trades: 0,
            volume: x.volume,
        })));
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});
