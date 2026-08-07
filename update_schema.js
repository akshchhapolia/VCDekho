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

        console.log("Creating investor_buzz table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS investor_buzz (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                source TEXT NOT NULL DEFAULT 'reddit',
                source_url TEXT UNIQUE NOT NULL,
                source_id TEXT,
                subreddit TEXT,
                title TEXT NOT NULL,
                body_excerpt TEXT,
                comment_count INTEGER DEFAULT 0,
                upvote_score INTEGER DEFAULT 0,
                published_at_source TIMESTAMPTZ,
                scraped_at TIMESTAMPTZ DEFAULT NOW(),
                slug TEXT UNIQUE,
                ai_summary TEXT,
                topics TEXT[],
                sentiment TEXT,
                founder_quotes JSONB DEFAULT '[]'::jsonb,
                investor_slugs TEXT[],
                investor_names TEXT[],
                relevance_score INTEGER DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'queued',
                error_log TEXT,
                published_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_investor_buzz_status ON investor_buzz (status);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_investor_buzz_published ON investor_buzz (published_at DESC NULLS LAST);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_investor_buzz_investor_slugs ON investor_buzz USING GIN (investor_slugs);`);

        await pool.query(`ALTER TABLE investor_buzz ADD COLUMN IF NOT EXISTS interest_up INTEGER DEFAULT 0;`);
        await pool.query(`ALTER TABLE investor_buzz ADD COLUMN IF NOT EXISTS interest_down INTEGER DEFAULT 0;`);

        console.log("Creating investor_buzz_votes table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS investor_buzz_votes (
                buzz_id UUID NOT NULL REFERENCES investor_buzz(id) ON DELETE CASCADE,
                voter_key TEXT NOT NULL,
                vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (buzz_id, voter_key)
            );
        `);

        console.log("Migration successful.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await pool.end();
    }
}

migrate();
