import cors from "cors";
import express from "express";
import { depthRouter } from "./routes/depth";
import { klineRouter } from "./routes/kline";
import { orderRouter } from "./routes/order";
import { tickersRouter } from "./routes/ticker";
import { tradesRouter } from "./routes/trades";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/v1/order", orderRouter);
app.use("/api/v1/depth", depthRouter);
app.use("/api/v1/trades", tradesRouter);
app.use("/api/v1/klines", klineRouter);
app.use("/api/v1/tickers", tickersRouter);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});