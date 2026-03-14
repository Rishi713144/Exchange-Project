import { Router, type Router as ExpressRouter } from "express";

export const tradesRouter: ExpressRouter = Router();

tradesRouter.get("/", async (req, res) => {
    const { market } = req.query;
    // get from DB
    res.json({});
})
