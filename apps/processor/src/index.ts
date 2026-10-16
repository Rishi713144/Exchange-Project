import "dotenv/config";
import { Client } from 'pg';
import { createClient } from 'redis';
import { DbMessage } from './types';

const pgClient = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://exchange_user:exchange_secret@localhost:5432/exchange_db',
});
pgClient.connect();

async function main() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
    console.log("connected to redis");

    while (true) {
        const response = await redisClient.rPop("db_processor" as string);
        if (!response) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            continue;
        }

        const data: DbMessage = JSON.parse(response);
        if (data.type === "TRADE_ADDED") {
            const price = data.data.price;
            const volume = data.data.quantity;
            const currencyCode = data.data.market;
            const timestamp = new Date(data.data.timestamp);

            await pgClient.query(
                'INSERT INTO tata_prices (time, price, volume, currency_code) VALUES ($1, $2, $3, $4)',
                [timestamp, price, volume, currencyCode]
            );

            await pgClient.query(
                `INSERT INTO trades (id, time, price, quantity, quote_quantity, is_buyer_maker, currency_code)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (currency_code, id) DO NOTHING`,
                [data.data.id, timestamp, price, volume, data.data.quoteQuantity, data.data.isBuyerMaker, currencyCode]
            );
        }
    }
}

main();
