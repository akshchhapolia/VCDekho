require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

// We must use the percent-encoded password %40 instead of @
const dbUrl = "postgresql://postgres:Aksh%40t99chhapolia@db.qviyhvnubhduyhgwzuzc.supabase.co:5432/postgres";

process.env.DATABASE_URL = dbUrl;

async function init() {
    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("Connecting to Supabase...");
        
        // 1. Run Schema
        const schema = fs.readFileSync('./schema.sql', 'utf8');
        console.log("Applying schema...");
        await pool.query(schema);
        console.log("Schema applied successfully! Tables created.");
        
    } catch (e) {
        console.error("Error setting up DB:", e);
    } finally {
        await pool.end();
    }
}

init();
