
import { Router, type Router as ExpressRouter } from "express";

export const tickersRouter: ExpressRouter = Router();

tickersRouter.get("/", async (req, res) => {    
    res.json({});
});