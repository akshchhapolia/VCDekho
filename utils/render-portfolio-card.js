/**
 * Shared portfolio company card markup (investor + people firm sections).
 */

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isBlankPortfolioLabel(value) {
  const v = String(value || '').trim().toLowerCase();
  return (
    !v ||
    v === 'unknown' ||
    v === 'listed in profile' ||
    v === 'n/a' ||
    v === 'null' ||
    v === 'portfolio company' ||
    v === 'notable investment' ||
    v === 'defining win' ||
    /^fund\s+.+\s+portfolio$/i.test(v) ||
    /^listed in /i.test(v)
  );
}

function formatPortfolioDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (_) {
    return '';
  }
}

function websiteHostLabel(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '');
    if (!host || /accel\.com|peakxv\.com|sequoiacap\.com|blume\.vc$/i.test(host)) return '';
    return host;
  } catch (_) {
    return '';
  }
}

function portfolioLogoHtml(c) {
  const initial = escapeHtml((c.name || '?').charAt(0).toUpperCase());
  const fallback =
    '<span class="inv-profile-portfolio-logo is-fallback" aria-hidden="true">' + initial + '</span>';
  if (!c.logoUrl) {
    return (
      '<span class="inv-profile-portfolio-logo is-fallback is-visible" aria-hidden="true">' +
      initial +
      '</span>'
    );
  }
  return (
    '<img class="inv-profile-portfolio-logo" src="' +
    escapeHtml(c.logoUrl) +
    '" alt="" width="32" height="32" loading="lazy" decoding="async" onerror="this.classList.add(\'is-broken\')">' +
    fallback
  );
}

/**
 * Logo + copy block for a portfolio card.
 * Layout: name | sector (row 1), round | date (row 2), website (row 3).
 */
function portfolioCardBodyHtml(c, opts = {}) {
  const includeInvestmentType = opts.includeInvestmentType !== false;
  const logo = portfolioLogoHtml(c);

  const stage = !isBlankPortfolioLabel(c.stage) ? c.stage : null;
  const amount = !isBlankPortfolioLabel(c.amount) ? c.amount : null;
  const investmentType =
    includeInvestmentType && !isBlankPortfolioLabel(c.investmentType) ? c.investmentType : null;

  const metaBits = [amount, stage, investmentType]
    .filter(Boolean)
    .map((bit) => '<span>' + escapeHtml(bit) + '</span>');
  const meta = metaBits.length
    ? '<div class="inv-profile-portfolio-meta">' +
      metaBits.join('<span class="inv-profile-portfolio-dot" aria-hidden="true">·</span>') +
      '</div>'
    : '<div class="inv-profile-portfolio-meta"></div>';

  const sector = c.sector
    ? '<div class="inv-profile-portfolio-sector">' + escapeHtml(c.sector) + '</div>'
    : '<div class="inv-profile-portfolio-sector"></div>';

  const dateLabel = c.date ? formatPortfolioDate(c.date) : '';
  const date = dateLabel
    ? '<div class="inv-profile-portfolio-date">' + escapeHtml(dateLabel) + '</div>'
    : '<div class="inv-profile-portfolio-date"></div>';

  const siteHost = websiteHostLabel(c.website);
  const site = siteHost
    ? '<div class="inv-profile-portfolio-site">' + escapeHtml(siteHost) + '</div>'
    : '';

  return (
    logo +
    '<div class="inv-profile-portfolio-copy">' +
    '<div class="inv-profile-portfolio-row">' +
    '<div class="inv-profile-portfolio-name">' +
    escapeHtml(c.name) +
    '</div>' +
    sector +
    '</div>' +
    '<div class="inv-profile-portfolio-row">' +
    meta +
    date +
    '</div>' +
    site +
    '</div>'
  );
}

module.exports = {
  escapeHtml,
  isBlankPortfolioLabel,
  formatPortfolioDate,
  websiteHostLabel,
  portfolioLogoHtml,
  portfolioCardBodyHtml
};
