process.env.DATABASE_URL = 'postgresql://postgres.qviyhvnubhduyhgwzuzc:Aksh%40t99chhapolia@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres';
const db = require('./utils/db');

async function run() {
    try {
        console.log("Querying raw_content...");
        const res = await db.query(
            `SELECT id, title, status, scraped_at, published_at_source FROM raw_content 
             ORDER BY scraped_at DESC LIMIT 20`
        );
        console.log(`Total raw items: ${res.rows.length}`);
        res.rows.forEach(row => {
            console.log(`- ${row.title}`);
            console.log(`  Status: ${row.status}`);
            console.log(`  Scraped At (IST): ${new Date(row.scraped_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
            console.log(`  Published At Source: ${row.published_at_source}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        if (db.pool) {
            await db.pool.end();
        }
    }
}

run();
