const db = require('./utils/db');
require('dotenv').config({ path: '.env.production.local' });

async function publishDrafts() {
    try {
        console.log("Connecting to database to publish drafts...");
        const result = await db.query(`UPDATE articles SET status = 'published' WHERE status = 'draft'`);
        console.log(`Successfully updated ${result.rowCount} articles from 'draft' to 'published'.`);
    } catch (error) {
        console.error("Error updating articles:", error);
    } finally {
        // Close the pool so the script exits
        if (db.pool) {
            await db.pool.end();
        }
    }
}

publishDrafts();
