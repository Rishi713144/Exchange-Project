import { Client } from 'pg';
import { Router, type Router as ExpressRouter } from "express";

const pgClient = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://exchange_user:exchange_secret@localhost:5432/exchange_db',
});
pgClient.connect();

export const tradesRouter: ExpressRouter = Router();

tradesRouter.get("/", async (req, res) => {
    const { symbol } = req.query;
    if (!symbol) {
        return res.status(400).send('symbol is required');
    }

    try {
        const result = await pgClient.query(
            `SELECT id, price, quantity, quote_quantity, is_buyer_maker, time
             FROM trades WHERE currency_code = $1 ORDER BY time DESC LIMIT 50`,
            [symbol]
        );
        res.json(result.rows.map((x) => ({
            id: Number(x.id),
            isBuyerMaker: x.is_buyer_maker,
            price: x.price,
            quantity: x.quantity,
            quoteQuantity: x.quote_quantity,
            timestamp: new Date(x.time).getTime(),
        })));
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});
