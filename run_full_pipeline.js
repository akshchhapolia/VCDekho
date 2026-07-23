require('dotenv').config({ path: '.env.production' });
const db = require('./utils/db');
const scrape = require('./api/cron/scrape');
const aiProcess = require('./api/cron/ai-process');
const dailyDigest = require('./api/cron/daily-digest');

async function run() {
    try {
        console.log("Deleting today's old digest...");
        await db.query(`DELETE FROM articles WHERE category = 'daily-digest' AND created_at > CURRENT_DATE`);
        
        console.log("Clearing today's raw_content to force re-scrape with new ecosystem rules...");
        await db.query(`DELETE FROM raw_content WHERE scraped_at > CURRENT_DATE`);

        const mockReq = { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, query: {} };
        const mockRes = () => ({
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { console.log(data); return this; },
            end: function(msg) { console.log(msg); return this; }
        });

        console.log("Running Scrape...");
        await scrape(mockReq, mockRes());
        
        console.log("Running AI Process (this may take a minute due to multiple items)...");
        let processed = 1;
        while(processed > 0) {
            let count = 0;
            const res = {
                status: function(code) { return this; },
                json: function(data) { count = data.processedCount; console.log("AI Processed batch:", count, "Total queued remaining:", data.totalQueued); return this; }
            };
            await aiProcess(mockReq, res);
            processed = count;
        }
        
        console.log("Running Daily Digest generation...");
        await dailyDigest(mockReq, mockRes());

        console.log("Pipeline complete.");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit(0);
    }
}

run();
