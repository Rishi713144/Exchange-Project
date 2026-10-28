import { Client } from 'pg';
import { createClient } from 'redis';
import { DbMessage } from './types';

const pgClient = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://your_user:your_password@localhost:5432/my_database',
});

pgClient.on("error", (err) => {
    console.error("Postgres client error", err);
});

function formatNumeric(value: unknown): string {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toString() : "0";
}

async function ensureSchema() {
    await pgClient.query(`
        CREATE TABLE IF NOT EXISTS tata_prices(
            time            TIMESTAMP WITH TIME ZONE NOT NULL,
            price           DOUBLE PRECISION,
            volume          DOUBLE PRECISION,
            currency_code   VARCHAR (20)
        );

        CREATE TABLE IF NOT EXISTS orders(
            order_id            VARCHAR(64) PRIMARY KEY,
            user_id             VARCHAR(64) NOT NULL,
            market              VARCHAR(32) NOT NULL,
            side                VARCHAR(4) NOT NULL CHECK (side IN ('buy', 'sell')),
            price               NUMERIC(24, 8) NOT NULL,
            quantity            NUMERIC(24, 8) NOT NULL,
            executed_quantity   NUMERIC(24, 8) NOT NULL DEFAULT 0,
            status              VARCHAR(20) NOT NULL,
            created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);
        CREATE INDEX IF NOT EXISTS orders_market_status_idx ON orders (market, status);

        CREATE TABLE IF NOT EXISTS ticker(
            symbol          VARCHAR(32) PRIMARY KEY,
            first_price     NUMERIC(24, 8) NOT NULL,
            last_price      NUMERIC(24, 8) NOT NULL,
            high            NUMERIC(24, 8) NOT NULL,
            low             NUMERIC(24, 8) NOT NULL,
            volume          NUMERIC(30, 8) NOT NULL DEFAULT 0,
            quote_volume    NUMERIC(30, 8) NOT NULL DEFAULT 0,
            trades          BIGINT NOT NULL DEFAULT 0,
            updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS trades(
            trade_id        BIGINT NOT NULL,
            market          VARCHAR(32) NOT NULL,
            price           NUMERIC(24, 8) NOT NULL,
            quantity        NUMERIC(30, 8) NOT NULL,
            quote_quantity  NUMERIC(30, 8) NOT NULL,
            is_buyer_maker  BOOLEAN NOT NULL,
            created_at      TIMESTAMP WITH TIME ZONE NOT NULL,
            PRIMARY KEY (market, trade_id)
        );
    `);
}

async function trackTrade(data: Extract<DbMessage, { type: "TRADE_ADDED" }>["data"], redisClient: ReturnType<typeof createClient>) {
    const { market, price, quantity, quoteQuantity, timestamp, id, isBuyerMaker } = data;
    const tradeTime = new Date(timestamp);

    await pgClient.query("BEGIN");
    try {
        await pgClient.query(
            'INSERT INTO tata_prices (time, price, volume, currency_code) VALUES ($1, $2, $3, $4)',
            [tradeTime, price, quantity, market]
        );

        await pgClient.query(
            `INSERT INTO trades (trade_id, market, price, quantity, quote_quantity, is_buyer_maker, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (market, trade_id) DO NOTHING`,
            [id, market, price, quantity, quoteQuantity, isBuyerMaker, tradeTime]
        );

        const result = await pgClient.query(
            `INSERT INTO ticker (symbol, first_price, last_price, high, low, volume, quote_volume, trades, updated_at)
             VALUES ($1, $2, $2, $2, $2, $3, $4, 1, $5)
             ON CONFLICT (symbol) DO UPDATE SET
                first_price = CASE WHEN ticker.first_price = 0 THEN EXCLUDED.first_price ELSE ticker.first_price END,
                last_price = EXCLUDED.last_price,
                high = CASE WHEN ticker.trades = 0 THEN EXCLUDED.high ELSE GREATEST(ticker.high, EXCLUDED.high) END,
                low = CASE WHEN ticker.trades = 0 THEN EXCLUDED.low ELSE LEAST(ticker.low, EXCLUDED.low) END,
                volume = ticker.volume + EXCLUDED.volume,
                quote_volume = ticker.quote_volume + EXCLUDED.quote_volume,
                trades = ticker.trades + 1,
                updated_at = EXCLUDED.updated_at
             RETURNING symbol, first_price, last_price, high, low, volume, quote_volume, trades, updated_at`,
            [market, price, quantity, quoteQuantity, tradeTime]
        );

        await pgClient.query("COMMIT");

        const row = result.rows[0];
        const firstPrice = Number(row.first_price);
        const lastPrice = Number(row.last_price);
        const priceChange = lastPrice - firstPrice;
        const priceChangePercent = firstPrice === 0 ? 0 : (priceChange / firstPrice) * 100;

        const stream = `ticker@${market}`;
        try {
            await redisClient.publish(stream, JSON.stringify({
                stream,
                data: {
                    e: "ticker",
                    s: market,
                    c: formatNumeric(row.last_price),
                    h: formatNumeric(row.high),
                    l: formatNumeric(row.low),
                    v: formatNumeric(row.volume),
                    V: formatNumeric(row.quote_volume),
                    fp: formatNumeric(row.first_price),
                    pc: formatNumeric(priceChange),
                    pcp: priceChangePercent.toFixed(4),
                    n: Number(row.trades),
                    id: tradeTime.getTime()
                }
            }));
        } catch (err) {
            console.error("Failed to publish ticker update", err);
        }
    } catch (err) {
        await pgClient.query("ROLLBACK");
        throw err;
    }
}

async function trackOrder(data: Extract<DbMessage, { type: "ORDER_UPDATE" }>["data"]) {
    const updatedAt = new Date(data.timestamp || Date.now());

    await pgClient.query(
        `INSERT INTO orders (
            order_id, user_id, market, side, price, quantity, executed_quantity, status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (order_id) DO UPDATE SET
            executed_quantity = GREATEST(orders.executed_quantity, EXCLUDED.executed_quantity),
            status = CASE
                WHEN orders.status IN ('filled', 'cancelled', 'expired') THEN orders.status
                ELSE EXCLUDED.status
            END,
            updated_at = EXCLUDED.updated_at`,
        [
            data.orderId,
            data.userId,
            data.market,
            data.side,
            data.price,
            data.quantity,
            data.executedQty,
            data.status,
            updatedAt,
            updatedAt
        ]
    );
}

async function main() {
    await pgClient.connect();
    await ensureSchema();
    console.log("processor database schema ready");

    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (err) => {
        console.error("Redis client error", err);
    });
    await redisClient.connect();
    console.log("connected to redis");

    while (true) {
        const response = await redisClient.brPop("db_processor", 1);
        if (!response?.element) {
            continue;
        }

        let data: DbMessage;
        try {
            data = JSON.parse(response.element);
        } catch (err) {
            console.error("Invalid db_processor message", err);
            continue;
        }

        try {
            if (data.type === "TRADE_ADDED") {
                await trackTrade(data.data, redisClient);
            } else if (data.type === "ORDER_UPDATE") {
                await trackOrder(data.data);
            }
        } catch (err) {
            console.error(`Failed to process ${data.type}`, err);
        }
    }
}

main().catch((err) => {
    console.error("Processor failed to start", err);
    process.exit(1);
});
