const db = require('../../utils/db');

module.exports = async function handler(req, res) {
    try {
        // Delete today's generated digests so they don't clutter the feed
        await db.query(`DELETE FROM articles WHERE category = 'daily-digest' AND created_at >= CURRENT_DATE`);
        
        // Delete today's raw_content so the scraper doesn't deduplicate them and actually processes them with the new rules
        await db.query(`DELETE FROM raw_content WHERE scraped_at >= CURRENT_DATE`);

        res.status(200).json({ success: true, message: "Database reset for today! You can now run the cron jobs." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
