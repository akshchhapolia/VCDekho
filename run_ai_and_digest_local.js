require('dotenv').config();

const db = require('./utils/db');
const aiProcess = require('./api/cron/ai-process');
const dailyDigest = require('./api/cron/daily-digest');

async function run() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set. Add it to .env before running this script.');
        process.exit(1);
    }

    try {
        const mockReq = { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, query: {} };

        console.log('Running AI Process for queued items...');
        let processed = 1;
        while (processed > 0) {
            let count = 0;
            const res = {
                status: function () { return this; },
                json: function (data) {
                    count = data.processedCount;
                    console.log('AI Processed batch:', count, 'Total queued remaining:', data.totalQueued, 'Errors:', data.errors);
                    return this;
                }
            };
            await aiProcess(mockReq, res);
            processed = count;
        }

        console.log('Running Daily Digest generation...');
        const mockRes = () => ({
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { console.log('Digest response:', data); return this; },
            end: function (msg) { console.log('Digest end:', msg); return this; }
        });
        await dailyDigest(mockReq, mockRes());

        console.log('Done.');
    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        if (db.pool) {
            await db.pool.end();
        }
        process.exit(0);
    }
}

run();
