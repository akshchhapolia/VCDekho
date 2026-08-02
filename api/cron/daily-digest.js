const { Anthropic } = require('@anthropic-ai/sdk');
const db = require('../../utils/db');
const { runCronJob } = require('../../utils/cron-run');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || ''
});

module.exports = async function handler(req, res) {
    return runCronJob(req, res, 'daily-digest', async () => {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error("ANTHROPIC_API_KEY is missing");
        }

        const pendingResult = await db.query(`SELECT * FROM raw_content WHERE status = 'digest_pending' ORDER BY scraped_at ASC`);
        const pendingItems = pendingResult.rows;

        if (pendingItems.length === 0) {
            return { message: 'No items pending for digest.', itemsProcessed: 0 };
        }

        // Prepare the payload for the AI
        let combinedDigestText = "--- PENDING DIGEST ITEMS ---\n\n";
        pendingItems.forEach((item, index) => {
            const facts = item.extracted_facts || {};
            combinedDigestText += `Item ${index + 1}:\n`;
            combinedDigestText += `Category: ${facts.news_category || 'General News'}\n`;
            combinedDigestText += `Startup/Entity: ${facts.startup_name || item.title}\n`;
            combinedDigestText += `Highlight: ${facts.key_highlight || facts.amount_raised || 'Major Milestone'}\n`;
            combinedDigestText += `Key Players: ${JSON.stringify(facts.lead_investors || [])}\n`;
            combinedDigestText += `Description: ${facts.startup_description || item.body || 'No description available'}\n\n`;
        });

        // --- Generate Digest Article ---
        const digestPromptMsg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            system: `You are a tech and startup ecosystem analyst writing for VCDekho. Write a comprehensive "Startup & Tech Daily Digest" article summarizing the provided news items. 
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
- Output ONLY the HTML article body. Do not include any JSON or markdown blocks.`,
            messages: [{ role: 'user', content: combinedDigestText }]
        });

        const generatedArticle = digestPromptMsg.content[0].text;

        // Generate dynamic title with the date
        const today = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        const articleTitle = `Startup & Tech Daily Digest: ${today}`;
        const baseSlug = `startup-tech-digest-${new Date().toISOString().split('T')[0]}`;
        
        let slug = baseSlug;
        let slugExists = true;
        let counter = 1;
        while (slugExists) {
            const checkRes = await db.query(`SELECT id FROM articles WHERE slug = $1`, [slug]);
            if (checkRes.rows.length === 0) {
                slugExists = false;
            } else {
                slug = `${baseSlug}-${counter}`;
                counter++;
            }
        }

        // --- Save to articles table ---
        await db.query(
            `INSERT INTO articles (raw_content_id, title, body, slug, meta_title, meta_description, tags, category, source_name, source_url, status, published_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                pendingItems[0].id, // Anchor it to the first item for FK constraint
                articleTitle,
                generatedArticle,
                slug,
                `${articleTitle} | VCDekho`,
                `A comprehensive roundup of today's startup ecosystem news, featuring funding, tech, and milestones from ${pendingItems.map(i => (i.extracted_facts && i.extracted_facts.startup_name) || 'various startups').slice(0, 3).join(', ')} and more.`,
                ['Daily Digest', 'Startup News', 'Tech Ecosystem', 'Funding', 'Venture Capital'],
                'daily-digest',
                'VCDekho Original',
                '/',
                'published',
                new Date()
            ]
        );

        const pendingIds = pendingItems.map(i => i.id);
        await db.query(`UPDATE raw_content SET status = 'processing_done' WHERE id = ANY($1)`, [pendingIds]);

        return { itemsProcessed: pendingItems.length, articleSlug: slug };
    });
};
