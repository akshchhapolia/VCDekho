/**
 * Targeted per-investor lookup — used to "backfill" activity data for
 * investors that the RSS/news pipeline (utils/investor-activity-matcher.js)
 * hasn't picked up yet (either because the scraper's history is short, or
 * the fund's deals just haven't appeared in a tracked feed).
 *
 * Split into two cheap steps instead of one expensive one:
 *   1. Serper.dev for the actual Google search (raw SERP, ~$0.0003-0.001/query,
 *      vs. Anthropic's bundled web_search tool at $0.01/query PLUS full page
 *      content billed as input tokens).
 *   2. A small Claude Haiku call to extract structured JSON from just the
 *      search snippets (a few hundred tokens, not full pages).
 * Together this runs at roughly $0.002-0.003/investor, ~15-30x cheaper than
 * the original Sonnet + native web_search approach.
 */
const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const WINDOW_DAYS = 180;
const MODEL = 'claude-haiku-4-5';

const SERPER_API_KEY = process.env.SERPER_API_KEY || '';
const SERPER_ENDPOINT = 'https://google.serper.dev/search';
const SERPER_RESULT_COUNT = 10;

// Pricing used only to report an estimated spend to the operator — not sent
// to any API. Update if pricing changes.
const PRICING = {
  'claude-haiku-4-5': { input: 1, output: 5 } // $ per million tokens
};
const SERPER_COST_PER_QUERY = 0.001; // Serper Starter tier ($1/1,000); Ultimate is ~3x cheaper still.

const EXTRACTION_SYSTEM_PROMPT = `You are a research assistant for an Indian VC/startup directory. You will be given a list of Google search results about a venture capital fund/investor. Based ONLY on those snippets, determine their SINGLE most recent investment (i.e. a check they wrote/participated in) into an Indian startup.

Rules:
- Only count actual funding rounds (pre-seed, seed, Series A/B/C..., bridge, debt/venture debt) where this investor is listed as a participant. Do NOT count: the fund raising its OWN capital/corpus, exits, acquisitions, unrelated news, or a portfolio company's general business news that just happens to mention past investors.
- Base your answer only on what's in the snippets below — do not use outside knowledge or guess at details not present.
- If none of the results describe a specific, verifiable deal, respond with {"found": false}.
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

async function serperSearch(query) {
  if (!SERPER_API_KEY) throw new Error('SERPER_API_KEY is not set.');
  const res = await fetch(SERPER_ENDPOINT, {
    method: 'POST',
    headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, gl: 'in', num: SERPER_RESULT_COUNT })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Serper search failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
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

function estimateCostUsd(usage, searchPerformed) {
  const rates = PRICING[MODEL];
  const tokenCost = usage
    ? ((usage.input_tokens || 0) / 1e6) * rates.input + ((usage.output_tokens || 0) / 1e6) * rates.output
    : 0;
  const searchCost = searchPerformed ? SERPER_COST_PER_QUERY : 0;
  return tokenCost + searchCost;
}

/**
 * Returns { activity, usage } where activity is in the same shape as
 * utils/investor-activity-matcher.js's aggregateMentions() output (or null
 * if nothing was confidently found), and usage carries an estimated USD
 * cost for that one lookup (search + extraction combined).
 */
async function lookupInvestorActivity(investorName) {
  const query = `${investorName} latest investment India startup funding round`;
  const results = await serperSearch(query);
  const organic = results.organic || [];

  if (!organic.length) {
    return { activity: null, usage: { inputTokens: 0, outputTokens: 0, costUsd: estimateCostUsd(null, true) } };
  }

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Investor name: ${investorName}\n\nSearch results:\n${formatResultsForPrompt(organic)}`
      }
    ]
  });

  const usage = {
    inputTokens: msg.usage?.input_tokens || 0,
    outputTokens: msg.usage?.output_tokens || 0,
    costUsd: estimateCostUsd(msg.usage, true)
  };

  const finalText = (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
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
