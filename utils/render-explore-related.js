/**
 * Shared “Explore related” block for investor / theme / stage pages.
 */
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} opts
 * @param {string} [opts.sectionLabel]
 * @param {string} [opts.title]
 * @param {string} [opts.subtitle]
 * @param {Array<{id:string,label:string}>} [opts.stages]
 * @param {Array<{id:string,label:string}>} [opts.themes]
 * @param {string} [opts.fundsHref]
 * @param {string} [opts.fundsLabel]
 * @param {string} [opts.siblingHref]
 * @param {string} [opts.siblingLabel]
 * @param {string} [opts.className]
 */
function renderExploreRelated(opts = {}) {
  const stages = opts.stages || [];
  const themes = opts.themes || [];
  const hasStages = stages.length > 0;
  const hasThemes = themes.length > 0;
  const hasFunds = Boolean(opts.fundsHref);
  const hasSibling = Boolean(opts.siblingHref);

  if (!hasStages && !hasThemes && !hasFunds && !hasSibling) return '';

  const stageChips = hasStages
    ? (
      '<div class="inv-explore-group">' +
        '<div class="inv-explore-label">Stages</div>' +
        '<div class="inv-explore-chips">' +
          stages.map(s => (
            '<a class="inv-explore-chip" href="/investors/stages/' + escapeHtml(s.id) + '">' +
              escapeHtml(s.label) +
            '</a>'
          )).join('') +
        '</div>' +
      '</div>'
    )
    : '';

  const themeChips = hasThemes
    ? (
      '<div class="inv-explore-group">' +
        '<div class="inv-explore-label">Thesis themes</div>' +
        '<div class="inv-explore-chips">' +
          themes.map(t => (
            '<a class="inv-explore-chip" href="/investors/themes/' + escapeHtml(t.id) + '">' +
              escapeHtml(t.label) +
            '</a>'
          )).join('') +
        '</div>' +
      '</div>'
    )
    : '';

  const actions = [];
  if (hasFunds) {
    actions.push(
      '<a class="inv-explore-cta" href="' + escapeHtml(opts.fundsHref) + '">' +
        escapeHtml(opts.fundsLabel || 'Browse matching funds →') +
      '</a>'
    );
  }
  if (hasSibling) {
    actions.push(
      '<a class="inv-explore-cta is-ghost" href="' + escapeHtml(opts.siblingHref) + '">' +
        escapeHtml(opts.siblingLabel || 'Explore more →') +
      '</a>'
    );
  }

  const actionsHtml = actions.length
    ? '<div class="inv-explore-actions">' + actions.join('') + '</div>'
    : '';

  const sectionLabel = opts.sectionLabel || 'Continue exploring';
  const headClass = opts.sectionLabel
    ? 'inv-profile-section-head'
    : 'inv-explore-head';

  const labelHtml = opts.sectionLabel
    ? '<div class="inv-profile-section-label">' + escapeHtml(sectionLabel) + '</div>'
    : '<p class="inv-explore-kicker">' + escapeHtml(sectionLabel) + '</p>';

  const titleBlock = opts.sectionLabel
    ? (
      '<div class="' + headClass + '">' +
        '<h2>' + escapeHtml(opts.title || 'Explore related') + '</h2>' +
        (opts.subtitle ? '<p>' + escapeHtml(opts.subtitle) + '</p>' : '') +
      '</div>'
    )
    : (
      '<div class="' + headClass + '">' +
        labelHtml +
        '<h2>' + escapeHtml(opts.title || 'Explore related') + '</h2>' +
        (opts.subtitle ? '<p class="inv-explore-sub">' + escapeHtml(opts.subtitle) + '</p>' : '') +
      '</div>'
    );

  const sectionClass = [
    'inv-explore',
    opts.sectionLabel ? 'inv-profile-section' : '',
    opts.className || ''
  ].filter(Boolean).join(' ');

  return (
    '<section class="' + sectionClass + '" id="explore">' +
      (opts.sectionLabel ? labelHtml : '') +
      titleBlock +
      '<div class="inv-explore-body">' +
        stageChips +
        themeChips +
        actionsHtml +
      '</div>' +
    '</section>'
  );
}

module.exports = { renderExploreRelated, escapeHtml };
