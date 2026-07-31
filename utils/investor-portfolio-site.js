/**
 * Website-first portfolio extraction.
 *
 * Flow:
 *   1. Fetch the investor's homepage
 *   2. Discover a portfolio/companies URL (nav links or common paths)
 *   3. Try every candidate page and keep the richest extraction:
 *      - embedded JS/JSON company arrays (e.g. 100Unicorns listData)
 *      - /companies/<slug> link grids (e.g. Peak XV)
 *      - logo <img> grids with real company alt text
 *      - Gemini on cleaned page text as a last site-side fallback
 *
 * Returns the same company shape as investor-portfolio-websearch.js.
 * sourceMethod = 'site_scrape'.
 */
const { generateText } = require('./gemini');

const FETCH_TIMEOUT_MS = 12000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_SITE_COMPANIES = 150;

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
    found.push({ url: origin + path, score: 2 });
  }
  const byUrl = new Map();
  for (const f of found) {
    const prev = byUrl.get(f.url);
    if (!prev || f.score > prev.score) byUrl.set(f.url, f);
  }
  return [...byUrl.values()].sort((a, b) => b.score - a.score).slice(0, 8);
}

function isJunkName(name) {
  const n = String(name || '').trim();
  if (!n || n.length < 2 || n.length > 60) return true;
  if (
    /^(logo|home|menu|next|prev|all|filter|image|icon|banner|preview|blume|white|dark|client)$/i.test(
      n
    )
  ) {
    return true;
  }
  if (/^(name|email|phone|message|subject|company|first name|last name)\s*\d*$/i.test(n)) return true;
  if (/^you are\b/i.test(n)) return true;
  if (/\|/.test(n)) return true;
  if (/portfolio\s*$/i.test(n) && n.length > 28) return true;
  if (/\.(png|jpe?g|gif|svg|webp)$/i.test(n)) return true;
  if (/^img[-_]?\d+$/i.test(n)) return true;
  if (/\d{3,}px/i.test(n)) return true;
  if (/funding|led by|secures|raises|series [a-d]\b|crore|million/i.test(n)) return true;
  if (/\b(logo|transparent|dark|white|final|preview)\b/i.test(n) && n.split(/\s+/).length > 3) {
    return true;
  }
  // UUID / asset-hash alts: "Ce9c689e f24d 4705 a10d f1ef65a42801"
  if (/^[a-f0-9]{6,}(\s+[a-f0-9]{2,}){2,}$/i.test(n)) return true;
  // Broken token soup: "Ru C Ea4 PZ", "1 KNL yn C Qd..."
  const tokens = n.split(/\s+/);
  if (tokens.length >= 4 && tokens.filter((t) => t.length <= 3).length >= 3) return true;
  if (tokens.length >= 5 && tokens.every((t) => t.length <= 4)) return true;
  return false;
}

function normalizeSiteCompany(raw, pageUrl) {
  let name = String((raw && raw.name) || '')
    .replace(/\s+logo$/i, '')
    .trim();
  if (isJunkName(name)) return null;

  let website = raw.website ? String(raw.website).trim() : null;
  if (website && !/^https?:\/\//i.test(website)) website = 'https://' + website;
  if (website && website.length > 300) website = null;

  // Don't treat the fund's own /companies/<slug> pages as the startup website.
  try {
    if (website && pageUrl) {
      const pageHost = new URL(pageUrl).hostname.replace(/^www\./, '');
      const coHost = new URL(website).hostname.replace(/^www\./, '');
      if (pageHost === coHost && /\/companies\//i.test(website)) website = null;
    }
  } catch (_) {
    /* keep website */
  }

  let logoUrl = raw.logoUrl || raw.image || raw.logo || null;
  if (logoUrl) logoUrl = absolutize(pageUrl, logoUrl);
  if (!logoUrl && website) logoUrl = logoUrlForWebsite(website);

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

function extractBalancedArray(html, startIdx) {
  if (html[startIdx] !== '[') return null;
  let depth = 0;
  let inStr = false;
  let quote = null;
  let escaped = false;
  for (let i = startIdx; i < html.length && i < startIdx + 600000; i++) {
    const ch = html[i];
    if (inStr) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      quote = ch;
      continue;
    }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return html.slice(startIdx, i + 1);
    }
  }
  return null;
}

function parseJsArrayLiteral(chunk) {
  if (!chunk || chunk.length < 10) return null;

  // Try strict JSON first (with trailing-comma fix only — do NOT strip //
  // comments; that destroys http:// URLs inside string values).
  try {
    const asJson = chunk.replace(/,\s*([}\]])/g, '$1');
    const arr = JSON.parse(asJson);
    if (Array.isArray(arr)) return arr;
  } catch (_) {
    /* fall through */
  }

  // Many fund sites embed JS object literals that JSON.parse rejects
  // (smart quotes, unescaped apostrophes in desc, etc.). Evaluate as a
  // literal expression only.
  try {
    const arr = Function('"use strict"; return (' + chunk + ');')();
    if (Array.isArray(arr)) return arr;
  } catch (_) {
    return null;
  }
  return null;
}

function looksLikeCountryOrGeoList(arr) {
  const sample = (arr || []).filter((x) => x && typeof x === 'object').slice(0, 25);
  if (sample.length < 5) return false;
  const geoFields = sample.filter(
    (x) => x.phoneCode || x.countryCode || (typeof x.code === 'string' && /^[A-Z]{2}$/.test(x.code))
  ).length;
  if (geoFields >= 5) return true;
  const countryHits = sample.filter((x) =>
    /^(Afghanistan|Albania|Algeria|Andorra|Angola|Argentina|Australia|Austria|Belgium|Brazil|Canada|China|Denmark|France|Germany|India|Japan|United States|United Kingdom|Sweden|Switzerland|Singapore)/i.test(
      String(x.name || '')
    )
  ).length;
  return countryHits >= 5;
}

function looksLikePersonName(name) {
  const n = String(name || '').trim();
  // "Sudhir Kamath", "Ranganathan Srinivasan" — not "CityMall" / "Yellow Metal"
  return /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/.test(n);
}

function looksLikeFoundersArray(arr) {
  const sample = (arr || []).filter((x) => x && typeof x === 'object').slice(0, 15);
  if (sample.length < 5) return false;
  const withCompanyAndPerson = sample.filter(
    (x) => x.company && looksLikePersonName(x.name) && !looksLikePersonName(x.company)
  ).length;
  return withCompanyAndPerson >= 4;
}

function companiesFromRawArray(arr, pageUrl) {
  if (!Array.isArray(arr) || arr.length < 3) return [];
  if (looksLikeCountryOrGeoList(arr)) return [];
  if (looksLikeFoundersArray(arr)) return [];

  const withName = arr.filter((x) => x && typeof x === 'object' && (x.name || x.title || x.company));
  if (withName.length < 3) return [];

  // Prefer objects that look like portfolio rows (logo/site/sector), not bare name lists.
  const rich = withName.filter(
    (x) => x.image || x.logo || x.logoUrl || x.website || x.url || x.link || x.sector || x.stage
  );
  // Large bare name arrays are usually nav/geo/CMS junk — require richness.
  if (withName.length >= 20 && rich.length < Math.min(8, Math.floor(withName.length * 0.25))) {
    return [];
  }
  const pick = rich.length >= 3 ? rich : withName;
  const companies = [];
  const seen = new Set();
  for (const raw of pick) {
    // If row is founder-shaped (person name + company), use the company.
    let name = raw.name || raw.title || raw.company;
    if (raw.company && looksLikePersonName(raw.name) && !looksLikePersonName(raw.company)) {
      name = raw.company;
    }
    if (looksLikePersonName(name) && !raw.website && !raw.url) continue;

    const c = normalizeSiteCompany(
      {
        name,
        website: raw.website || raw.url || raw.link || null,
        image: raw.logo || raw.image || raw.logoUrl || raw.img || null,
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
  return companies;
}

/**
 * Extract portfolio company objects from embedded JS/JSON arrays.
 */
function extractJsonishCompanies(html, pageUrl) {
  const companies = [];
  const seen = new Set();

  function absorb(arr) {
    for (const c of companiesFromRawArray(arr, pageUrl)) {
      if (seen.has(c.companySlug)) continue;
      seen.add(c.companySlug);
      companies.push(c);
    }
  }

  // <script type="application/json"> blobs (e.g. WaterBridge wb-portfolio-data)
  const jsonScriptRe =
    /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = jsonScriptRe.exec(html))) {
    try {
      const data = JSON.parse(m[1]);
      const queues = [];
      if (Array.isArray(data)) queues.push(data);
      else if (data && typeof data === 'object') {
        for (const [key, val] of Object.entries(data)) {
          if (!Array.isArray(val)) continue;
          if (/founder|team|people|partner|employee/i.test(key)) continue;
          if (/portfolio|compan|invest|startup/i.test(key) || val.length >= 5) queues.push(val);
        }
      }
      for (const arr of queues) absorb(arr);
    } catch (_) {
      /* ignore */
    }
  }

  // Named portfolio arrays: const listData = [ ... ]
  const namedRe =
    /(?:const|let|var)\s+(listData|portfolio|portfolioCompanies|companies|portfolioData|companyList|investments)\s*=\s*\[/gi;
  while ((m = namedRe.exec(html))) {
    const start = m.index + m[0].length - 1;
    const chunk = extractBalancedArray(html, start);
    const arr = parseJsArrayLiteral(chunk);
    if (arr) absorb(arr);
  }

  // Anonymous arrays that look like company objects with a name field.
  if (companies.length < 8) {
    const hintRe = /\[\s*\{[\s\S]{0,400}?"(?:name|title|company)(?:Name)?"\s*:/gi;
    while ((m = hintRe.exec(html))) {
      // Skip founder/team arrays by nearby key labels.
      const nearby = html.slice(Math.max(0, m.index - 40), m.index + 20);
      if (/FOUNDERS|TEAM|PEOPLE|PARTNERS/i.test(nearby)) continue;
      const start = m.index;
      const chunk = extractBalancedArray(html, start);
      const arr = parseJsArrayLiteral(chunk);
      if (arr) absorb(arr);
      if (companies.length >= 40) break;
    }
  }

  return companies;
}

function extractCompanyPathLinks(html, pageUrl) {
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
    if (name === slug.replace(/-/g, ' ') || isJunkName(name)) {
      name = slug
        .split('-')
        .filter((p) => p && p !== 'formerly')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
    }
    const img = (inner.match(/src=["']([^"']+)["']/i) || [])[1];
    const imgAbs = img ? absolutize(pageUrl, img) : null;
    // Prefer logo-like images; skip hero/slider shots when possible.
    const logo =
      imgAbs && !/hero_|slider|banner|cover/i.test(imgAbs) ? imgAbs : imgAbs;
    const c = normalizeSiteCompany({ name, image: logo, url: href }, pageUrl);
    if (!c || seen.has(c.companySlug)) continue;
    if (/^(companies|our companies|portfolio|view all)$/i.test(c.name)) continue;
    // Keep the fund's company detail page as source (not as website — that is
    // stripped in normalizeSiteCompany when it matches the fund host).
    if (href) {
      c.sourceUrl = href;
      c.sourceTitle = 'Company page';
    }
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
    if (!src || isJunkName(alt)) continue;
    const srcL = src.toLowerCase();
    if (!/(logo|portfolio|company|brand|main-logo)/i.test(srcL) && !/\/logo\//i.test(srcL)) continue;
    if (/white-logo|favicon|icon-|sprite|placeholder|hero_|slider/i.test(srcL)) continue;
    const name = alt.replace(/\s+logo$/i, '').trim();
    if (isJunkName(name)) continue;
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

function scoreExtraction(arr, method) {
  if (!arr || !arr.length) return -1;
  const rich = arr.filter((c) => c.logoUrl || c.website).length;
  // Prefer structured portfolio data over noisy <img alt> grids.
  const methodBonus =
    method === 'site_json' ? 500 : method === 'site_paths' ? 300 : method === 'site_logos' ? 0 : 50;
  return arr.length * 2 + rich + methodBonus;
}

function filterOutFundSelf(companies, investorName) {
  if (!investorName || !companies.length) return companies;
  const fund = String(investorName)
    .toLowerCase()
    .replace(/\b(ventures|venture|capital|partners|partner|fund|llp|pvt|ltd|limited|india)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const fundCompact = fund.replace(/\s+/g, '');
  if (fundCompact.length < 3) return companies;
  return companies.filter((c) => {
    const n = String(c.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    const compact = n.replace(/\s+/g, '');
    if (compact === fundCompact) return false;
    if (n === String(investorName).toLowerCase()) return false;
    if (compact.startsWith(fundCompact) && /partners|ventures|capital|india|pvt|ltd/.test(n)) {
      return false;
    }
    return true;
  });
}

function isAcceptableSiteResult(companies, method) {
  const cos = companies || [];
  const rich = cos.filter((c) => c.logoUrl || c.website).length;
  if (method === 'site_json') return cos.length >= 8 || (cos.length >= 5 && rich >= 4);
  if (method === 'site_paths') return cos.length >= 5;
  if (method === 'site_logos') return cos.length >= 5 && rich >= 4;
  if (method === 'site_gemini') return cos.length >= 5;
  return cos.length >= 5 && rich >= 3;
}

/**
 * @param {string} website
 * @param {{ investorName?: string }} [opts]
 * @returns {Promise<{ companies: array, portfolioUrl: string|null, method: string|null }>}
 */
async function scrapeInvestorPortfolioSite(website, opts = {}) {
  const origin = originOf(website);
  if (!origin) return { companies: [], portfolioUrl: null, method: null };

  const homeUrl = origin + '/';
  const homeHtml = await fetchText(homeUrl);
  const candidates = homeHtml
    ? discoverPortfolioUrls(origin, homeHtml)
    : PORTFOLIO_PATHS.map((p) => ({ url: origin + p, score: 2 }));

  // Try portfolio-like pages first, then homepage (logos sometimes live on home).
  const pagesToTry = [...candidates, { url: homeUrl, score: 0 }];
  const tried = new Set();

  let bestResult = { companies: [], portfolioUrl: null, method: null, score: -1 };

  for (const page of pagesToTry) {
    if (tried.has(page.url)) continue;
    tried.add(page.url);
    const html = page.url === homeUrl && homeHtml ? homeHtml : await fetchText(page.url);
    if (!html || html.length < 500) continue;

    const jsonish = extractJsonishCompanies(html, page.url);
    const pathLinks = extractCompanyPathLinks(html, page.url);
    const logos = extractLogoGrid(html, page.url);

    // Structured extracts win when present — never let a larger junk logo
    // grid override a real portfolio JSON/path list.
    let best;
    let method;
    if (jsonish.length >= 8) {
      best = jsonish;
      method = 'site_json';
    } else if (pathLinks.length >= 8) {
      best = pathLinks;
      method = 'site_paths';
    } else {
      const ranked = [
        { arr: jsonish, method: 'site_json' },
        { arr: pathLinks, method: 'site_paths' },
        { arr: logos, method: 'site_logos' }
      ].sort((a, b) => scoreExtraction(b.arr, b.method) - scoreExtraction(a.arr, a.method));
      best = ranked[0].arr;
      method = ranked[0].method;
    }

    if (best.length < 3 && (page.score >= 2 || /portfolio|companies|investments/i.test(page.url))) {
      const geminiOnes = await extractWithGemini(html, page.url);
      if (scoreExtraction(geminiOnes, 'site_gemini') > scoreExtraction(best, method)) {
        best = geminiOnes;
        method = 'site_gemini';
      }
    }

    const cleaned = filterOutFundSelf(best, opts.investorName).slice(0, MAX_SITE_COMPANIES);
    const score = scoreExtraction(cleaned, method) + page.score;
    if (score > bestResult.score) {
      bestResult = {
        companies: cleaned,
        portfolioUrl: page.url,
        method,
        score
      };
    }

    // Strong official JSON/path portfolio — no need to keep hunting.
    if ((method === 'site_json' || method === 'site_paths') && cleaned.length >= 20) break;
  }

  const cos = bestResult.companies || [];
  if (!isAcceptableSiteResult(cos, bestResult.method)) {
    return { companies: [], portfolioUrl: null, method: null };
  }
  return {
    companies: cos,
    portfolioUrl: bestResult.portfolioUrl,
    method: bestResult.method
  };
}

module.exports = {
  scrapeInvestorPortfolioSite,
  discoverPortfolioUrls,
  extractJsonishCompanies,
  extractCompanyPathLinks,
  extractLogoGrid,
  MAX_SITE_COMPANIES
};
