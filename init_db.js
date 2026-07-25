require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

async function init() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set. Add it to .env before running init_db.js');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to database...');
        const schema = fs.readFileSync('./schema.sql', 'utf8');
        console.log('Applying schema...');
        await pool.query(schema);
        console.log('Schema applied successfully! Tables created.');
    } catch (e) {
        console.error('Error setting up DB:', e);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

init();
