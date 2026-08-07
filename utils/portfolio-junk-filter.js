/**
 * Drop nav links, CMS assets, and marketing copy mistaken for portfolio companies.
 */

const NAV_SLUGS = new Set([
  'about',
  'about-us',
  'apply',
  'apply-now',
  'blog',
  'careers',
  'companies',
  'contact',
  'contact-us',
  'faq',
  'founders',
  'founders-hub',
  'home',
  'investor-hub',
  'isafe',
  'i-safe',
  'legal',
  'moonshots',
  'network',
  'news',
  'news-and-views',
  'partners',
  'portfolio',
  'privacy',
  'privacy-policy',
  'team',
  'terms',
  'the-100x-team'
]);

const NAV_LABELS = new Set([
  'about us',
  'apply',
  'apply now',
  'blog',
  'careers',
  'companies',
  'contact us',
  'contact',
  'faq',
  'founders',
  'founders hub',
  'home',
  'investor hub',
  'india safe notes',
  'isafe',
  'i safe',
  'legal',
  'moonshots',
  'network',
  'news',
  'news and views',
  'partners',
  'portfolio',
  'privacy',
  'privacy policy',
  'team',
  'terms',
  'the 100x team',
  'connect, learn, and create value together.'
]);

function companySlugOf(c) {
  if (c && c.companySlug) return String(c.companySlug).toLowerCase();
  return String((c && c.name) || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isPortfolioNavSlug(slug) {
  return NAV_SLUGS.has(String(slug || '').toLowerCase());
}

function isPortfolioNavLabel(name) {
  return NAV_LABELS.has(String(name || '').trim().toLowerCase());
}

function isJunkPortfolioName(name) {
  const n = String(name || '').trim();
  if (!n || n.length < 2 || n.length > 60) return true;
  if (isPortfolioNavLabel(n)) return true;
  if (
    /^(logo|home|menu|next|prev|all|filter|image|icon|banner|preview|blume|white|dark|client)$/i.test(
      n
    )
  ) {
    return true;
  }
  if (/^(name|email|phone|message|subject|company|first name|last name)\s*\d*$/i.test(n)) {
    return true;
  }
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
  if (/^[a-f0-9]{6,}(\s+[a-f0-9]{2,}){2,}$/i.test(n)) return true;
  const tokens = n.split(/\s+/);
  if (tokens.length >= 4 && tokens.filter((t) => t.length <= 3).length >= 3) return true;
  if (tokens.length >= 5 && tokens.every((t) => t.length <= 4)) return true;
  // Marketing sentences, not company names.
  if (/[.!?]$/.test(n) && n.split(/\s+/).length >= 4) return true;
  if (/\b(together|learn|create value|connect)\b/i.test(n) && n.split(/\s+/).length >= 4) {
    return true;
  }
  if (/^the \d+x team$/i.test(n)) return true;
  if (/^india safe notes?$/i.test(n)) return true;
  return false;
}

function isFooterLinkShape(raw) {
  if (!raw || typeof raw !== 'object') return false;
  const url = raw.url != null ? String(raw.url).trim() : '';
  if (!url || !/^\/[a-z0-9-]+$/i.test(url)) return false;
  if (raw.description || raw.organization || raw.image || raw.website || raw.logoUrl) return false;
  return true;
}

function isJunkPortfolioCompany(c) {
  if (!c || !c.name) return true;
  const slug = companySlugOf(c);
  if (isPortfolioNavSlug(slug)) return true;
  if (isJunkPortfolioName(c.name)) return true;

  try {
    const src = String(c.sourceUrl || '');
    const pathMatch = src.match(/\/companies\/([a-z0-9-]+)/i);
    if (pathMatch && isPortfolioNavSlug(pathMatch[1])) return true;
  } catch (_) {
    /* ignore */
  }

  return false;
}

function filterPortfolioJunk(companies) {
  const seen = new Set();
  const out = [];
  for (const c of companies || []) {
    if (isJunkPortfolioCompany(c)) continue;
    const slug = companySlugOf(c);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(c);
  }
  return out;
}

module.exports = {
  NAV_SLUGS,
  NAV_LABELS,
  isPortfolioNavSlug,
  isPortfolioNavLabel,
  isJunkPortfolioName,
  isFooterLinkShape,
  isJunkPortfolioCompany,
  filterPortfolioJunk
};
