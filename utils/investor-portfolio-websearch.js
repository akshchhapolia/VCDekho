/**
 * Per-investor portfolio lookup.
 *
 * Order of sources (as product requires):
 *   1. Investor's own website portfolio page (logos, names, company links)
 *   2. News/articles via Searlo + Gemini (amounts, stages, dates) — also the
 *      fallback when no portfolio page exists
 *   3. Free parse of our own profile writeup ("Portfolio names include…")
 */
const { webSearch, SEARLO_COST_PER_QUERY } = require('./web-search');
const { generateText } = require('./gemini');
const { scrapeInvestorPortfolioSite } = require('./investor-portfolio-site');

const MAX_COMPANIES_NEWS = 10;
const MAX_COMPANIES_SITE = 80;
const SEARCH_RESULT_COUNT = 10;

const EXTRACTION_SYSTEM_PROMPT = `You are a research assistant for an Indian VC/startup directory. You will be given Google search results about a venture capital fund or angel investor. Based ONLY on those snippets, extract up to ${MAX_COMPANIES_NEWS} DISTINCT portfolio companies / startups they have invested in.

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
const WRITEUP_NOISE = new Set([
  'saas', 'fintech', 'deeptech', 'deep tech', 'healthtech', 'climate', 'consumer',
  'd2c', 'b2b', 'india', 'bharat', 'ai', 'ml', 'etc', 'and more', 'others'
]);

function companiesFromWriteup(text) {
  const t = String(text || '');
  if (!t) return [];
  // Only high-precision list phrases — avoid loose "backed …" matches.
  const patterns = [
    /portfolio\s+names?\s+include\s*[:\-]?\s*([^.!\n]+)/i,
    /portfolio\s*(?:companies)?\s*:\s*([^.!\n]+)/i,
    /notable\s+investments?\s+include\s*[:\-]?\s*([^.!\n]+)/i
  ];
  const names = [];
  for (const re of patterns) {
    const m = t.match(re);
    if (!m) continue;
    String(m[1])
      .split(/,|;|\/|&| and /i)
      .map((s) => s.replace(/\s+/g, ' ').replace(/^[(\[]|[)\]]$/g, '').trim())
      .filter((s) => s.length >= 2 && s.length <= 50)
      .filter((s) => /[A-Za-z]/.test(s))
      .filter((s) => !WRITEUP_NOISE.has(s.toLowerCase()))
      .filter((s) => !/^(include|including|such as|e\.g\.?|etc|acq\.?|acquired)$/i.test(s))
      .forEach((name) => names.push(name));
  }
  const seen = new Set();
  const out = [];
  for (const name of names) {
    const c = normalizeCompany({
      name,
      // Leave stage/amount/highlight empty — the UI should not show placeholders.
      // Enrichment later fills date/source/amount from search when available.
      highlight: null,
      stage: null,
      investment_type: null
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

async function lookupFromNews(investorName, opts = {}) {
  const nameForSearch = searchName(investorName);
  const queries = [
    `${nameForSearch} portfolio companies startups India`,
    `${nameForSearch} invested in OR backed OR led funding round India startup`
  ];

  let organic = [];
  let searchCalls = 0;
  for (const q of queries) {
    try {
      const res = await webSearch(q, { limit: SEARCH_RESULT_COUNT, gl: 'in', hl: 'en' });
      searchCalls += 1;
      organic = organic.concat(res.organic || []);
    } catch (err) {
      if (err.status === 402 || /insufficient credits/i.test(err.message || '')) throw err;
    }
  }
  organic = dedupeOrganic(organic).slice(0, 18);

  const emptyUsage = {
    inputTokens: 0,
    outputTokens: 0,
    costUsd: SEARLO_COST_PER_QUERY * searchCalls
  };

  if (!organic.length && !opts.writeup) {
    return { companies: [], usage: emptyUsage };
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
    costUsd: (usage?.costUsd || 0) + SEARLO_COST_PER_QUERY * searchCalls
  };

  const parsed = extractJson(text);
  const companies = [];
  const seen = new Set();
  const push = (c) => {
    if (!c || seen.has(c.companySlug)) return;
    seen.add(c.companySlug);
    companies.push(c);
  };

  if (parsed && parsed.found && Array.isArray(parsed.companies)) {
    for (const raw of parsed.companies) {
      push(normalizeCompany(raw));
      if (companies.length >= MAX_COMPANIES_NEWS) break;
    }
  }
  for (const c of companiesFromWriteup(opts.writeup)) {
    push(c);
    if (companies.length >= MAX_COMPANIES_NEWS) break;
  }

  return { companies, usage: fullUsage };
}

/**
 * Returns { companies, usage, source } — companies is an array (possibly empty).
 * opts.website: fund website — scraped FIRST for the official portfolio.
 * opts.writeup: profile text used only in the news/writeup fallback path.
 * opts.skipNews: if true, do not fall back to Searlo/news (site-only pass).
 */
async function lookupInvestorPortfolio(investorName, opts = {}) {
  const usage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  let companies = [];
  let source = null;

  // 1) Website portfolio page — primary source of truth for names + logos.
  if (opts.website) {
    try {
      const site = await scrapeInvestorPortfolioSite(opts.website);
      if (site.companies && site.companies.length) {
        companies = site.companies.slice(0, MAX_COMPANIES_SITE);
        source = site.method || 'site_scrape';
      }
    } catch (err) {
      // Site failures should not block the news fallback.
      if (err.status === 402 || /insufficient credits|prepayment|GEMINI_API_KEY/i.test(err.message || '')) {
        // Only rethrow hard Gemini/billing errors if we have nothing else to try.
        if (opts.skipNews) throw err;
      }
    }
  }

  // 2) News/articles fallback — used when site has nothing, OR to enrich
  //    amount/stage/date onto a thin site list (merge by companySlug in store).
  const needNews = !opts.skipNews && companies.length < 3;
  if (needNews) {
    const news = await lookupFromNews(investorName, opts);
    usage.inputTokens += news.usage.inputTokens || 0;
    usage.outputTokens += news.usage.outputTokens || 0;
    usage.costUsd += news.usage.costUsd || 0;

    if (!companies.length) {
      companies = news.companies;
      source = news.companies.length ? 'web_search' : source;
    } else {
      // Merge news details onto site names (news wins on amount/date/source).
      const bySlug = new Map(companies.map((c) => [c.companySlug, { ...c }]));
      for (const n of news.companies) {
        const prev = bySlug.get(n.companySlug);
        if (!prev) {
          if (bySlug.size < MAX_COMPANIES_SITE) bySlug.set(n.companySlug, n);
          continue;
        }
        bySlug.set(n.companySlug, {
          ...prev,
          amount: n.amount || prev.amount,
          stage: n.stage || prev.stage,
          date: n.date || prev.date,
          highlight: n.highlight || prev.highlight,
          sourceUrl: n.sourceUrl || prev.sourceUrl,
          sourceTitle: n.sourceTitle || prev.sourceTitle,
          website: prev.website || n.website,
          logoUrl: prev.logoUrl || n.logoUrl,
          sector: prev.sector || n.sector
        });
      }
      companies = [...bySlug.values()];
      source = source || 'web_search';
    }
  } else if (!companies.length && opts.writeup) {
    companies = companiesFromWriteup(opts.writeup);
    if (companies.length) source = 'profile_writeup';
  }

  companies.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da || a.name.localeCompare(b.name);
  });

  return { companies, usage, source };
}

module.exports = {
  lookupInvestorPortfolio,
  slugifyCompany,
  logoUrlForWebsite,
  companiesFromWriteup
};
