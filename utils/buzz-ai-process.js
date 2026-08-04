const db = require('./db');
const { generateText, parseJsonResponse, DEFAULT_MODEL } = require('./gemini');
const { slugify } = require('../scripts/lib/slugify');
const { normalizeTopics, BUZZ_TOPICS } = require('./buzz-topics');
const { matchInvestorsInBuzz } = require('./buzz-investor-match');
const { isHardRejectBuzzPost } = require('./buzz-relevance');
const { ensureBuzzFullBody } = require('./buzz-body-fetch');

const BUZZ_SYSTEM = `You curate "Investor Buzz" — founder/community RETROSPECTIVES about venture capital in India.

ONLY mark is_relevant=true when the author is SHARING a past experience, review, or honest retrospective about:
- dealing with a specific VC fund, angel, or accelerator
- fundraising process (diligence, term sheets, rejections, ghosting, partner access, follow-on)
- the Indian VC ecosystem based on lived experience

ALWAYS mark is_relevant=false for:
- posts ASKING for investors, angels, funding, or co-founders
- idea validation, hiring, jobs, service pitches, "looking for" posts
- generic startup advice with no VC/investor experience shared
- posts that only mention "investor" in passing without any review or story

Return ONLY valid JSON:
- is_relevant (boolean)
- relevance_score (integer 0-5): 4-5 = clear founder VC review with specifics; 3 = solid process experience; 0-2 = off-topic or asking-not-reviewing
- ai_summary (string): max 2 short lines / ~160 characters. One or two neutral sentences only — no third sentence
- topics (array): 1-4 from: ${BUZZ_TOPICS.join(', ')}
- sentiment (string): positive | mixed | negative | neutral — tone toward the fundraising/VC process discussed
- founder_quotes (array): up to 3 short excerpts/paraphrases (max 220 chars). Each: { "text": string, "paraphrased": boolean }
- investor_mentions (array): EVERY VC fund / angel / accelerator name mentioned in title or body (as written). Include all names from lists and tables — do not omit any.

Reject doxxing and personal attacks.`;

const VALID_SENTIMENTS = new Set(['positive', 'mixed', 'negative', 'neutral']);
const AI_SUMMARY_MAX_CHARS = 180;

/** Keep AI summary to roughly two display lines. */
function clampAiSummary(raw) {
  const text = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= AI_SUMMARY_MAX_CHARS) return text;

  const cut = text.slice(0, AI_SUMMARY_MAX_CHARS);
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentenceEnd >= 80) return cut.slice(0, sentenceEnd + 1).trim();
  const wordEnd = cut.lastIndexOf(' ');
  return (wordEnd > 60 ? cut.slice(0, wordEnd) : cut).trim().replace(/[.,;:]+$/, '') + '…';
}

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

    const fullBody = await ensureBuzzFullBody(item);
    if (fullBody) item.body_excerpt = fullBody;

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

    if (isHardRejectBuzzPost(item.title, item.body_excerpt)) {
      await db.query(
        `UPDATE investor_buzz SET status = 'rejected', relevance_score = 0, error_log = $2 WHERE id = $1`,
        [item.id, 'Hard reject: not a founder VC review']
      );
      return { success: true, finalStatus: 'rejected' };
    }

    if (!parsed.is_relevant || (parsed.relevance_score || 0) < 3) {
      await db.query(
        `UPDATE investor_buzz SET status = 'rejected', relevance_score = $2, error_log = $3 WHERE id = $1`,
        [item.id, parsed.relevance_score || 0, 'Not a founder VC review/experience']
      );
      return { success: true, finalStatus: 'rejected' };
    }

    const { slugs, names } = matchInvestorsInBuzz({
      title: item.title,
      body: item.body_excerpt,
      aiMentions: parsed.investor_mentions || []
    });
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
        clampAiSummary(parsed.ai_summary),
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
