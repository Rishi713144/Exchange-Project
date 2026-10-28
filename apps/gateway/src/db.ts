import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || 'postgresql://your_user:your_password@localhost:5432/my_database';

export const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
    console.error("Postgres pool error", err);
});
