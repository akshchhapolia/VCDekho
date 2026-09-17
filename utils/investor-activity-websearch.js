/**
 * Targeted per-investor lookup — used to "backfill" activity data for
 * investors that the RSS/news pipeline (utils/investor-activity-matcher.js)
 * hasn't picked up yet (either because the scraper's history is short, or
 * the fund's deals just haven't appeared in a tracked feed).
 *
 * Split into two cheap steps:
 *   1. Searlo (utils/web-search.js) for the Google SERP.
 *   2. Gemini Flash-Lite to extract structured JSON from search snippets
 *      (~10x cheaper than the previous Claude Haiku extractor).
 */
const { webSearch, SEARLO_COST_PER_QUERY } = require('./web-search');
const { generateText } = require('./gemini');
const { RECENT_ACTIVITY_LIMIT } = require('./investor-activity-store');

const WINDOW_DAYS = 180;
const MAX_DEALS = RECENT_ACTIVITY_LIMIT;
const SEARCH_RESULT_COUNT = 10;

const EXTRACTION_SYSTEM_PROMPT = `You are a research assistant for an Indian VC/startup directory. You will be given a list of Google search results about a venture capital fund/investor. Based ONLY on those snippets, identify up to ${MAX_DEALS} DISTINCT investments (checks they wrote/participated in) into Indian startups.

Rules:
- Only count actual funding rounds (pre-seed, seed, Series A/B/C..., bridge, debt/venture debt) where this investor is listed as a participant. Do NOT count: the fund raising its OWN capital/corpus, exits, acquisitions, unrelated news, or a portfolio company's general business news that just happens to mention past investors.
- Each entry must be a genuinely different deal (different startup and/or different date) — do not list the same deal twice just because multiple snippets cover it.
- Base your answer only on what's in the snippets below — do not use outside knowledge or guess at details not present.
- Order the array from most recent to oldest.
- If none of the results describe a specific, verifiable deal, respond with {"found": false}.
- Respond with ONLY a raw JSON object, no markdown code fences, no other text.

If found:
{"found": true, "deals": [{"date": "YYYY-MM-DD", "startup": "string", "round": "string", "amount": "string or null", "highlight": "short phrase, e.g. '$5M Series A' or '₹40 Cr Seed'", "sector": "string or null", "source_url": "string", "source_title": "string"}]}
(list up to ${MAX_DEALS} deals, most recent first)

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

function formatResultsForPrompt(results) {
  return results
    .map((r, i) => {
      const parts = [`${i + 1}. ${r.title || ''}`, r.snippet || '', `URL: ${r.link || ''}`];
      if (r.date) parts.push(`Date: ${r.date}`);
      return parts.filter(Boolean).join('\n');
    })
    .join('\n\n');
}

function withSearchCost(usage) {
  return {
    inputTokens: usage?.inputTokens || 0,
    outputTokens: usage?.outputTokens || 0,
    costUsd: (usage?.costUsd || 0) + SEARLO_COST_PER_QUERY
  };
}

function dealKey(d) {
  return `${String(d.startup || '').toLowerCase()}|${new Date(d.date).toISOString().slice(0, 10)}`;
}

function normalizeDeal(d) {
  return {
    date: new Date(d.date).toISOString(),
    highlight: d.highlight || d.round || null,
    sector: d.sector || null,
    sourceType: 'web_search',
    source: d.source_url || null,
    sourceTitle: d.source_title || d.startup || null
  };
}

function parseDealsFromResponse(parsed, now, seen) {
  const validDeals = [];
  const rawDeals = Array.isArray(parsed.deals) ? parsed.deals : [];
  for (const d of rawDeals) {
    if (!d || !d.date || Number.isNaN(new Date(d.date).getTime())) continue;
    const dateMs = new Date(d.date).getTime();
    const ageDays = (now - dateMs) / (24 * 60 * 60 * 1000);
    if (ageDays < -2 || ageDays > 365 * 5) continue;
    const key = dealKey(d);
    if (seen.has(key)) continue;
    seen.add(key);
    validDeals.push(normalizeDeal(d));
    if (validDeals.length >= MAX_DEALS) break;
  }
  return validDeals;
}

async function extractDealsFromQuery(investorName, query, seen, now) {
  const { organic } = await webSearch(query, { limit: SEARCH_RESULT_COUNT, gl: 'in', hl: 'en' });
  if (!organic.length) {
    return { deals: [], usage: withSearchCost(null) };
  }

  const { text, usage } = await generateText({
    system: EXTRACTION_SYSTEM_PROMPT,
    user: `Investor name: ${investorName}\n\nSearch results:\n${formatResultsForPrompt(organic)}`,
    maxOutputTokens: 900
  });

  const fullUsage = withSearchCost(usage);
  const parsed = extractJson(text);
  if (!parsed || !parsed.found) return { deals: [], usage: fullUsage };
  return { deals: parseDealsFromResponse(parsed, now, seen), usage: fullUsage };
}

function mergeUsage(total, next) {
  total.inputTokens += next.inputTokens || 0;
  total.outputTokens += next.outputTokens || 0;
  total.costUsd += next.costUsd || 0;
}

/**
 * Returns { activity, usage } where activity is in the same shape as
 * utils/investor-activity-matcher.js's aggregateMentions() output (or null
 * if nothing was confidently found), and usage carries an estimated USD
 * cost for that one lookup (search + extraction combined).
 */
async function lookupInvestorActivity(investorName) {
  const queries = [
    `${investorName} latest investment India startup funding round`,
    `${investorName} invests funding round India startup portfolio`
  ];
  const now = Date.now();
  const seen = new Set();
  const merged = [];
  const totalUsage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };

  for (const query of queries) {
    if (merged.length >= MAX_DEALS) break;
    const { deals, usage } = await extractDealsFromQuery(investorName, query, seen, now);
    mergeUsage(totalUsage, usage);
    for (const deal of deals) {
      merged.push(deal);
      if (merged.length >= MAX_DEALS) break;
    }
  }

  if (!merged.length) return { activity: null, usage: totalUsage };

  merged.sort((a, b) => new Date(b.date) - new Date(a.date));
  const top = merged[0];
  const recentCheckCount = merged.filter(
    (d) => (now - new Date(d.date).getTime()) / (24 * 60 * 60 * 1000) <= WINDOW_DAYS
  ).length;

  const activity = {
    lastCheckDate: top.date,
    lastCheckSector: top.sector,
    lastCheckHighlight: top.highlight,
    lastCheckSource: top.source,
    lastCheckSourceTitle: top.sourceTitle,
    recentCheckCount,
    totalMentions: merged.length,
    recentChecks: merged
  };
  return { activity, usage: totalUsage };
}

module.exports = { lookupInvestorActivity };
