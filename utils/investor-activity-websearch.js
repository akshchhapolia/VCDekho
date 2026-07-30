/**
 * Targeted per-investor lookup using Claude's server-side web_search tool —
 * used to "backfill" activity data for investors that the RSS/news pipeline
 * (utils/investor-activity-matcher.js) hasn't picked up yet (either because
 * the scraper's history is short, or the fund's deals just haven't appeared
 * in a tracked feed).
 */
const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const WINDOW_DAYS = 180;

// This is a simple lookup/extraction task, not complex reasoning — Haiku is
// ~3x cheaper per token than Sonnet and plenty capable here. Combined with
// capping web_search max_uses at 1 (below), this cuts cost per investor by
// roughly 5-8x vs. the original Sonnet + max_uses:3 setup, which is what
// burned through ~$12 of credit in ~170 calls (each extra search round both
// costs $0.01 flat AND re-injects a full page's worth of content as billable
// input tokens).
const MODEL = 'claude-haiku-4-5';

// Anthropic pricing (per million tokens) — used only to report an estimated
// spend to the operator; not sent to the API. Update if pricing changes.
const PRICING = {
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-sonnet-4-6': { input: 3, output: 15 }
};
const SEARCH_COST_PER_USE = 0.01; // $10 / 1,000 searches

const SYSTEM_PROMPT = `You are a research assistant for an Indian VC/startup directory. Given the name of a venture capital fund, angel network, or investor, use web search to find their SINGLE most recent investment (i.e. a check they wrote/participated in) into an Indian startup.

Rules:
- Only count actual funding rounds (pre-seed, seed, Series A/B/C..., bridge, debt/venture debt) where this investor is listed as a participant. Do NOT count: the fund raising its OWN capital/corpus, exits, acquisitions, unrelated news, or a portfolio company's general business news that just happens to mention past investors.
- Prefer the most recent deal you can verify, ideally within the last 24 months.
- If you cannot confidently verify a specific deal, respond with {"found": false} — do not guess.
- Respond with ONLY a raw JSON object, no markdown code fences, no other text.

If found:
{"found": true, "date": "YYYY-MM-DD", "startup": "string", "round": "string", "amount": "string or null", "highlight": "short phrase, e.g. '$5M Series A' or '₹40 Cr Seed'", "sector": "string or null", "source_url": "string", "source_title": "string"}

If not found:
{"found": false}`;

function extractJson(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

function estimateCostUsd(usage, searchCount) {
  const rates = PRICING[MODEL] || PRICING['claude-haiku-4-5'];
  const tokenCost =
    ((usage?.input_tokens || 0) / 1e6) * rates.input + ((usage?.output_tokens || 0) / 1e6) * rates.output;
  const searchCost = (searchCount || 0) * SEARCH_COST_PER_USE;
  return tokenCost + searchCost;
}

/**
 * Returns { activity, usage } where activity is in the same shape as
 * utils/investor-activity-matcher.js's aggregateMentions() output (or null
 * if nothing was confidently found), and usage carries token/search counts
 * plus an estimated USD cost for that one call.
 */
async function lookupInvestorActivity(investorName) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: SYSTEM_PROMPT,
    // Capped at 1: each additional search round both costs $0.01 flat AND
    // re-injects a full page of content as billable input tokens, so this is
    // the single biggest cost lever. One search is enough for the vast
    // majority of named funds; ambiguous ones just come back "not found".
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 1 }],
    messages: [{ role: 'user', content: `Investor name: ${investorName}` }]
  });

  const searchCount = (msg.content || []).filter((b) => b.type === 'server_tool_use' && b.name === 'web_search').length;
  const usage = {
    inputTokens: msg.usage?.input_tokens || 0,
    outputTokens: msg.usage?.output_tokens || 0,
    searchCount,
    costUsd: estimateCostUsd(msg.usage, searchCount)
  };

  const textBlocks = (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text);
  const finalText = textBlocks[textBlocks.length - 1];
  const parsed = extractJson(finalText);
  if (!parsed || !parsed.found) return { activity: null, usage };
  if (!parsed.date || Number.isNaN(new Date(parsed.date).getTime())) return { activity: null, usage };

  const dateMs = new Date(parsed.date).getTime();
  const ageDays = (Date.now() - dateMs) / (24 * 60 * 60 * 1000);
  // Sanity check: reject implausible/future dates from a shaky LLM parse.
  if (ageDays < -2 || ageDays > 365 * 5) return { activity: null, usage };

  const recentCheckCount = ageDays >= 0 && ageDays <= WINDOW_DAYS ? 1 : 0;

  const activity = {
    lastCheckDate: new Date(parsed.date).toISOString(),
    lastCheckSector: parsed.sector || null,
    lastCheckHighlight: parsed.highlight || parsed.round || null,
    lastCheckSource: parsed.source_url || null,
    lastCheckSourceTitle: parsed.source_title || parsed.startup || null,
    recentCheckCount,
    totalMentions: 1,
    recentChecks: [
      {
        date: new Date(parsed.date).toISOString(),
        highlight: parsed.highlight || parsed.round || null,
        sector: parsed.sector || null,
        sourceType: 'web_search',
        source: parsed.source_url || null,
        sourceTitle: parsed.source_title || parsed.startup || null
      }
    ]
  };
  return { activity, usage };
}

module.exports = { lookupInvestorActivity };
