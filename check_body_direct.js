const { Client } = require('pg');

const connStr = "postgresql://postgres.qviyhvnubhduyhgwzuzc:Aksh%40t99chhapolia@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres";

async function run() {
    const client = new Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query("SELECT body FROM articles WHERE category = 'daily-digest' ORDER BY published_at DESC LIMIT 1");
        if (res.rows.length > 0) {
            console.log("HTML_BODY_START");
            console.log(res.rows[0].body);
            console.log("HTML_BODY_END");
        } else {
            console.log("No articles found.");
        }
    } catch (err) {
        console.error(err.message);
    } finally {
        await client.end();
    }
}
run();
