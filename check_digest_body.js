const db = require('./utils/db');

async function run() {
    try {
        const res = await db.query(
            "SELECT body FROM articles WHERE category = 'daily-digest' ORDER BY published_at DESC LIMIT 1"
        );
        if (res.rows.length > 0) {
            console.log("BODY IN DATABASE:\n");
            console.log(res.rows[0].body);
        } else {
            console.log("No daily-digest article found.");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
