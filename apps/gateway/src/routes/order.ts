import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { RedisManager } from "../RedisManager";
import { CREATE_ORDER, CANCEL_ORDER, ON_RAMP, GET_OPEN_ORDERS } from "../types";

export const orderRouter: ExpressRouter = Router();

const createOrderSchema = z.object({
    market: z.string().min(1),
    price: z.string().min(1),
    quantity: z.string().min(1),
    side: z.enum(["buy", "sell"]),
    userId: z.string().min(1),
});

const cancelOrderSchema = z.object({
    orderId: z.string().min(1),
    market: z.string().min(1),
});

orderRouter.post("/", async (req, res) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    }

    const response = await RedisManager.getInstance().sendAndAwait({
        type: CREATE_ORDER,
        data: parsed.data,
    });
    res.json(response.payload);
});

orderRouter.delete("/", async (req, res) => {
    const parsed = cancelOrderSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    }

    const response = await RedisManager.getInstance().sendAndAwait({
        type: CANCEL_ORDER,
        data: parsed.data,
    });
    res.json(response.payload);
});

orderRouter.get("/open", async (req, res) => {
    const response = await RedisManager.getInstance().sendAndAwait({
        type: GET_OPEN_ORDERS,
        data: {
            userId: req.query.userId as string,
            market: req.query.market as string
        }
    });
    res.json(response.payload);
});
