/**
 * Firm-context sections for person profile pages only.
 * Joins person → investor via companySlug; keep all markup scoped with inv-person-firm-*.
 */
const { hasStageGuide, isActivelyDeploying, deriveRelatedStages } = require('./investors');
const { hasSectorGuide } = require('./sectors');
const { getAllStages } = require('./investment-stages');
const { getThesisThemeIconSvg } = require('./thesis-theme-icons');
const { renderExploreRelated } = require('./render-explore-related');
const { portfolioCardHref } = require('./portfolio-card-href');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatActivityDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) {
    return '';
  }
}

function firmAttribution(person, investor) {
  return (
    '<p class="inv-person-firm-attribution">' +
    'Data shown for <a href="/investors/' + escapeHtml(investor.slug) + '">' +
    escapeHtml(person.company || investor.name) +
    '</a> — the fund this person is mapped to in VC Dekho.' +
    '</p>'
  );
}

function firmFocusSection(person, investor) {
  if (!investor) return '';

  const stages = investor.stages || [];
  const stageIds = investor.stageIds || [];
  const sectors = investor.sectors || [];
  const sectorIds = investor.sectorIds || [];
  const themes = investor.thesisThemes || [];

  const stageChips = stages.map((label, i) => {
    const id = stageIds[i];
    if (hasStageGuide(id)) {
      return '<a class="inv-profile-chip inv-profile-chip-stage" href="/investors/stages/' + escapeHtml(id) + '">' + escapeHtml(label) + '</a>';
    }
    return '<span class="inv-profile-chip inv-profile-chip-stage">' + escapeHtml(label) + '</span>';
  }).join('') || '<span class="inv-profile-empty">No stages listed</span>';

  const sectorChips = sectors.map((label, i) => {
    const id = sectorIds[i];
    const href = hasSectorGuide(id)
      ? '/investors/sectors/' + encodeURIComponent(id)
      : id
        ? '/investors?sector=' + encodeURIComponent(id)
        : '';
    if (href) {
      return '<a class="inv-profile-chip inv-profile-chip-sector" href="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a>';
    }
    return '<span class="inv-profile-chip inv-profile-chip-sector">' + escapeHtml(label) + '</span>';
  }).join('') || '<span class="inv-profile-empty">No sectors listed</span>';

  const metrics = [
    { label: 'Ticket size', value: investor.chequeSize || 'Not listed', lead: true },
    { label: 'Stages', value: stages.length ? stages.join(' · ') : '—' },
    { label: 'Sectors', value: sectors.length ? String(sectors.length) + ' focus areas' : '—' },
    { label: 'Themes', value: themes.length ? String(themes.length) + ' mapped' : '—' }
  ].map((item) => {
    const inner =
      '<div class="inv-profile-metric-label">' + escapeHtml(item.label) + '</div>' +
      '<div class="inv-profile-metric-value">' + escapeHtml(item.value) + '</div>';
    const cls = 'inv-profile-metric' + (item.lead ? ' is-lead' : '');
    return '<div class="' + cls + '">' + inner + '</div>';
  }).join('');

  const activeBadge = isActivelyDeploying(investor)
    ? '<span class="inv-profile-active-badge inv-person-firm-active"><span class="inv-profile-active-dot" aria-hidden="true"></span>Actively deploying</span>'
    : '';

  return (
    '<section class="inv-profile-section inv-person-firm-section inv-profile-reveal" id="firm-focus">' +
    '<div class="inv-profile-section-label">02 — Firm focus</div>' +
    '<div class="inv-profile-section-head">' +
    '<h2>Where ' + escapeHtml(person.company || investor.name) + ' invests</h2>' +
    '<p>Stage, sector, and cheque signals from the linked fund profile.' + (activeBadge ? ' ' + activeBadge : '') + '</p>' +
    firmAttribution(person, investor) +
    '</div>' +
    '<div class="inv-profile-metric-strip inv-person-firm-metrics">' + metrics + '</div>' +
    '<div class="inv-profile-focus-panel">' +
    '<div class="inv-profile-focus-grid">' +
    '<div class="inv-profile-focus-col"><h3>Lead / invest stages</h3><div class="inv-profile-chip-row">' + stageChips + '</div></div>' +
    '<div class="inv-profile-focus-col"><h3>Sector focus</h3><div class="inv-profile-chip-row">' + sectorChips + '</div></div>' +
    '</div></div>' +
    '<a class="inv-profile-panel-link" href="/investors/' + escapeHtml(investor.slug) + '#focus">Full focus on firm profile →</a>' +
    '</section>'
  );
}

function firmThesisSection(person, investor) {
  if (!investor) return '';

  const labels = investor.thesisThemes || [];
  const ids = investor.thesisThemeIds || [];
  const thesisText = investor.thesis || '';
  if (!thesisText && !labels.length) return '';

  const chipsHtml = labels.map(function (label, i) {
    const id = ids[i];
    const href = id && id !== 'general' ? '/investors/themes/' + id : '';
    const cls = 'inv-profile-chip inv-profile-chip-thesis';
    const icon = getThesisThemeIconSvg(id || '', 'inv-profile-chip-icon');
    const inner = icon + '<span>' + escapeHtml(label) + '</span>';
    if (href) return '<a class="' + cls + '" href="' + escapeHtml(href) + '">' + inner + '</a>';
    return '<span class="' + cls + '">' + inner + '</span>';
  }).join('');

  const prose = thesisText
    ? '<p class="inv-person-firm-thesis-lead">' + escapeHtml(thesisText) + '</p>'
    : '';

  return (
    '<section class="inv-profile-section inv-person-firm-section inv-profile-reveal" id="firm-thesis">' +
    '<div class="inv-profile-section-label">03 — Firm thesis</div>' +
    '<div class="inv-profile-section-head">' +
    '<h2>Investment thesis at ' + escapeHtml(person.company || investor.name) + '</h2>' +
    '<p>How this fund is described in the VC Dekho directory.</p>' +
    '</div>' +
    prose +
    (chipsHtml ? '<div class="inv-profile-thesis-chips">' + chipsHtml + '</div>' : '') +
    '<a class="inv-profile-panel-link" href="/investors/' + escapeHtml(investor.slug) + '#thesis">Full thesis on firm profile →</a>' +
    '</section>'
  );
}

function firmActivitySection(person, investor, limit) {
  const checks = (investor.recentChecks || []).slice(0, limit || 5);
  if (!checks.length) return '';

  const rows = checks.map((c) => {
    const dateLabel = formatActivityDate(c.date);
    const highlight = escapeHtml(c.highlight || '');
    const sector = c.sector ? '<span class="inv-profile-activity-sector">' + escapeHtml(c.sector) + '</span>' : '';
    const inner =
      '<span class="inv-profile-activity-date">' + escapeHtml(dateLabel) + '</span>' +
      '<span class="inv-profile-activity-highlight">' + highlight + '</span>' +
      sector;
    if (c.source && String(c.source).startsWith('/news/')) {
      return '<a class="inv-profile-activity-row" href="' + escapeHtml(c.source) + '">' + inner + '</a>';
    }
    if (c.source) {
      return (
        '<a class="inv-profile-activity-row" href="' +
        escapeHtml(c.source) +
        '" target="_blank" rel="noopener noreferrer">' +
        inner +
        '</a>'
      );
    }
    return '<div class="inv-profile-activity-row">' + inner + '</div>';
  }).join('');

  const total = (investor.recentChecks || []).length;
  const moreLink = total > checks.length
    ? '<a class="inv-profile-panel-link" href="/investors/' + escapeHtml(investor.slug) + '#activity">View all ' + total + ' activity items →</a>'
    : '<a class="inv-profile-panel-link" href="/investors/' + escapeHtml(investor.slug) + '#activity">View on firm profile →</a>';

  return (
    '<section class="inv-profile-section inv-person-firm-section inv-profile-reveal" id="firm-activity">' +
    '<div class="inv-profile-section-label">04 — Activity</div>' +
    '<div class="inv-profile-section-head">' +
    '<h2>Recent activity at ' + escapeHtml(person.company || investor.name) + '</h2>' +
    '<p>Latest checks and mentions from India startup news.</p>' +
    '</div>' +
    '<div class="inv-profile-activity-list">' + rows + '</div>' +
    moreLink +
    '</section>'
  );
}

function isBlankPortfolioLabel(value) {
  const v = String(value || '').trim().toLowerCase();
  return (
    !v ||
    v === 'unknown' ||
    v === 'listed in profile' ||
    v === 'n/a' ||
    v === 'null'
  );
}

function firmPortfolioSection(person, investor, limit) {
  const companies = (investor.portfolioCompanies || []).slice(0, limit || 9);
  if (!companies.length) return '';

  const total = (investor.portfolioCompanies || []).length;
  const cards = companies.map((c) => {
    const fallback = '<span class="inv-profile-portfolio-logo-fallback" aria-hidden="true">' +
      escapeHtml(String(c.name || '?').slice(0, 1).toUpperCase()) + '</span>';
    const logo = c.logoUrl
      ? '<img class="inv-profile-portfolio-logo" src="' + escapeHtml(c.logoUrl) + '" alt="" width="32" height="32" loading="lazy" decoding="async" onerror="this.classList.add(\'is-broken\')">' + fallback
      : fallback;

    const stage = !isBlankPortfolioLabel(c.stage) ? c.stage : null;
    const amount = !isBlankPortfolioLabel(c.amount) ? c.amount : null;
    const metaBits = [amount, stage].filter(Boolean).map((bit) => '<span>' + escapeHtml(bit) + '</span>');
    const meta = metaBits.length
      ? '<div class="inv-profile-portfolio-meta">' + metaBits.join('<span class="inv-profile-portfolio-dot" aria-hidden="true">·</span>') + '</div>'
      : '';

    const body =
      logo +
      '<div class="inv-profile-portfolio-copy">' +
      '<div class="inv-profile-portfolio-name">' + escapeHtml(c.name) + '</div>' +
      meta +
      '</div>';

    const href = portfolioCardHref(c, investor.website);
    if (href) {
      return '<a class="inv-profile-portfolio-card inv-person-firm-portfolio-card" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + body + '</a>';
    }
    return '<div class="inv-profile-portfolio-card inv-person-firm-portfolio-card">' + body + '</div>';
  }).join('');

  const countLabel = total === 1 ? '1 company' : total + ' companies';

  return (
    '<section class="inv-profile-section inv-person-firm-section inv-profile-reveal" id="firm-portfolio">' +
    '<div class="inv-profile-section-label">05 — Portfolio</div>' +
    '<div class="inv-profile-section-head">' +
    '<h2>Portfolio at ' + escapeHtml(person.company || investor.name) + '</h2>' +
    '<p class="inv-profile-portfolio-count">' + escapeHtml(countLabel) + ' mapped to this fund.</p>' +
    '</div>' +
    '<div class="inv-profile-portfolio-grid inv-person-firm-portfolio-grid">' + cards + '</div>' +
    (total > companies.length
      ? '<a class="inv-profile-panel-link" href="/investors/' + escapeHtml(investor.slug) + '#portfolio">View full portfolio →</a>'
      : '<a class="inv-profile-panel-link" href="/investors/' + escapeHtml(investor.slug) + '#portfolio">View on firm profile →</a>') +
    '</section>'
  );
}

function firmExploreSection(investor) {
  if (!investor) return '';

  const themeIds = investor.thesisThemeIds || [];
  const exploreThemes = (investor.thesisThemes || [])
    .map((label, i) => ({ id: themeIds[i], label }))
    .filter((t) => t.id && t.id !== 'general')
    .slice(0, 6);

  const orderedStages = getAllStages()
    .filter((s) => (investor.stageIds || []).includes(s.id))
    .map((s) => ({ id: s.id, label: s.label }));
  const stagesForExplore = orderedStages.length ? orderedStages : deriveRelatedStages([investor], 6);

  return renderExploreRelated({
    sectionLabel: '07 — Explore',
    title: 'Explore related',
    subtitle: 'Stage, sector, and thesis guides connected to this person\'s firm.',
    stages: stagesForExplore,
    themes: exploreThemes,
    fundsHref: '/investors/' + investor.slug,
    fundsLabel: 'View firm profile →',
    siblingHref: '/investors/sectors',
    siblingLabel: 'Sector guides →',
    className: 'inv-profile-reveal inv-person-firm-explore'
  });
}

module.exports = {
  firmFocusSection,
  firmThesisSection,
  firmActivitySection,
  firmPortfolioSection,
  firmExploreSection
};
