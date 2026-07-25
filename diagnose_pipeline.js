require('dotenv').config();

console.log('1. Starting script...');
console.log('   DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('   CRON_SECRET exists:', !!process.env.CRON_SECRET);
console.log('   ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Add it to .env before running this script.');
    process.exit(1);
}

const db = require('./utils/db');
console.log('2. Loaded utils/db.');

const { Anthropic } = require('@anthropic-ai/sdk');
console.log('3. Loaded @anthropic-ai/sdk.');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || ''
});
console.log('4. Initialized Anthropic client.');

async function run() {
    try {
        console.log('5. Querying DB for queued items...');
        const queueResult = await db.query(
            `SELECT id, title, status FROM raw_content WHERE status = 'queued' ORDER BY relevance_score DESC, scraped_at ASC LIMIT 1`
        );
        console.log('6. DB Query returned. Total items:', queueResult.rows.length);
        if (queueResult.rows.length === 0) {
            console.log('No queued items found.');
            return;
        }

        const item = queueResult.rows[0];
        console.log('Selected item ID:', item.id, 'Title:', item.title);

        console.log("7. Testing Anthropic API call with 'claude-sonnet-4-6'...");
        try {
            const msg = await anthropic.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Hi' }]
            });
            console.log('--> SUCCESS! Response:', msg.content[0].text.trim());
        } catch (err) {
            console.log('--> FAILED:', err.message);
        }
    } catch (e) {
        console.error('Error during run:', e);
    } finally {
        if (db.pool) {
            await db.pool.end();
            console.log('8. Closed DB pool.');
        }
        console.log('9. Exiting.');
    }
}

run();
