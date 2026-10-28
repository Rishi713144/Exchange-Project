import { Router, type Router as ExpressRouter } from "express";
import { pool } from "../db";

export const tradesRouter: ExpressRouter = Router();

tradesRouter.get("/", async (req, res) => {
    const market = (req.query.market || req.query.symbol) as string | undefined;
    if (!market) {
        return res.status(400).json({ error: "market is required" });
    }

    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 100;

    try {
        const result = await pool.query(
            `SELECT trade_id, is_buyer_maker, price, quantity, quote_quantity, created_at
             FROM trades
             WHERE market = $1
             ORDER BY created_at DESC, trade_id DESC
             LIMIT $2`,
            [market, limit]
        );

        res.json(result.rows.map((row) => ({
            id: Number(row.trade_id),
            isBuyerMaker: row.is_buyer_maker,
            price: row.price,
            quantity: row.quantity,
            quoteQuantity: row.quote_quantity,
            timestamp: new Date(row.created_at).getTime(),
        })));
    } catch (err) {
        console.error("Failed to fetch trades", err);
        res.status(500).json({ error: "Failed to fetch trades" });
    }
});
