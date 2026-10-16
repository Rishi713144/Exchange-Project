import "dotenv/config";
import { createClient } from "redis";
import { Engine } from "./trade/Engine";

async function main() {
    const engine = new Engine();
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
    console.log("matching engine connected to redis");

    while (true) {
        const response = await redisClient.rPop("messages" as string);
        if (!response) {
            await new Promise((resolve) => setTimeout(resolve, 20));
            continue;
        }
        engine.process(JSON.parse(response));
    }
}

main();
