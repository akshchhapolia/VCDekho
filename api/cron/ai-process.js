const { Anthropic } = require('@anthropic-ai/sdk');
const db = require('../../utils/db');
const { runCronJob } = require('../../utils/cron-run');

// Ensure ANTHROPIC_API_KEY is present
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || ''
});

const MAX_ITEMS_PER_RUN = 10;

async function processItem(item) {
    try {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error("ANTHROPIC_API_KEY is missing");
        }
        
        // Fetch any duplicate articles that were merged with this one (stubbed since columns do not exist in schema)
        const duplicates = [];

        // Combine the text of all related articles
        let combinedText = `Primary Report (Source: ${item.source_name}):\nTitle: ${item.title}\nBody:\n${item.body}\n\n`;
        if (duplicates.length > 0) {
            combinedText += `--- ADDITIONAL REPORTS ON THE SAME EVENT ---\n\n`;
            duplicates.forEach((dup, index) => {
                combinedText += `Report ${index + 2} (Source: ${dup.source_name}):\nTitle: ${dup.title}\nBody:\n${dup.body}\n\n`;
            });
        }

        // --- Prompt 1: Fact Extraction ---
        const prompt1Msg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            system: `You are a VC and startup news analyst. Extract structured facts from the news report(s) below. Multiple articles from different sources about the SAME event may be provided; collate the information into a single cohesive set of facts. Return ONLY a valid JSON object with these keys: startup_name, news_category (e.g., 'Funding', 'Acquisition', 'Product Launch', 'Milestone', 'Tech/Research'), key_highlight (a short phrase summarizing the main achievement/metric, e.g. '$5M Seed', 'Acquired for $10M', or 'Crossed 1M Users'), amount_raised, currency, stage, lead_investors (array), other_investors (array), country, city, industry, startup_description (one sentence, max 20 words), and is_major_news (boolean). Set is_major_news to true ONLY IF this is a highly significant event (e.g. raised >$10M USD, or is a major strategic milestone for a well-known startup). If a field is not mentioned, use null. Do not include any text outside the JSON object.`,
            messages: [{ role: 'user', content: combinedText }]
        });
        
        let facts;
        try {
            let text = prompt1Msg.content[0].text.trim();
            if (text.startsWith('```json')) text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
            else if (text.startsWith('```')) text = text.replace(/^```\n/, '').replace(/\n```$/, '');
            facts = JSON.parse(text);
        } catch (e) {
            throw new Error('Failed to parse Prompt 1 JSON: ' + prompt1Msg.content[0].text);
        }

        // --- Routing: Major vs Minor News ---
        if (!facts.is_major_news) {
            // It's a minor news item. Skip full article generation and mark for Daily Digest.
            await db.query(
                `UPDATE raw_content SET status = 'digest_pending', extracted_facts = $1 WHERE id = $2`, 
                [JSON.stringify(facts), item.id]
            );
            return { success: true, finalStatus: 'digest_pending' };
        }

        // --- Prompt 2: Article Generation ---
        const prompt2Msg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            system: `You are an expert VC and startup journalist writing for VCDekho. Write a comprehensive, engaging news article using the provided JSON facts.
Rules:
- Length: 300 to 500 words.
- Format: HTML. Use <h2> for subheadings, <p> for paragraphs.
- VITAL: Do NOT use a <ul> bulleted list for the key facts. Instead, use the following exact HTML structure to create a visual infographic grid for the funding facts (Amount Raised, Stage, Lead Investors, etc.):
<div class="infographic-grid">
  <div class="info-card">
    <div class="info-label">Amount Raised</div>
    <div class="info-value">...</div>
  </div>
  <!-- repeat for other facts -->
</div>
- Tone: Professional, authoritative, but accessible. No jargon.
- Do NOT include <html>, <head>, or <body> tags. Just the HTML body content.`,
            messages: [{ role: 'user', content: JSON.stringify(facts) }]
        });

        const generatedArticle = prompt2Msg.content[0].text;

        // --- Prompt 3: SEO and metadata ---
        const prompt3Msg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            system: `You are an SEO specialist. Given the article below, return ONLY a valid JSON object with these keys: - slug: URL-friendly string, lowercase, hyphens, max 70 chars - meta_title: string, max 60 chars, includes startup name and round - meta_description: string, max 155 chars, compelling, includes key terms - tags: array of 5 to 8 strings - internal_link_entities: array of VC firm and investor names mentioned in the article that may have a profile on VCDekho. Do not include any text outside the JSON object.`,
            messages: [{ role: 'user', content: `Article:\n${generatedArticle}` }]
        });

        let metadata;
        try {
            let text = prompt3Msg.content[0].text.trim();
            if (text.startsWith('```json')) text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
            else if (text.startsWith('```')) text = text.replace(/^```\n/, '').replace(/\n```$/, '');
            metadata = JSON.parse(text);
        } catch (e) {
            throw new Error('Failed to parse Prompt 3 JSON: ' + prompt3Msg.content[0].text);
        }

        // Check auto-discard rule: word count < 150
        const wordCount = generatedArticle.split(/\s+/).length;
        const finalStatus = wordCount < 150 ? 'discarded' : 'published';
        const publishedAt = finalStatus === 'published' ? (item.published_at_source ? new Date(item.published_at_source) : new Date()) : null;

        // --- Save to articles table ---
        await db.query(
            `INSERT INTO articles (raw_content_id, title, body, slug, meta_title, meta_description, tags, category, source_name, source_url, internal_link_entities, status, published_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
                item.id,
                item.title, // or facts.startup_name + " raises " + facts.amount_raised
                generatedArticle,
                metadata.slug,
                metadata.meta_title,
                metadata.meta_description,
                metadata.tags,
                'funding-round', // simplistic categorization for MVP
                item.source_name,
                item.source_url,
                metadata.internal_link_entities,
                finalStatus,
                publishedAt
            ]
        );

        // Update raw_content status
        await db.query(`UPDATE raw_content SET status = 'processing_done' WHERE id = $1`, [item.id]);

        return { success: true, finalStatus };
    } catch (error) {
        await db.query(`UPDATE raw_content SET status = 'error', error_log = $1 WHERE id = $2`, [error.message, item.id]);
        return { success: false, error: error.message };
    }
}

module.exports = async function handler(req, res) {
    return runCronJob(req, res, 'ai-process', async () => {
        const queueResult = await db.query(`SELECT * FROM raw_content WHERE status = 'queued' ORDER BY relevance_score DESC, scraped_at ASC LIMIT $1`, [MAX_ITEMS_PER_RUN]);
        const queuedItems = queueResult.rows;

        let processedCount = 0;
        let errors = [];

        for (const item of queuedItems) {
            await db.query(`UPDATE raw_content SET status = 'processing' WHERE id = $1`, [item.id]);

            const result = await processItem(item);
            if (result.success) {
                processedCount++;
            } else {
                errors.push(`Item ${item.id}: ${result.error}`);
            }
        }

        const meta = { processedCount, totalQueued: queuedItems.length, errors };
        if (queuedItems.length > 0 && processedCount === 0) {
            meta.alert = true;
            meta.alertSeverity = 'error';
            meta.alertSubject = 'AI process: 0 items processed with non-empty queue';
            meta.alertBody = errors.join('\n') || 'All items failed';
        }
        return meta;
    });
};
