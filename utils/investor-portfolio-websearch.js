/**
 * Per-investor portfolio lookup via Searlo (web search) + Gemini Flash-Lite
 * extraction. Returns up to MAX_COMPANIES structured portfolio entries
 * (company name, amount, stage/series, sector, source, optional website).
 *
 * Cost shape: 1 Searlo credit + 1 small Gemini call ≈ $0.0003–0.0005/investor
 * (roughly 5–10x cheaper than the previous Claude Haiku extractor).
 */
const { webSearch, SEARLO_COST_PER_QUERY } = require('./web-search');
const { generateText } = require('./gemini');

const MAX_COMPANIES = 10;
const SEARCH_RESULT_COUNT = 10;

const EXTRACTION_SYSTEM_PROMPT = `You are a research assistant for an Indian VC/startup directory. You will be given Google search results about a venture capital fund or angel investor. Based ONLY on those snippets, extract up to ${MAX_COMPANIES} DISTINCT portfolio companies / startups they have invested in.

Rules:
- Include a company if ANY of these are true in the snippets:
  (a) they are named on this investor's official portfolio / investments page,
  (b) a funding article lists this investor as a participant/lead/backer,
  (c) an exit/follow-on story clearly says this investor had invested earlier.
- Do NOT include: the fund itself, LPs, other VCs, accelerators as "companies", or unrelated brands with no investment link.
- Amount/stage/date may be null when only the portfolio listing is known — still include the company.
- Each entry must be a different company. Prefer more recent / better-documented deals when choosing.
- Profile notes (when provided) often explicitly list portfolio companies — ALWAYS include those names even if amount/stage are unknown.
- Base your answer only on the snippets and profile notes — do not invent names, amounts, or stages not present.
- If nothing verifiable is found, respond with {"found": false}.
- Respond with ONLY a raw JSON object, no markdown fences, no other text.

If found:
{"found": true, "companies": [{"name": "string", "website": "string or null", "amount": "string or null", "stage": "Pre-Seed|Seed|Series A|Series B|Series C+|Bridge|Debt|Angel|Unknown", "investment_type": "Lead|Participant|Angel|Unknown", "sector": "string or null", "date": "YYYY-MM-DD or null", "highlight": "short phrase e.g. '$5M Series A' or 'Portfolio company'", "source_url": "string", "source_title": "string"}]}

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

function slugifyCompany(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function logoUrlForWebsite(website) {
  if (!website) return null;
  try {
    const host = new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace(/^www\./, '');
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch (_) {
    return null;
  }
}

function normalizeCompany(raw) {
  const name = String((raw && raw.name) || '').trim();
  if (!name || name.length < 2) return null;
  let website = raw.website ? String(raw.website).trim() : null;
  if (website && !/^https?:\/\//i.test(website)) website = 'https://' + website;
  if (website && website.length > 300) website = null;

  let date = null;
  if (raw.date && !Number.isNaN(new Date(raw.date).getTime())) {
    const ageDays = (Date.now() - new Date(raw.date).getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays >= -2 && ageDays <= 365 * 25) date = new Date(raw.date).toISOString().slice(0, 10);
  }

  return {
    name,
    companySlug: slugifyCompany(name),
    website,
    logoUrl: logoUrlForWebsite(website),
    amount: raw.amount ? String(raw.amount).trim() : null,
    stage: raw.stage ? String(raw.stage).trim() : null,
    investmentType: raw.investment_type ? String(raw.investment_type).trim() : null,
    sector: raw.sector ? String(raw.sector).trim() : null,
    date,
    highlight: raw.highlight ? String(raw.highlight).trim() : null,
    sourceUrl: raw.source_url ? String(raw.source_url).trim() : null,
    sourceTitle: raw.source_title ? String(raw.source_title).trim() : null,
    sourceMethod: 'web_search'
  };
}

function searchName(investorName) {
  // "Sequoia (India) / Peak XV" → prefer the distinctive right-hand name.
  let name = String(investorName || '').trim();
  if (name.includes('/')) {
    const parts = name.split('/').map((p) => p.trim()).filter(Boolean);
    name = parts[parts.length - 1] || name;
  }
  name = name.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  return name || investorName;
}

/**
 * Free extraction from our own profile writeups/notes, which often already
 * list portfolio names ("Portfolio: A, B, C" / "Portfolio names include…").
 */
function companiesFromWriteup(text) {
  const t = String(text || '');
  if (!t) return [];
  const patterns = [
    /portfolio(?:\s+names)?(?:\s+include|\s*:)\s*([^.!\n]+)/i,
    /(?:notable\s+)?investments?(?:\s+include|\s*:)\s*([^.!\n]+)/i,
    /backed\s+([A-Z][^.]{10,180}?)(?:\.|$)/
  ];
  const names = [];
  for (const re of patterns) {
    const m = t.match(re);
    if (!m) continue;
    String(m[1])
      .split(/,|;&| and /i)
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter((s) => s.length >= 2 && s.length <= 60)
      .filter((s) => !/^(include|including|such as|e\.g\.?|etc)$/i.test(s))
      .forEach((name) => names.push(name));
  }
  const seen = new Set();
  const out = [];
  for (const name of names) {
    const c = normalizeCompany({
      name,
      highlight: 'Listed in profile',
      stage: 'Unknown',
      investment_type: 'Unknown'
    });
    if (!c || seen.has(c.companySlug)) continue;
    seen.add(c.companySlug);
    out.push(c);
  }
  return out;
}

function dedupeOrganic(results) {
  const seen = new Set();
  const out = [];
  for (const r of results || []) {
    const key = String(r.link || r.title || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * Returns { companies, usage } — companies is an array (possibly empty).
 * opts.website: optional fund website for a site:-scoped portfolio search.
 * opts.writeup: optional profile text that may already name portfolio cos.
 */
async function lookupInvestorPortfolio(investorName, opts = {}) {
  const nameForSearch = searchName(investorName);
  const queries = [
    `${nameForSearch} portfolio companies startups India`,
    `${nameForSearch} invested in OR backed OR led funding round India startup`
  ];
  if (opts.website) {
    try {
      const host = new URL(
        opts.website.startsWith('http') ? opts.website : `https://${opts.website}`
      ).hostname.replace(/^www\./, '');
      if (host) queries.push(`site:${host} portfolio OR investments OR startups`);
    } catch (_) {
      /* ignore bad website */
    }
  }

  let organic = [];
  let searchCalls = 0;
  for (const q of queries) {
    try {
      const res = await webSearch(q, { limit: SEARCH_RESULT_COUNT, gl: 'in', hl: 'en' });
      searchCalls += 1;
      organic = organic.concat(res.organic || []);
    } catch (err) {
      // One failed query shouldn't kill the whole lookup.
      if (err.status === 402 || /insufficient credits/i.test(err.message || '')) throw err;
    }
  }
  organic = dedupeOrganic(organic).slice(0, 18);

  if (!organic.length && !opts.writeup) {
    return {
      companies: [],
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        costUsd: SEARLO_COST_PER_QUERY * Math.max(1, searchCalls)
      }
    };
  }

  const writeupBlock = opts.writeup
    ? `\n\nProfile notes (may list known portfolio companies — only use names clearly presented as investments):\n${String(opts.writeup).slice(0, 1200)}`
    : '';

  const { text, usage } = await generateText({
    system: EXTRACTION_SYSTEM_PROMPT,
    user: `Investor name: ${investorName}${nameForSearch !== investorName ? ` (also known as ${nameForSearch})` : ''}\n\nSearch results:\n${formatResultsForPrompt(organic) || '(none)'}${writeupBlock}`,
    maxOutputTokens: 1400
  });

  const fullUsage = {
    inputTokens: usage?.inputTokens || 0,
    outputTokens: usage?.outputTokens || 0,
    costUsd: (usage?.costUsd || 0) + SEARLO_COST_PER_QUERY * Math.max(1, searchCalls || 0)
  };
  const parsed = extractJson(text);
  const seen = new Set();
  const companies = [];

  function pushCompany(c) {
    if (!c || seen.has(c.companySlug)) return;
    seen.add(c.companySlug);
    companies.push(c);
  }

  if (parsed && parsed.found && Array.isArray(parsed.companies)) {
    for (const raw of parsed.companies) {
      pushCompany(normalizeCompany(raw));
      if (companies.length >= MAX_COMPANIES) break;
    }
  }
  // Always merge free writeup-derived names (fills gaps when the LLM is shy).
  for (const c of companiesFromWriteup(opts.writeup)) {
    pushCompany(c);
    if (companies.length >= MAX_COMPANIES) break;
  }

  companies.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  return { companies, usage: fullUsage };
}

module.exports = {
  lookupInvestorPortfolio,
  slugifyCompany,
  logoUrlForWebsite,
  companiesFromWriteup
};
