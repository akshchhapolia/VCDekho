/**
 * Shared web search client — Searlo (https://searlo.tech).
 *
 * Replaces Serper.dev: same organic-result shape for callers, but with a much
 * lower entry cost (free signup credits, then ~$3–4 packs instead of Serper's
 * $50 minimum top-up). Used by investor-activity backfill and portfolio
 * enrichment.
 *
 * Auth: SEARLO_API_KEY in env (header `x-api-key`).
 * Docs: https://searlo.tech/docs  — base URL https://api.searlo.tech/api/v1
 *
 * Free-tier rate limits (as of 2026): 5/s, 10/min, 200/hour, 1000/day.
 * Callers doing bulk jobs should keep concurrency low (1–2) and retry on 429.
 */
const SEARLO_API_KEY = process.env.SEARLO_API_KEY || '';
const SEARLO_ENDPOINT = 'https://api.searlo.tech/api/v1/search/web';

// Paid-pack estimate used only for operator spend reporting. Free credits
// still report this unit cost so budgets stay conservative; actual cash out
// is $0 until free credits are exhausted.
const SEARLO_COST_PER_QUERY = 0.0003; // ~$0.30 / 1K on Searlo's cheaper packs

/**
 * Run a web search. Returns { organic, creditsRemaining } where organic is
 * an array of { title, link, snippet, date? } — the same shape Serper used,
 * so existing extraction prompts keep working unchanged.
 */
async function webSearch(query, { limit = 10, gl = 'in', hl = 'en' } = {}) {
  if (!SEARLO_API_KEY) throw new Error('SEARLO_API_KEY is not set.');

  const capped = Math.max(1, Math.min(10, Number(limit) || 10));
  const params = new URLSearchParams({
    q: query,
    limit: String(capped),
    gl,
    hl
  });

  const res = await fetch(`${SEARLO_ENDPOINT}?${params}`, {
    method: 'GET',
    headers: { 'x-api-key': SEARLO_API_KEY }
  });

  if (res.status === 429) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Searlo rate limit (429): ${body.slice(0, 200)}`);
    err.status = 429;
    throw err;
  }
  if (res.status === 402) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Searlo insufficient credits (402): ${body.slice(0, 200)}`);
    err.status = 402;
    throw err;
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Searlo search failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  // Docs show `items`; live responses currently return Serper-style `organic`.
  // Accept either so a docs-aligned response change doesn't break us.
  const raw = Array.isArray(data.organic)
    ? data.organic
    : Array.isArray(data.items)
      ? data.items
      : [];

  const organic = raw.map((r) => ({
    title: r.title || '',
    link: r.link || r.url || '',
    snippet: r.snippet || r.description || '',
    date: r.date || (r.news && r.news.publishedDate) || null
  }));

  const creditsRemainingHeader = res.headers.get('x-credits-remaining');
  const creditsRemaining = creditsRemainingHeader != null ? Number(creditsRemainingHeader) : null;

  return { organic, creditsRemaining, costUsd: SEARLO_COST_PER_QUERY };
}

module.exports = { webSearch, SEARLO_COST_PER_QUERY };
