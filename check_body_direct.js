require('dotenv').config();
const { Client } = require('pg');

async function run() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set. Add it to .env before running this script.');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(
            "SELECT body FROM articles WHERE category = 'daily-digest' ORDER BY published_at DESC LIMIT 1"
        );
        if (res.rows.length > 0) {
            console.log('HTML_BODY_START');
            console.log(res.rows[0].body);
            console.log('HTML_BODY_END');
        } else {
            console.log('No articles found.');
        }
    } catch (err) {
        console.error(err.message);
    } finally {
        await client.end();
    }
}

run();
