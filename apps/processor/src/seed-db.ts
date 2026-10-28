import { Client } from 'pg';

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://your_user:your_password@localhost:5432/my_database',
});

async function initializeDB() {
    await client.connect();

    await client.query(`
        DROP MATERIALIZED VIEW IF EXISTS klines_1m CASCADE;
        DROP MATERIALIZED VIEW IF EXISTS klines_1h CASCADE;
        DROP MATERIALIZED VIEW IF EXISTS klines_1w CASCADE;
        DROP TABLE IF EXISTS "tata_prices" CASCADE;

        CREATE TABLE "tata_prices"(
            time            TIMESTAMP WITH TIME ZONE NOT NULL,
            price           DOUBLE PRECISION,
            volume          DOUBLE PRECISION,
            currency_code   VARCHAR (20)
        );
        
        SELECT create_hypertable('tata_prices', 'time', 'price', 2);

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

        INSERT INTO ticker (symbol, first_price, last_price, high, low, volume, quote_volume, trades)
        VALUES ('TATA_INR', 0, 0, 0, 0, 0, 0, 0)
        ON CONFLICT (symbol) DO NOTHING;
    `);

    await client.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1m AS
        SELECT
            time_bucket('1 minute', time) AS bucket,
            first(price, time) AS open,
            max(price) AS high,
            min(price) AS low,
            last(price, time) AS close,
            sum(volume) AS volume,
            currency_code
        FROM tata_prices
        GROUP BY bucket, currency_code;
    `);

    await client.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1h AS
        SELECT
            time_bucket('1 hour', time) AS bucket,
            first(price, time) AS open,
            max(price) AS high,
            min(price) AS low,
            last(price, time) AS close,
            sum(volume) AS volume,
            currency_code
        FROM tata_prices
        GROUP BY bucket, currency_code;
    `);

    await client.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS klines_1w AS
        SELECT
            time_bucket('1 week', time) AS bucket,
            first(price, time) AS open,
            max(price) AS high,
            min(price) AS low,
            last(price, time) AS close,
            sum(volume) AS volume,
            currency_code
        FROM tata_prices
        GROUP BY bucket, currency_code;
    `);

    await client.end();
    console.log("Database initialized successfully");
}

initializeDB().catch((err) => {
    console.error(err);
    process.exit(1);
});
