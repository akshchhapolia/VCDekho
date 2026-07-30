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

        console.log("Adding image_url column to articles...");
        await pool.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_url TEXT;`);

        console.log("Creating investor_activity table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS investor_activity (
                slug TEXT PRIMARY KEY,
                last_check_date TIMESTAMPTZ,
                last_check_sector TEXT,
                last_check_highlight TEXT,
                last_check_source TEXT,
                last_check_source_title TEXT,
                recent_check_count INTEGER DEFAULT 0,
                total_mentions INTEGER DEFAULT 0,
                recent_checks JSONB DEFAULT '[]'::jsonb,
                source_method TEXT,
                checked_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_investor_activity_checked_at ON investor_activity (checked_at);`);

        console.log("Creating investor_portfolio table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS investor_portfolio (
                slug TEXT PRIMARY KEY,
                companies JSONB DEFAULT '[]'::jsonb,
                company_count INTEGER DEFAULT 0,
                source_method TEXT,
                checked_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_investor_portfolio_checked_at ON investor_portfolio (checked_at);`);

        console.log("Migration successful.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await pool.end();
    }
}

migrate();
