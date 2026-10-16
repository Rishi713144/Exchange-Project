import { Client } from 'pg';
import { Router, type Router as ExpressRouter } from "express";

const pgClient = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://exchange_user:exchange_secret@localhost:5432/exchange_db',
});
pgClient.connect();

export const tickersRouter: ExpressRouter = Router();

tickersRouter.get("/", async (req, res) => {
    const { symbol } = req.query;
    const params: string[] = [];
    let where = `WHERE time > now() - interval '24 hours'`;
    if (symbol) {
        where += ` AND currency_code = $1`;
        params.push(symbol as string);
    }

    try {
        const result = await pgClient.query(
            `SELECT
                currency_code AS symbol,
                last(price, time) AS last_price,
                first(price, time) AS first_price,
                max(price) AS high,
                min(price) AS low,
                sum(volume) AS volume,
                sum(price * volume) AS quote_volume,
                count(*) AS trades
             FROM tata_prices
             ${where}
             GROUP BY currency_code
             ORDER BY symbol ASC`,
            params
        );

        const tickers = result.rows.map((x) => {
            const last = Number(x.last_price) || 0;
            const first = Number(x.first_price) || 0;
            const change = last - first;
            const changePercent = first ? (change / first) * 100 : 0;
            return {
                symbol: x.symbol,
                lastPrice: last.toString(),
                firstPrice: first.toString(),
                high: (Number(x.high) || 0).toString(),
                low: (Number(x.low) || 0).toString(),
                volume: (Number(x.volume) || 0).toString(),
                quoteVolume: (Number(x.quote_volume) || 0).toString(),
                priceChange: change.toString(),
                priceChangePercent: changePercent.toString(),
                trades: String(x.trades),
            };
        });

        res.json(tickers);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});
