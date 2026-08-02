/**
 * Firm-context sections for person profile pages only.
 * Joins person → investor via companySlug; keep all markup scoped with inv-person-firm-*.
 */
const { isActivelyDeploying, deriveRelatedStages } = require('./investors');
const { hasSectorGuide } = require('./sectors');
const { getAllStages } = require('./investment-stages');
const { getThesisThemeIconSvg } = require('./thesis-theme-icons');
const { renderExploreRelated } = require('./render-explore-related');
const { portfolioCardHref } = require('./portfolio-card-href');
const { RECENT_ACTIVITY_LIMIT } = require('./investor-activity-store');
const { filterPortfolioJunk } = require('./portfolio-junk-filter');
const { portfolioCardBodyHtml } = require('./render-portfolio-card');

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

function sectionLabel(n, text, offset) {
  const num = Math.max(1, Number(n) + (Number(offset) || 0));
  return String(num).padStart(2, '0') + ' — ' + text;
}

function isAngelIndividual(person) {
  const type = String((person && person.companyType) || '').toLowerCase();
  return type === 'angel / individual' || type.includes('angel / individual');
}

/** Firm-name suffix in section titles — omit for angels (reads as "at Angel Investor"). */
function firmNameSuffix(person, investor) {
  if (isAngelIndividual(person)) return '';
  const name = (person && person.company) || (investor && investor.name) || '';
  return name ? ' at ' + escapeHtml(name) : '';
}

function firmFocusSection(person, investor, opts) {
  opts = opts || {};
  if (!investor) return '';

  const stages = investor.stages || [];
  const stageIds = investor.stageIds || [];
  const sectors = investor.sectors || [];
  const sectorIds = investor.sectorIds || [];
  const themes = investor.thesisThemes || [];

  const sectorPills = sectors.map((label, i) => {
    const id = sectorIds[i];
    const href = hasSectorGuide(id)
      ? '/investors/sectors/' + encodeURIComponent(id)
      : id
        ? '/investors?sector=' + encodeURIComponent(id)
        : '';
    const inner = escapeHtml(label);
    if (href) {
      return '<a class="inv-person-firm-pill" href="' + escapeHtml(href) + '">' + inner + '</a>';
    }
    return '<span class="inv-person-firm-pill">' + inner + '</span>';
  }).join('');

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

  const sectorPanel = sectors.length
    ? (
      '<div class="inv-person-firm-sectors">' +
        '<p class="inv-person-firm-sectors-label">Sector focus</p>' +
        '<div class="inv-person-firm-pill-row">' + sectorPills + '</div>' +
      '</div>'
    )
    : '';

  const focusPanel =
    '<div class="inv-person-firm-panel">' +
      '<div class="inv-profile-metric-strip inv-person-firm-metrics">' + metrics + '</div>' +
      sectorPanel +
      '<a class="inv-person-firm-panel-cta" href="/investors/' + escapeHtml(investor.slug) + '#focus">View full firm profile →</a>' +
    '</div>';

  const revealCls = opts.visible
    ? 'inv-profile-section inv-person-firm-section inv-profile-reveal is-visible'
    : 'inv-profile-section inv-person-firm-section inv-profile-reveal';

  return (
    '<section class="' + revealCls + '" id="firm-focus">' +
    '<div class="inv-profile-section-label">' + escapeHtml(sectionLabel(2, 'Firm focus', opts.sectionOffset)) + '</div>' +
    '<div class="inv-profile-section-head">' +
    '<div class="inv-person-firm-head-row">' +
    '<h2>Where ' + escapeHtml(person.company || investor.name) + ' invests</h2>' +
    activeBadge +
    '</div>' +
    '<p>Stage, sector, and cheque signals from the linked fund profile.</p>' +
    firmAttribution(person, investor) +
    '</div>' +
    focusPanel +
    '</section>'
  );
}

function firmThesisSection(person, investor, opts) {
  opts = opts || {};
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

  const revealCls = opts.visible
    ? 'inv-profile-section inv-person-firm-section inv-profile-reveal is-visible'
    : 'inv-profile-section inv-person-firm-section inv-profile-reveal';

  return (
    '<section class="' + revealCls + '" id="firm-thesis">' +
    '<div class="inv-profile-section-label">' + escapeHtml(sectionLabel(3, 'Firm thesis', opts.sectionOffset)) + '</div>' +
    '<div class="inv-profile-section-head">' +
    '<h2>Investment thesis' + firmNameSuffix(person, investor) + '</h2>' +
    '<p>How this fund is described in the VC Dekho directory.</p>' +
    '</div>' +
    prose +
    (chipsHtml ? '<div class="inv-profile-thesis-chips">' + chipsHtml + '</div>' : '') +
    '<a class="inv-profile-panel-link" href="/investors/' + escapeHtml(investor.slug) + '#thesis">Full thesis on firm profile →</a>' +
    '</section>'
  );
}

function firmActivitySection(person, investor, limitOrOpts) {
  const opts = typeof limitOrOpts === 'object' && limitOrOpts !== null
    ? limitOrOpts
    : { limit: limitOrOpts };
  const limit = opts.limit || RECENT_ACTIVITY_LIMIT;
  const checks = (investor.recentChecks || []).slice(0, limit);
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
    '<div class="inv-profile-section-label">' + escapeHtml(sectionLabel(4, 'Activity', opts.sectionOffset)) + '</div>' +
    '<div class="inv-profile-section-head">' +
    '<h2>Recent activity' + firmNameSuffix(person, investor) + '</h2>' +
    '<p>Latest checks and mentions from India startup news.</p>' +
    '</div>' +
    '<div class="inv-profile-activity-list">' + rows + '</div>' +
    moreLink +
    '</section>'
  );
}

function firmPortfolioSection(person, investor, limitOrOpts) {
  const opts = typeof limitOrOpts === 'object' && limitOrOpts !== null
    ? limitOrOpts
    : { limit: limitOrOpts };
  const all = filterPortfolioJunk(investor.portfolioCompanies || []);
  const companies = all.slice(0, opts.limit || 9);
  if (!companies.length) return '';

  const total = all.length;
  const cards = companies.map((c) => {
    const body = portfolioCardBodyHtml(c, { includeInvestmentType: false });

    const href = portfolioCardHref(c, investor.website);
    if (href) {
      return '<a class="inv-profile-portfolio-card inv-person-firm-portfolio-card" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + body + '</a>';
    }
    return '<div class="inv-profile-portfolio-card inv-person-firm-portfolio-card">' + body + '</div>';
  }).join('');

  const countLabel = total === 1 ? '1 company' : total + ' companies';

  return (
    '<section class="inv-profile-section inv-person-firm-section inv-profile-reveal" id="firm-portfolio">' +
    '<div class="inv-profile-section-label">' + escapeHtml(sectionLabel(5, 'Portfolio', opts.sectionOffset)) + '</div>' +
    '<div class="inv-profile-section-head">' +
    '<h2>Portfolio' + firmNameSuffix(person, investor) + '</h2>' +
    '<p class="inv-profile-portfolio-count">' + escapeHtml(countLabel) + ' mapped to this fund.</p>' +
    '</div>' +
    '<div class="inv-profile-portfolio-grid inv-person-firm-portfolio-grid">' + cards + '</div>' +
    (total > companies.length
      ? '<a class="inv-profile-panel-link" href="/investors/' + escapeHtml(investor.slug) + '#portfolio">View full portfolio →</a>'
      : '<a class="inv-profile-panel-link" href="/investors/' + escapeHtml(investor.slug) + '#portfolio">View on firm profile →</a>') +
    '</section>'
  );
}

function firmExploreSection(investor, opts) {
  opts = opts || {};
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
    sectionLabel: sectionLabel(7, 'Explore', opts.sectionOffset),
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
