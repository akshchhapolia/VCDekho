/**
 * For global funds (Active India cheque / India practice), keep only
 * India-domiciled or India-primary portfolio companies on firm pages.
 */

const GLOBAL_INDIA_TAGS = new Set([
  'active india cheque',
  'india practice (global)',
  'india fund'
]);

const INDIA_HINT =
  /\b(india|indian|bharat|bengaluru|bangalore|mumbai|delhi|gurugram|gurgaon|hyderabad|chennai|pune|noida|kolkata|\.in\b|fintech india|saas india)\b/i;

const KNOWN_INDIA_SLUGS = new Set([
  'oyo',
  'udaan',
  'sharechat',
  'meesho',
  'byju',
  'byjus',
  'razorpay',
  'coinswitch',
  'coinswitch-kuber',
  'plutus',
  'synaptic',
  'fundsindia',
  'rupeek',
  'kuku-fm',
  'kuku',
  'bzaar',
  'freehand',
  'naaptol',
  'bharatmatrimony',
  'bharat-matrimony',
  'chakpak',
  'mcarbon',
  'cartrade',
  'innovaccer',
  'unacademy'
]);

function companySlugOf(c) {
  if (c && c.companySlug) return String(c.companySlug).toLowerCase();
  return String((c && c.name) || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shouldFilterPortfolioToIndia(investor) {
  const tag = String((investor && investor.indiaRelevance) || '')
    .trim()
    .toLowerCase();
  return GLOBAL_INDIA_TAGS.has(tag);
}

function isIndiaRelevantPortfolioCompany(c) {
  if (!c || !c.name) return false;
  const slug = companySlugOf(c);
  if (KNOWN_INDIA_SLUGS.has(slug)) return true;
  if (KNOWN_INDIA_SLUGS.has(slug.replace(/-s$/, ''))) return true;

  const hay = [
    c.name,
    c.companySlug,
    c.description,
    c.sector,
    c.location,
    c.country,
    c.hqCountry,
    c.hq,
    c.city,
    c.website,
    c.sourceUrl,
    c.highlight
  ]
    .filter(Boolean)
    .join(' ');

  if (INDIA_HINT.test(hay)) return true;

  // Explicit country codes when present
  const country = String(c.country || c.hqCountry || '').toUpperCase();
  if (country === 'IN' || country === 'IND' || country === 'INDIA') return true;

  return false;
}

function filterPortfolioIndiaRelevant(companies) {
  return (companies || []).filter(isIndiaRelevantPortfolioCompany);
}

/**
 * Apply junk filter, then India filter when the investor is a global India fund.
 */
function filterPortfolioForDisplay(investor, junkFilterFn) {
  const junkFiltered = junkFilterFn
    ? junkFilterFn(investor.portfolioCompanies || [])
    : investor.portfolioCompanies || [];
  if (!shouldFilterPortfolioToIndia(investor)) return junkFiltered;
  return filterPortfolioIndiaRelevant(junkFiltered);
}

module.exports = {
  shouldFilterPortfolioToIndia,
  isIndiaRelevantPortfolioCompany,
  filterPortfolioIndiaRelevant,
  filterPortfolioForDisplay,
  KNOWN_INDIA_SLUGS
};
