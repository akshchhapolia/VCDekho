const db = require('./db');
const { generateText, parseJsonResponse, DEFAULT_MODEL } = require('./gemini');
const { slugify } = require('../scripts/lib/slugify');
const { normalizeTopics, BUZZ_TOPICS } = require('./buzz-topics');
const { matchInvestorMentions } = require('./buzz-investor-match');

const BUZZ_SYSTEM = `You analyze founder/community discussions about venture capital and fundraising in India.
Return ONLY valid JSON with these keys:
- is_relevant (boolean): true if the post discusses Indian startup fundraising, VCs, angel investors, accelerators, term sheets, diligence, or investor experiences in India.
- relevance_score (integer 0-5): how on-topic for Indian VC/founder fundraising discourse.
- ai_summary (string): 2-3 neutral sentences summarizing the discussion. No hype.
- topics (array): pick 1-4 from this exact list only: ${BUZZ_TOPICS.join(', ')}
- sentiment (string): one of positive, mixed, negative, neutral — tone of the overall discussion toward investors/process, not a fund rating.
- founder_quotes (array): up to 3 short excerpts or paraphrases (max 220 chars each) from the post body. Each item: { "text": string, "paraphrased": boolean }
- investor_mentions (array): VC fund / angel network / accelerator names mentioned (strings, as written in the post).
Reject personal attacks, doxxing, or posts with zero VC/investor angle.`;

const VALID_SENTIMENTS = new Set(['positive', 'mixed', 'negative', 'neutral']);

async function ensureUniqueSlug(base) {
  let slug = slugify(base) || 'discussion';
  slug = slug.slice(0, 72);
  const existing = await db.query(`SELECT slug FROM investor_buzz WHERE slug LIKE $1`, [slug + '%']);
  const taken = new Set(existing.rows.map((r) => r.slug));
  if (!taken.has(slug)) return slug;
  for (let i = 2; i < 50; i++) {
    const candidate = `${slug}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

async function processBuzzItem(item) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is missing');
    }

    const userText = [
      `Source: ${item.source} / r/${item.subreddit || 'unknown'}`,
      `Title: ${item.title}`,
      `Body:\n${item.body_excerpt || ''}`
    ].join('\n');

    const resp = await generateText({
      system: BUZZ_SYSTEM,
      user: userText,
      maxOutputTokens: 1200,
      model: DEFAULT_MODEL,
      jsonMode: true
    });

    const parsed = parseJsonResponse(resp.text);
    if (!parsed) {
      throw new Error('Failed to parse buzz JSON: ' + resp.text.slice(0, 280));
    }

    if (!parsed.is_relevant || (parsed.relevance_score || 0) < 2) {
      await db.query(
        `UPDATE investor_buzz SET status = 'rejected', relevance_score = $2, error_log = $3 WHERE id = $1`,
        [item.id, parsed.relevance_score || 0, 'Not relevant to Indian VC discourse']
      );
      return { success: true, finalStatus: 'rejected' };
    }

    const { slugs, names } = matchInvestorMentions(parsed.investor_mentions || []);
    const sentiment = VALID_SENTIMENTS.has(parsed.sentiment) ? parsed.sentiment : 'neutral';
    const topics = normalizeTopics(parsed.topics);
    const quotes = Array.isArray(parsed.founder_quotes)
      ? parsed.founder_quotes
          .slice(0, 3)
          .map((q) => ({
            text: String(q.text || '').slice(0, 280),
            paraphrased: Boolean(q.paraphrased)
          }))
          .filter((q) => q.text.length > 20)
      : [];

    const slug = await ensureUniqueSlug(item.title);
    const publishedAt = new Date().toISOString();

    await db.query(
      `UPDATE investor_buzz SET
        slug = $2,
        ai_summary = $3,
        topics = $4,
        sentiment = $5,
        founder_quotes = $6,
        investor_slugs = $7,
        investor_names = $8,
        relevance_score = $9,
        status = 'published',
        published_at = $10,
        error_log = NULL
       WHERE id = $1`,
      [
        item.id,
        slug,
        String(parsed.ai_summary || '').slice(0, 1200),
        topics,
        sentiment,
        JSON.stringify(quotes),
        slugs,
        names,
        parsed.relevance_score || 0,
        publishedAt
      ]
    );

    return { success: true, finalStatus: 'published', slug };
  } catch (err) {
    await db.query(
      `UPDATE investor_buzz SET status = 'error', error_log = $2 WHERE id = $1`,
      [item.id, String(err.message || err).slice(0, 2000)]
    );
    return { success: false, error: err.message || String(err) };
  }
}

module.exports = { processBuzzItem };
