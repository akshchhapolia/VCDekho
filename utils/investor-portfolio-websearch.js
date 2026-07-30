/**
 * Per-investor portfolio lookup via Searlo (web search) + Claude Haiku
 * extraction. Returns up to MAX_COMPANIES structured portfolio entries
 * (company name, amount, stage/series, sector, source, optional website).
 *
 * Cost shape (same pattern as investor-activity-websearch.js):
 *   1 Searlo credit + 1 small Haiku call ≈ $0.002–0.003/investor while
 *   Searlo free/paid credits last.
 */
const { Anthropic } = require('@anthropic-ai/sdk');
const { webSearch, SEARLO_COST_PER_QUERY } = require('./web-search');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const MODEL = 'claude-haiku-4-5';
const MAX_COMPANIES = 10;
const SEARCH_RESULT_COUNT = 10;
const PRICING = {
  'claude-haiku-4-5': { input: 1, output: 5 } // $ per million tokens
};

const EXTRACTION_SYSTEM_PROMPT = `You are a research assistant for an Indian VC/startup directory. You will be given Google search results about a venture capital fund or angel investor. Based ONLY on those snippets, extract up to ${MAX_COMPANIES} DISTINCT portfolio companies / startups they have invested in.

Rules:
- Only include companies where this investor is listed as an investor/participant in a funding round (pre-seed, seed, Series A/B/C..., bridge, venture debt). Do NOT include: the fund itself, LPs, exits/acquisitions as the only signal, or companies merely mentioned without an investment link.
- Each entry must be a different company — do not list the same startup twice.
- Prefer more recent / better-documented deals when you have to choose.
- Base your answer only on the snippets — do not invent amounts, stages, or websites not present.
- If nothing verifiable is found, respond with {"found": false}.
- Respond with ONLY a raw JSON object, no markdown fences, no other text.

If found:
{"found": true, "companies": [{"name": "string", "website": "string or null", "amount": "string or null", "stage": "Pre-Seed|Seed|Series A|Series B|Series C+|Bridge|Debt|Angel|Unknown", "investment_type": "Lead|Participant|Angel|Unknown", "sector": "string or null", "date": "YYYY-MM-DD or null", "highlight": "short phrase e.g. '$5M Series A'", "source_url": "string", "source_title": "string"}]}

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

function estimateCostUsd(usage, searchPerformed) {
  const rates = PRICING[MODEL];
  const tokenCost = usage
    ? ((usage.input_tokens || 0) / 1e6) * rates.input + ((usage.output_tokens || 0) / 1e6) * rates.output
    : 0;
  return tokenCost + (searchPerformed ? SEARLO_COST_PER_QUERY : 0);
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
    // Free favicon fallback — no Logo.dev token required. Swap later if needed.
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

/**
 * Returns { companies, usage } — companies is an array (possibly empty).
 */
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

async function lookupInvestorPortfolio(investorName) {
  const nameForSearch = searchName(investorName);
  const query = `${nameForSearch} portfolio companies investments India startups funding rounds`;
  const { organic } = await webSearch(query, { limit: SEARCH_RESULT_COUNT, gl: 'in', hl: 'en' });

  if (!organic.length) {
    return { companies: [], usage: { inputTokens: 0, outputTokens: 0, costUsd: estimateCostUsd(null, true) } };
  }

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Investor name: ${investorName}${nameForSearch !== investorName ? ` (also known as ${nameForSearch})` : ''}\n\nSearch results:\n${formatResultsForPrompt(organic)}`
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
  if (!parsed || !parsed.found || !Array.isArray(parsed.companies)) {
    return { companies: [], usage };
  }

  const seen = new Set();
  const companies = [];
  for (const raw of parsed.companies) {
    const c = normalizeCompany(raw);
    if (!c) continue;
    if (seen.has(c.companySlug)) continue;
    seen.add(c.companySlug);
    companies.push(c);
    if (companies.length >= MAX_COMPANIES) break;
  }

  // Prefer more recent first when dates exist.
  companies.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  return { companies, usage };
}

module.exports = { lookupInvestorPortfolio, slugifyCompany, logoUrlForWebsite };
