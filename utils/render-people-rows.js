/**
 * Server-side people directory row HTML (mirrors js/people.js renderRows).
 */
const { esc } = require('./render-directory-rows');

const LOCK_ICON =
  '<svg class="inv-email-unlock-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
  '<rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/>' +
  '<path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
  '</svg>';

function initialsFor(name) {
  const parts = String(name || '')
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function logoHtml(person) {
  const src = person.photo || person.companyLogo;
  if (!src) {
    return (
      '<span class="inv-dir-logo-fallback is-visible" aria-hidden="true">' +
      esc(initialsFor(person.name)) +
      '</span>'
    );
  }
  const roundStyle = person.photo ? 'border-radius:50%;object-fit:cover;' : '';
  return (
    '<img class="inv-dir-logo" src="' +
    esc(src) +
    '" alt="" width="40" height="40" loading="lazy" decoding="async" style="' +
    roundStyle +
    '" onerror="this.classList.add(\'is-broken\');this.nextElementSibling&&this.nextElementSibling.classList.add(\'is-visible\');">' +
    '<span class="inv-dir-logo-fallback" aria-hidden="true">' +
    esc(initialsFor(person.name)) +
    '</span>'
  );
}

function emailCellHtml(person) {
  if (person.hasEmail) {
    return (
      '<button type="button" class="inv-email-unlock-btn" data-unlock-email data-person-slug="' +
      esc(person.slug) +
      '">' +
      LOCK_ICON +
      '<span class="inv-email-unlock-label">Unlock email</span></button>'
    );
  }
  return '<span class="inv-profile-empty">Not available</span>';
}

function linksCellHtml(person) {
  const links = [];
  if (person.linkedin) {
    links.push(
      '<a class="inv-dir-inline-link" href="' +
        esc(person.linkedin) +
        '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">LinkedIn</a>'
    );
  }
  if (person.twitter) {
    links.push(
      '<a class="inv-dir-inline-link" href="' +
        esc(person.twitter) +
        '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Twitter</a>'
    );
  }
  return links.join(' · ') || '—';
}

function renderPersonRow(person) {
  const href = '/investors/' + encodeURIComponent(person.slug);
  const companyHtml = person.companySlug
    ? '<a class="inv-dir-inline-link" href="/funds/' +
      encodeURIComponent(person.companySlug) +
      '" onclick="event.stopPropagation()">' +
      esc(person.company) +
      '</a>'
    : esc(person.company || '—');

  return (
    '<article class="inv-dir-row">' +
    '<a class="inv-dir-row-hit" href="' +
    href +
    '" aria-label="' +
    esc(person.name) +
    '" data-analytics-event="dir_result_click" data-analytics-params=\'{"directory":"people","slug":"' +
    esc(person.slug) +
    '"}\'></a>' +
    '<div class="inv-dir-col inv-dir-col-fund">' +
    '<span class="inv-dir-fund-mark">' +
    logoHtml(person) +
    '</span>' +
    '<span class="inv-dir-fund-text">' +
    '<span class="inv-dir-type">' +
    esc(person.title || 'Investor') +
    '</span>' +
    '<span class="inv-dir-name">' +
    esc(person.name) +
    '</span>' +
    '</span></div>' +
    '<div class="inv-dir-col inv-dir-col-stages"><span class="inv-dir-mobile-label">Firm</span><span class="inv-dir-cell">' +
    companyHtml +
    '</span></div>' +
    '<div class="inv-dir-col inv-dir-col-sectors inv-dir-col-email"><span class="inv-dir-mobile-label">Email</span><span class="inv-dir-cell">' +
    emailCellHtml(person) +
    '</span></div>' +
    '<div class="inv-dir-col inv-dir-col-ticket"><span class="inv-dir-mobile-label">Links</span><span class="inv-dir-ticket">' +
    linksCellHtml(person) +
    '</span></div></article>'
  );
}

function renderPeopleRows(people) {
  return (people || []).map(renderPersonRow).join('\n');
}

module.exports = {
  renderPersonRow,
  renderPeopleRows
};
