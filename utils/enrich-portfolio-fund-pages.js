/**
 * Enrich thin portfolio rows by fetching the fund's own company detail pages
 * (e.g. https://www.accel.com/companies/browserstack) for website, sector,
 * stage, and investment year.
 */
const { logoUrlForWebsite } = require('./investor-portfolio-websearch');

const UA =
  'Mozilla/5.0 (compatible; VCDekhoBot/1.0; +https://vcdekho.com) AppleWebKit/537.36';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function companyKey(c) {
  if (c && c.companySlug) return String(c.companySlug);
  return String((c && c.name) || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function originOf(website) {
  try {
    const u = new URL(website.startsWith('http') ? website : `https://${website}`);
    return u.origin;
  } catch (_) {
    return null;
  }
}

function fundHost(website) {
  try {
    return new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace(
      /^www\./,
      ''
    );
  } catch (_) {
    return null;
  }
}

/**
 * Resolve a fetchable fund company-detail URL for a portfolio row.
 */
function detailUrlForCompany(company, investorWebsite) {
  const src = company.sourceUrl || '';
  if (/\/companies\/[a-z0-9][a-z0-9-]+/i.test(src)) return src;

  const origin = originOf(investorWebsite);
  const slug = companyKey(company);
  if (!origin || !slug) return null;
  return `${origin}/companies/${slug}`;
}

function needsFundPageEnrichment(company) {
  if (!company || !company.name) return false;
  const hasWebsite = Boolean(company.website);
  const hasSector = Boolean(company.sector);
  const hasStage = company.stage && !/^unknown$/i.test(String(company.stage));
  const hasDate = Boolean(company.date);
  // Thin if missing website or (sector and stage/date).
  return !hasWebsite || (!hasSector && !hasStage && !hasDate);
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    redirect: 'follow'
  });
  if (!res.ok) return null;
  const ct = String(res.headers.get('content-type') || '');
  if (!/html/i.test(ct) && !ct.includes('text/')) return null;
  return await res.text();
}

function isSocialOrNoise(url) {
  return /(linkedin|twitter|x\.com|facebook|instagram|youtube|youtu\.be|google\.|sanity\.io|transcend|cookie|cdn\.|w3\.org)/i.test(
    url
  );
}

function extractWebsite(html, fundHostname) {
  // Accel-style: aria-label="Website" href="..."
  const aria = html.match(
    /aria-label=["']Website["'][^>]*href=["'](https?:\/\/[^"']+)["']/i
  ) || html.match(
    /href=["'](https?:\/\/[^"']+)["'][^>]*aria-label=["']Website["']/i
  );
  if (aria && aria[1] && !isSocialOrNoise(aria[1])) {
    try {
      const host = new URL(aria[1]).hostname.replace(/^www\./, '');
      if (host !== fundHostname) return aria[1].replace(/^http:\/\//i, 'https://');
    } catch (_) {
      /* ignore */
    }
  }

  // Peak XV / generic: external link near "Website" label
  const near = html.match(
    /Website[\s\S]{0,200}?href=["'](https?:\/\/[^"']+)["']/i
  );
  if (near && near[1] && !isSocialOrNoise(near[1])) {
    try {
      const host = new URL(near[1]).hostname.replace(/^www\./, '');
      if (host !== fundHostname) return near[1].replace(/^http:\/\//i, 'https://');
    } catch (_) {
      /* ignore */
    }
  }

  return null;
}

function extractFocusSector(html) {
  // Accel: Speciality / Focus then tag pills
  const focusBlock = html.match(
    />Focus<\/[^>]+>[\s\S]{0,800}?((?:<[^>]+>[^<]{2,40}<\/[^>]+>\s*){1,8})/i
  );
  if (focusBlock) {
    const tags = [...focusBlock[1].matchAll(/>([^<]{2,40})</g)]
      .map((m) => m[1].trim())
      .filter(
        (t) =>
          t &&
          !/^(focus|speciality|based in|early stage|late stage|partners|insights|portfolio)$/i.test(
            t
          )
      );
    if (tags.length) return tags.slice(0, 4).join(' / ');
  }

  // Generic category / sector meta
  const meta =
    html.match(/property=["']article:tag["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
  if (meta && meta[1]) {
    const parts = meta[1]
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) return parts.slice(0, 3).join(' / ');
  }
  return null;
}

function extractStageAndYear(html) {
  // Accel: Initial Investment → "series a" in "2018"
  const init = html.match(
    /Initial Investment[\s\S]{0,500}?(pre[-\s]?seed|seed|series\s*[a-f]|growth|ipo)[\s\S]{0,80}?((?:19|20)\d{2})/i
  );
  if (init) {
    let stage = init[1].replace(/\s+/g, ' ').trim();
    stage = stage.replace(/^series\s*([a-f])$/i, (_, l) => 'Series ' + l.toUpperCase());
    stage = stage.replace(/^seed$/i, 'Seed').replace(/^pre[-\s]?seed$/i, 'Pre-Seed');
    const year = init[2];
    return { stage, date: `${year}-01-01` };
  }

  const yearOnly = html.match(
    /Initial Investment[\s\S]{0,300}?((?:19|20)\d{2})/i
  );
  if (yearOnly) return { stage: null, date: `${yearOnly[1]}-01-01` };

  return { stage: null, date: null };
}

function parseFundCompanyPage(html, pageUrl, fundHostname) {
  if (!html) return null;
  const website = extractWebsite(html, fundHostname);
  const sector = extractFocusSector(html);
  const { stage, date } = extractStageAndYear(html);
  if (!website && !sector && !stage && !date) return null;
  return {
    website,
    logoUrl: website ? logoUrlForWebsite(website) : null,
    sector,
    stage,
    date,
    sourceUrl: pageUrl,
    sourceTitle: 'Company page',
    sourceMethod: 'fund_page_enrich'
  };
}

/**
 * Enrich one company by fetching its fund detail page.
 */
async function enrichCompanyFromFundPage(company, investorWebsite) {
  const detailUrl = detailUrlForCompany(company, investorWebsite);
  if (!detailUrl) return { company, updated: false };
  const host = fundHost(investorWebsite) || fundHost(detailUrl);
  const html = await fetchHtml(detailUrl);
  const parsed = parseFundCompanyPage(html, detailUrl, host);
  if (!parsed) {
    // Still upgrade sourceUrl to the detail page when we can resolve it.
    if (detailUrl !== company.sourceUrl) {
      return {
        company: {
          ...company,
          sourceUrl: detailUrl,
          sourceTitle: company.sourceTitle || 'Company page'
        },
        updated: true
      };
    }
    return { company, updated: false };
  }

  const next = { ...company };
  let changed = false;
  for (const [k, v] of Object.entries(parsed)) {
    if (v == null || v === '') continue;
    if (!next[k] || (k === 'stage' && /^unknown$/i.test(String(next[k])))) {
      next[k] = v;
      changed = true;
    }
  }
  // Prefer real company website logo when we just found the site.
  if (parsed.website && parsed.logoUrl && (!company.website || !company.logoUrl)) {
    if (!next.logoUrl || /accel\.com|peakxv\.com|sanity\.io/i.test(String(next.logoUrl))) {
      // Keep scraped fund logo if present; only fill favicon when missing.
      if (!next.logoUrl) next.logoUrl = parsed.logoUrl;
    }
  }
  if (detailUrl && detailUrl !== next.sourceUrl) {
    next.sourceUrl = detailUrl;
    next.sourceTitle = 'Company page';
    changed = true;
  }
  return { company: next, updated: changed };
}

/**
 * Enrich a list of companies (mutates via returned new array).
 */
async function enrichCompaniesFromFundPages(companies, investorWebsite, opts = {}) {
  const concurrency = opts.concurrency || 4;
  const delayMs = opts.delayMs || 120;
  const onlyThin = opts.onlyThin !== false;
  const list = [...(companies || [])];
  const targets = list
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => (onlyThin ? needsFundPageEnrichment(c) : true));

  let updated = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < targets.length) {
      const idx = cursor++;
      const { c, i } = targets[idx];
      try {
        const result = await enrichCompanyFromFundPage(c, investorWebsite);
        if (result.updated) {
          list[i] = result.company;
          updated += 1;
        }
      } catch (_) {
        /* skip */
      }
      if (delayMs) await sleep(delayMs);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, targets.length || 1) }, () =>
    worker()
  );
  await Promise.all(workers);
  return { companies: list, updated, checked: targets.length };
}

module.exports = {
  detailUrlForCompany,
  needsFundPageEnrichment,
  parseFundCompanyPage,
  enrichCompanyFromFundPage,
  enrichCompaniesFromFundPages
};
