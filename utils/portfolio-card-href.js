/**
 * Resolve a user-facing link for a portfolio company card.
 * Startup websites only — never fund-internal /companies/* pages (often broken or wrong target).
 */

function investorHost(investorWebsite) {
  if (!investorWebsite) return null;
  try {
    const url = investorWebsite.startsWith('http') ? investorWebsite : `https://${investorWebsite}`;
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch (_) {
    return null;
  }
}

function urlHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch (_) {
    return null;
  }
}

function isFundPortfolioDetailUrl(url, investorWebsite) {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!/\/(companies|portfolio|investments|startups)\/[a-z0-9][\w-]*/i.test(u.pathname)) {
      return false;
    }
    const fundHost = investorHost(investorWebsite);
    const host = urlHost(url);
    if (fundHost && host === fundHost) return true;
    // Same-origin relative paths stored without full URL are rare; treat any /companies/slug on fund host as internal.
    return Boolean(fundHost && host && host.endsWith(fundHost.split('.').slice(-2).join('.')));
  } catch (_) {
    return false;
  }
}

function isUsableExternalSource(url, investorWebsite) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  if (isFundPortfolioDetailUrl(url, investorWebsite)) return false;
  // News / data sources are fine as a last resort when no startup site exists.
  return true;
}

/**
 * @param {object} company - portfolio row
 * @param {string|null} investorWebsite - fund homepage
 * @returns {string|null}
 */
function portfolioCardHref(company, investorWebsite) {
  const website = company && company.website ? String(company.website).trim() : '';
  if (website && /^https?:\/\//i.test(website)) {
    if (!isFundPortfolioDetailUrl(website, investorWebsite)) return website;
  }

  const source = company && company.sourceUrl ? String(company.sourceUrl).trim() : '';
  if (isUsableExternalSource(source, investorWebsite)) return source;

  return null;
}

module.exports = {
  portfolioCardHref,
  isFundPortfolioDetailUrl,
  investorHost
};
