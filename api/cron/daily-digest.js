const db = require('../../utils/db');
const { runCronJob } = require('../../utils/cron-run');
const { generateText, stripCodeFences, PROSE_MODEL } = require('../../utils/gemini');
const {
  formatDigestLabel,
  digestPublishedAtFromDay,
  groupItemsByNewsDay
} = require('../../utils/article-dates');

const DIGEST_SYSTEM = `You are a tech and startup ecosystem analyst writing for VCDekho. Write a comprehensive "Startup & Tech Daily Digest" article summarizing the provided news items.
Rules:
- Length: 400 to 600 words
- Structure: Start with an engaging hook sentence about the day's ecosystem activity. Group the items logically if possible (e.g. Funding, Acquisitions, Tech/Product).
- VITAL HTML FORMAT: Instead of using a bulleted list, you MUST summarize each news item using this EXACT HTML structure:
            <div class="digest-grid">
              <div class="digest-card">
                <div class="digest-header">
                  <h3 class="digest-startup">Startup Name / Company</h3>
                  <span class="digest-highlight">The Key Metric (e.g., $5M Seed, Launched Pro, Acquired)</span>
                </div>
                <p class="digest-description">2-3 sentences explaining exactly what happened and why it matters.</p>
              </div>
              <!-- Repeat .digest-card for each news item inside the grid -->
            </div>
            - Use <strong> for emphasis on key statistics in the description. Use only the provided data.
- Tone: Factual, professional, no jargon.
- Output ONLY the HTML article body. Do not include any JSON or markdown blocks.`;

function buildDigestPrompt(pendingItems) {
  let combinedDigestText = '--- PENDING DIGEST ITEMS ---\n\n';
  pendingItems.forEach((item, index) => {
    const facts = item.extracted_facts || {};
    combinedDigestText += `Item ${index + 1}:\n`;
    combinedDigestText += `Category: ${facts.news_category || 'General News'}\n`;
    combinedDigestText += `Startup/Entity: ${facts.startup_name || item.title}\n`;
    combinedDigestText += `Highlight: ${facts.key_highlight || facts.amount_raised || 'Major Milestone'}\n`;
    combinedDigestText += `Key Players: ${JSON.stringify(facts.lead_investors || [])}\n`;
    combinedDigestText += `Description: ${facts.startup_description || item.body || 'No description available'}\n\n`;
  });
  return combinedDigestText;
}

async function uniqueSlug(baseSlug) {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const check = await db.query(`SELECT id FROM articles WHERE slug = $1`, [slug]);
    if (check.rows.length === 0) return slug;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function publishDigestForDay(dayStr, pendingItems) {
  const digestPrompt = await generateText({
    system: DIGEST_SYSTEM,
    user: buildDigestPrompt(pendingItems),
    maxOutputTokens: 2048,
    model: PROSE_MODEL,
    jsonMode: false
  });

  const generatedArticle = stripCodeFences(digestPrompt.text);
  const label = formatDigestLabel(digestPublishedAtFromDay(dayStr));
  const articleTitle = `Startup & Tech Daily Digest: ${label}`;
  const baseSlug = `startup-tech-digest-${dayStr}`;
  const slug = await uniqueSlug(baseSlug);
  const publishedAt = digestPublishedAtFromDay(dayStr);

  await db.query(
    `INSERT INTO articles (raw_content_id, title, body, slug, meta_title, meta_description, tags, category, source_name, source_url, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      pendingItems[0].id,
      articleTitle,
      generatedArticle,
      slug,
      `${articleTitle} | VCDekho`,
      `A comprehensive roundup of startup ecosystem news from ${label}, featuring ${pendingItems.map(i => (i.extracted_facts && i.extracted_facts.startup_name) || 'various startups').slice(0, 3).join(', ')} and more.`,
      ['Daily Digest', 'Startup News', 'Tech Ecosystem', 'Funding', 'Venture Capital'],
      'daily-digest',
      'VCDekho Original',
      '/',
      'published',
      publishedAt
    ]
  );

  const pendingIds = pendingItems.map(i => i.id);
  await db.query(`UPDATE raw_content SET status = 'processing_done' WHERE id = ANY($1)`, [pendingIds]);

  return { slug, itemsProcessed: pendingItems.length, newsDay: dayStr, publishedAt };
}

module.exports = async function handler(req, res) {
  return runCronJob(req, res, 'daily-digest', async () => {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is missing');
    }

    const pendingResult = await db.query(
      `SELECT * FROM raw_content WHERE status = 'digest_pending' ORDER BY scraped_at ASC`
    );
    const pendingItems = pendingResult.rows;

    if (pendingItems.length === 0) {
      return { message: 'No items pending for digest.', itemsProcessed: 0 };
    }

    const byDay = groupItemsByNewsDay(pendingItems);
    const days = [...byDay.keys()].sort();

    const published = [];
    for (const dayStr of days) {
      const items = byDay.get(dayStr);
      const result = await publishDigestForDay(dayStr, items);
      published.push(result);
    }

    return {
      digestsPublished: published.length,
      itemsProcessed: pendingItems.length,
      articles: published,
      provider: 'gemini'
    };
  });
};

module.exports.publishDigestForDay = publishDigestForDay;
module.exports.buildDigestPrompt = buildDigestPrompt;
