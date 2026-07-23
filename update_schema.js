require('dotenv').config();
const { Pool } = require('pg');

async function migrate() {
    if (!process.env.DATABASE_URL) {
        console.error("No DATABASE_URL set. Cannot run migration.");
        return;
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("Adding extracted_facts column to raw_content...");
        await pool.query(`ALTER TABLE raw_content ADD COLUMN IF NOT EXISTS extracted_facts JSONB;`);
        console.log("Migration successful.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await pool.end();
    }
}

migrate();
