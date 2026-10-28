import { Client } from 'pg'; 

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://your_user:your_password@localhost:5432/my_database',
});
client.connect().catch((err) => {
    console.error("Failed to connect to Postgres", err);
});

async function refreshViews() {

    await client.query('REFRESH MATERIALIZED VIEW klines_1m');
    await client.query('REFRESH MATERIALIZED VIEW klines_1h');
    await client.query('REFRESH MATERIALIZED VIEW klines_1w');

    console.log("Materialized views refreshed successfully");
}

refreshViews().catch(console.error);

setInterval(() => {
    refreshViews()
}, 1000 * 10 );