/**
 * Server-side fund directory row HTML (mirrors investors/investors.js).
 */

const STAGE_GUIDE_IDS = {
  'pre-seed': true,
  seed: true,
  'pre-series-a': true,
  'series-a': true,
  'series-b': true,
  'series-c': true
};

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function joinList(items, limit) {
  const slice = (items || []).slice(0, limit || 3);
  if (!slice.length) return '—';
  const more = (items || []).length > slice.length;
  return slice.join(', ') + (more ? '…' : '');
}

function joinLinked(labels, ids, hrefForId, limit) {
  const items = (labels || []).slice(0, limit || 4);
  if (!items.length) return '—';
  const more = (labels || []).length > items.length;
  const parts = items.map((label, i) => {
    const id = (ids || [])[i];
    const href = id && hrefForId(id);
    if (href) {
      return (
        '<a class="inv-dir-inline-link" href="' +
        esc(href) +
        '" onclick="event.stopPropagation()">' +
        esc(label) +
        '</a>'
      );
    }
    return esc(label);
  });
  return parts.join(', ') + (more ? '…' : '');
}

function initialsFor(name) {
  const parts = String(name || '')
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function logoHtml(inv) {
  if (inv.logo) {
    return (
      '<img class="inv-dir-logo" src="' +
      esc(inv.logo) +
      '" alt="" width="40" height="40" loading="lazy" decoding="async" onerror="this.classList.add(\'is-broken\');this.nextElementSibling&&this.nextElementSibling.classList.add(\'is-visible\');">' +
      '<span class="inv-dir-logo-fallback" aria-hidden="true">' +
      esc(initialsFor(inv.name)) +
      '</span>'
    );
  }
  return (
    '<span class="inv-dir-logo-fallback is-visible" aria-hidden="true">' +
    esc(initialsFor(inv.name)) +
    '</span>'
  );
}

function renderFundRow(inv, opts) {
  const mobile = opts && opts.mobile;
  const stagesHtml = joinLinked(
    inv.stages,
    inv.stageIds,
    (id) => (STAGE_GUIDE_IDS[id] ? '/funds/stages/' + encodeURIComponent(id) : null),
    mobile ? 3 : 4
  );
  const thesisHtml = joinLinked(
    inv.thesisThemes,
    inv.thesisThemeIds,
    (id) => (id && id !== 'general' ? '/funds/themes/' + encodeURIComponent(id) : null),
    mobile ? 1 : 3
  );
  const sectorsText = joinList(inv.sectors, mobile ? 2 : 3);
  const sectorsThesis = [sectorsText !== '—' ? esc(sectorsText) : '', thesisHtml !== '—' ? thesisHtml : '']
    .filter(Boolean)
    .join(' · ') || '—';
  const href = '/funds/' + encodeURIComponent(inv.slug);
  const activeDot = inv.activelyDeploying
    ? ' <span class="inv-dir-active-dot" title="Actively deploying — linked to a funding round in the last 6 months" aria-label="Actively deploying"></span>'
    : '';

  return (
    '<article class="inv-dir-row">' +
    '<a class="inv-dir-row-hit" href="' +
    href +
    '" aria-label="' +
    esc(inv.name) +
    '" data-analytics-event="dir_result_click" data-analytics-params=\'{"directory":"funds","slug":"' +
    esc(inv.slug) +
    '"}\'></a>' +
    '<div class="inv-dir-col inv-dir-col-fund">' +
    '<span class="inv-dir-fund-mark">' +
    logoHtml(inv) +
    '</span>' +
    '<span class="inv-dir-fund-text">' +
    '<span class="inv-dir-type">' +
    esc(inv.type || 'Investor') +
    activeDot +
    '</span>' +
    '<span class="inv-dir-name">' +
    esc(inv.name) +
    '</span>' +
    '</span></div>' +
    '<div class="inv-dir-col inv-dir-col-stages"><span class="inv-dir-mobile-label">Stages</span><span class="inv-dir-cell">' +
    stagesHtml +
    '</span></div>' +
    '<div class="inv-dir-col inv-dir-col-sectors"><span class="inv-dir-mobile-label">Sectors</span><span class="inv-dir-cell">' +
    sectorsThesis +
    '</span></div>' +
    '<div class="inv-dir-col inv-dir-col-ticket"><span class="inv-dir-mobile-label">Ticket</span><span class="inv-dir-ticket">' +
    esc(inv.chequeSize || 'Not listed') +
    '</span></div></article>'
  );
}

function renderFundRows(investors, opts) {
  return (investors || []).map((inv) => renderFundRow(inv, opts)).join('\n');
}

module.exports = {
  renderFundRow,
  renderFundRows,
  esc
};
