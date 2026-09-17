const LOCK_ICON =
  '<svg class="inv-email-unlock-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
  '<rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/>' +
  '<path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
  '</svg>';

function escAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function unlockLoginHref(slug) {
  // Same cached /login document as prefetch. Hash is not part of the request,
  // so the edge can serve the page instantly; login.js reads it as `next`.
  return '/login#/investors/' + String(slug || '');
}

function unlockEmailButtonHtml(slug, extraClass) {
  const cls = extraClass ? 'inv-email-unlock-btn ' + extraClass : 'inv-email-unlock-btn';
  return (
    '<a class="' +
    cls +
    '" href="' +
    escAttr(unlockLoginHref(slug)) +
    '" data-unlock-email data-person-slug="' +
    escAttr(slug) +
    '">' +
    LOCK_ICON +
    '<span class="inv-email-unlock-label">Unlock email</span></a>'
  );
}

module.exports = {
  LOCK_ICON,
  unlockEmailButtonHtml,
  unlockLoginHref
};
