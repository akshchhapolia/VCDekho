require("dotenv").config({ path: ".env" });
const db = require("../utils/db");
const { processItem } = require("../utils/news-ai-process");
const { runDailyDigest } = require("../utils/run-daily-digest");
const { runAiBlog } = require("../utils/run-ai-blog");

const BATCH = Number(process.env.RECOVER_BATCH || 6);
const MAX_BATCHES = Number(process.env.RECOVER_MAX_BATCHES || 25);

async function requeue() {
  const stuck = await db.query(
    `UPDATE raw_content
     SET status = 'queued', error_log = NULL
     WHERE status = 'processing'
     RETURNING id`,
  );
  const billed = await db.query(
    `UPDATE raw_content
     SET status = 'queued', error_log = NULL
     WHERE status = 'error'
       AND error_log ILIKE '%credits are depleted%'
       AND scraped_at > NOW() - INTERVAL '12 days'
     RETURNING id`,
  );
  console.log(`requeued billing=${billed.rowCount} unstuck=${stuck.rowCount}`);
}

async function processNewest(limit) {
  const { rows } = await db.query(
    `SELECT * FROM raw_content
     WHERE status = 'queued'
     ORDER BY scraped_at DESC, relevance_score DESC
     LIMIT $1`,
    [limit],
  );
  let ok = 0;
  let fail = 0;
  for (const item of rows) {
    await db.query(`UPDATE raw_content SET status = 'processing' WHERE id = $1`, [item.id]);
    const result = await processItem(item);
    const title = String(item.title || "").slice(0, 90);
    if (result.success) {
      ok += 1;
      console.log(`ok ${result.finalStatus} ${title}`);
    } else {
      fail += 1;
      console.log(`fail ${String(result.error || "").slice(0, 160)} :: ${title}`);
    }
  }
  return { n: rows.length, ok, fail };
}

async function main() {
  await requeue();
  for (let i = 0; i < MAX_BATCHES; i += 1) {
    const r = await processNewest(BATCH);
    console.log(`batch ${i + 1} n=${r.n} ok=${r.ok} fail=${r.fail}`);
    if (r.n === 0) break;
    if (r.ok === 0) {
      throw new Error("batch processed 0 items; stopping");
    }
  }
  const left = await db.query(`SELECT count(*)::int AS c FROM raw_content WHERE status = 'queued'`);
  console.log(`queued_remaining ${left.rows[0].c}`);

  const digest = await runDailyDigest({ triggeredBy: "recovery" });
  console.log("digest", JSON.stringify(digest));

  const blog = await runAiBlog({ triggeredBy: "recovery" });
  console.log(
    "blog",
    JSON.stringify({
      skipped: blog.skipped || false,
      slug: blog.articleSlug,
      title: blog.title,
      message: blog.message,
    }),
  );

  const latest = await db.query(
    `SELECT slug, category, published_at
     FROM articles
     WHERE status = 'published'
     ORDER BY published_at DESC NULLS LAST
     LIMIT 8`,
  );
  console.log("latest", JSON.stringify(latest.rows, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
