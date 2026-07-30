/**
 * Website-first portfolio extraction.
 *
 * Flow:
 *   1. Fetch the investor's homepage
 *   2. Discover a portfolio/companies URL (nav links or common paths)
 *   3. Extract companies from that page:
 *      - embedded JSON arrays (e.g. 100Unicorns)
 *      - /companies/<slug> link grids (e.g. Peak XV)
 *      - logo <img> grids with alt text
 *      - Gemini on cleaned page text as a last site-side fallback
 *
 * Returns the same company shape as investor-portfolio-websearch.js so the
 * store can merge results. sourceMethod = 'site_scrape'.
 */
const { generateText } = require('./gemini');

const FETCH_TIMEOUT_MS = 12000;

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
    const host = new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace(
      /^www\./,
      ''
    );
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch (_) {
    return null;
  }
}
const MAX_HTML_BYTES = 1_500_000;
const PORTFOLIO_PATHS = [
  '/portfolio',
  '/companies',
  '/our-companies',
  '/investments',
  '/portfolio-companies',
  '/our-portfolio',
  '/portfolio/',
  '/companies/',
  '/invested-companies'
];

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'VCDekhoPortfolioBot/1.0 (+https://vcdekho.com)',
        Accept: 'text/html,application/xhtml+xml'
      }
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_HTML_BYTES) return buf.slice(0, MAX_HTML_BYTES).toString('utf8');
    return buf.toString('utf8');
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function originOf(website) {
  try {
    const u = new URL(website.startsWith('http') ? website : `https://${website}`);
    return u.origin;
  } catch (_) {
    return null;
  }
}

function absolutize(base, maybeUrl) {
  if (!maybeUrl) return null;
  try {
    return new URL(maybeUrl, base).toString();
  } catch (_) {
    return null;
  }
}

function scorePortfolioHref(href, text) {
  const h = String(href || '').toLowerCase();
  const t = String(text || '').toLowerCase();
  let score = 0;
  if (/portfolio|our-companies|investments|companies/.test(h)) score += 3;
  if (/portfolio|companies|investments/.test(t)) score += 2;
  if (/blog|news|career|job|team|about|contact|login|privacy/.test(h)) score -= 5;
  return score;
}

function discoverPortfolioUrls(origin, homeHtml) {
  const found = [];
  const linkRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(homeHtml || ''))) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const abs = absolutize(origin, href);
    if (!abs || !abs.startsWith(origin)) continue;
    const score = scorePortfolioHref(abs, text);
    if (score >= 2) found.push({ url: abs, score });
  }
  for (const path of PORTFOLIO_PATHS) {
    found.push({ url: origin + path, score: 1 });
  }
  // Dedupe, highest score first.
  const byUrl = new Map();
  for (const f of found) {
    const prev = byUrl.get(f.url);
    if (!prev || f.score > prev.score) byUrl.set(f.url, f);
  }
  return [...byUrl.values()].sort((a, b) => b.score - a.score).slice(0, 6);
}

function normalizeSiteCompany(raw, pageUrl) {
  const name = String((raw && raw.name) || '').trim();
  if (!name || name.length < 2 || name.length > 80) return null;
  if (/^(logo|home|menu|next|prev|all|filter)$/i.test(name)) return null;

  let website = raw.website ? String(raw.website).trim() : null;
  if (website && !/^https?:\/\//i.test(website)) website = 'https://' + website;
  if (website && website.length > 300) website = null;

  let logoUrl = raw.logoUrl || raw.image || raw.logo || null;
  if (logoUrl) logoUrl = absolutize(pageUrl, logoUrl);
  if (!logoUrl && website) logoUrl = logoUrlForWebsite(website);

  // Site "stage" fields are often valuation bands / status — only keep if they
  // look like a funding round label.
  let stage = raw.stage ? String(raw.stage).trim() : null;
  if (stage && !/^(pre[-\s]?seed|seed|series\s*[a-f]|angel|bridge|debt|growth|ipo|exit)/i.test(stage)) {
    stage = null;
  }

  return {
    name,
    companySlug: slugifyCompany(name),
    website,
    logoUrl,
    amount: raw.amount || null,
    stage,
    investmentType: null,
    sector: raw.sector ? String(raw.sector).trim() : null,
    date: null,
    highlight: null,
    sourceUrl: pageUrl,
    sourceTitle: 'Portfolio page',
    sourceMethod: 'site_scrape'
  };
}

/**
 * Extract objects from JS-looking arrays that have a "name" field.
 * Tolerates comments and trailing commas better than JSON.parse alone.
 */
function extractJsonishCompanies(html, pageUrl) {
  const companies = [];
  const seen = new Set();
  // Find array starts that look like portfolio data.
  const re = /\[\s*\{[\s\S]{20,500000}?\}[\s\S]{0,200}?\]/g;
  let m;
  while ((m = re.exec(html))) {
    let chunk = m[0]
      .replace(/\/\/[^\n\r]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/(\{|,)\s*(\w+)\s*:/g, '$1"$2":') // bare keys → "keys"
      .replace(/'/g, '"');
    // Only keep if it looks like company objects.
    if (!/"name"\s*:/.test(chunk)) continue;
    try {
      const arr = JSON.parse(chunk);
      if (!Array.isArray(arr) || arr.length < 3) continue;
      const withName = arr.filter((x) => x && typeof x === 'object' && x.name);
      if (withName.length < 3) continue;
      // Prefer arrays that also have image/website — portfolio signal.
      const rich = withName.filter((x) => x.image || x.logo || x.website || x.url || x.link);
      const pick = rich.length >= 3 ? rich : withName;
      for (const raw of pick) {
        const c = normalizeSiteCompany(
          {
            name: raw.name,
            website: raw.website || raw.url || raw.link || null,
            image: raw.image || raw.logo || raw.logoUrl || raw.img || null,
            sector: raw.sector || raw.category || null,
            stage: raw.stage || raw.round || null,
            amount: raw.amount || raw.funding || null
          },
          pageUrl
        );
        if (!c || seen.has(c.companySlug)) continue;
        seen.add(c.companySlug);
        companies.push(c);
      }
      if (companies.length >= 8) break;
    } catch (_) {
      /* try next chunk */
    }
  }
  return companies;
}

function extractCompanyPathLinks(html, pageUrl) {
  const origin = originOf(pageUrl);
  if (!origin) return [];
  const companies = [];
  const seen = new Set();
  const re = /<a\b[^>]*href=["']([^"']*\/companies\/([a-z0-9][a-z0-9-]+))["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = absolutize(pageUrl, m[1]);
    const slug = m[2];
    const inner = m[3];
    if (/logo-hover|hover|filter|all-companies/i.test(href || '')) continue;
    let name =
      (inner.match(/alt=["']([^"']+)["']/i) || [])[1] ||
      inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ||
      slug.replace(/-/g, ' ');
    name = name.replace(/\s+logo$/i, '').trim();
    // Title-case slug fallback
    if (name === slug.replace(/-/g, ' ')) {
      name = slug
        .split('-')
        .filter((p) => p && p !== 'formerly')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
    }
    const img = (inner.match(/src=["']([^"']+)["']/i) || [])[1];
    const c = normalizeSiteCompany(
      { name, website: href, image: img ? absolutize(pageUrl, img) : null },
      pageUrl
    );
    if (!c || seen.has(c.companySlug)) continue;
    // Skip generic nav labels
    if (/^(companies|our companies|portfolio|view all)$/i.test(c.name)) continue;
    seen.add(c.companySlug);
    companies.push(c);
  }
  return companies;
}

function extractLogoGrid(html, pageUrl) {
  const companies = [];
  const seen = new Set();
  const re =
    /<img\b[^>]*(?:alt=["']([^"']+)["'][^>]*src=["']([^"']+)["']|src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'])[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const alt = (m[1] || m[4] || '').trim();
    const src = m[2] || m[3];
    if (!alt || alt.length < 2 || alt.length > 60) continue;
    if (!src) continue;
    const srcL = src.toLowerCase();
    if (!/(logo|portfolio|company|brand|main-logo)/i.test(srcL) && !/\/logo\//i.test(srcL)) continue;
    if (/white-logo|favicon|icon-|sprite|placeholder/i.test(srcL)) continue;
    if (/^(logo|home|menu|facebook|twitter|linkedin|instagram)$/i.test(alt)) continue;
    const name = alt.replace(/\s+logo$/i, '').trim();
    const c = normalizeSiteCompany({ name, image: absolutize(pageUrl, src) }, pageUrl);
    if (!c || seen.has(c.companySlug)) continue;
    seen.add(c.companySlug);
    companies.push(c);
  }
  return companies;
}

function stripHtmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

async function extractWithGemini(html, pageUrl) {
  const text = stripHtmlToText(html);
  if (text.length < 200) return [];
  try {
    const { text: out } = await generateText({
      system: `Extract portfolio companies from this VC fund webpage text. Return JSON only:
{"companies":[{"name":"...","website":null,"logo_hint":null,"sector":null}]}
Include as many distinct portfolio startups as clearly listed (up to 40). Skip the fund itself, team members, and nav labels.`,
      user: `Page URL: ${pageUrl}\n\nText:\n${text}`,
      maxOutputTokens: 2000,
      jsonMode: true
    });
    let parsed;
    try {
      parsed = JSON.parse(out);
    } catch (_) {
      const start = out.indexOf('{');
      const end = out.lastIndexOf('}');
      parsed = start >= 0 ? JSON.parse(out.slice(start, end + 1)) : null;
    }
    if (!parsed || !Array.isArray(parsed.companies)) return [];
    const companies = [];
    const seen = new Set();
    for (const raw of parsed.companies) {
      const c = normalizeSiteCompany(
        { name: raw.name, website: raw.website, sector: raw.sector },
        pageUrl
      );
      if (!c || seen.has(c.companySlug)) continue;
      seen.add(c.companySlug);
      companies.push(c);
    }
    return companies;
  } catch (_) {
    return [];
  }
}

function pickBestExtraction(candidates) {
  // Prefer the richest, largest extraction.
  return [...candidates]
    .filter((arr) => arr && arr.length)
    .sort((a, b) => {
      const rich = (arr) => arr.filter((c) => c.logoUrl || c.website).length;
      return rich(b) - rich(a) || b.length - a.length;
    })[0] || [];
}

/**
 * @returns {Promise<{ companies: array, portfolioUrl: string|null, method: string|null }>}
 */
async function scrapeInvestorPortfolioSite(website) {
  const origin = originOf(website);
  if (!origin) return { companies: [], portfolioUrl: null, method: null };

  const homeUrl = origin + '/';
  const homeHtml = await fetchText(homeUrl);
  const candidates = homeHtml ? discoverPortfolioUrls(origin, homeHtml) : PORTFOLIO_PATHS.map((p) => ({ url: origin + p, score: 1 }));

  // Always try homepage itself too (some funds list logos on home).
  const pagesToTry = [{ url: homeUrl, score: 0 }, ...candidates];
  const tried = new Set();

  for (const page of pagesToTry) {
    if (tried.has(page.url)) continue;
    tried.add(page.url);
    const html = page.url === homeUrl && homeHtml ? homeHtml : await fetchText(page.url);
    if (!html || html.length < 500) continue;

    const jsonish = extractJsonishCompanies(html, page.url);
    const pathLinks = extractCompanyPathLinks(html, page.url);
    const logos = extractLogoGrid(html, page.url);

    let best = pickBestExtraction([jsonish, pathLinks, logos]);

    // If structural parsers found little, ask Gemini on this page once.
    if (best.length < 3 && (page.score >= 2 || /portfolio|companies|investments/i.test(page.url))) {
      const geminiOnes = await extractWithGemini(html, page.url);
      best = pickBestExtraction([best, geminiOnes]);
    }

    if (best.length >= 3 || (best.length >= 1 && page.score >= 3)) {
      const method = jsonish.length >= best.length * 0.7
        ? 'site_json'
        : pathLinks.length >= best.length * 0.7
          ? 'site_paths'
          : logos.length >= best.length * 0.7
            ? 'site_logos'
            : 'site_gemini';
      return { companies: best.slice(0, 60), portfolioUrl: page.url, method };
    }
  }

  return { companies: [], portfolioUrl: null, method: null };
}

module.exports = {
  scrapeInvestorPortfolioSite,
  discoverPortfolioUrls,
  extractJsonishCompanies,
  extractCompanyPathLinks,
  extractLogoGrid
};
