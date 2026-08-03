const LOCK_ICON =
  '<svg class="inv-email-unlock-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
  '<rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/>' +
  '<path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
  '</svg>';

function unlockEmailButtonHtml(slugEscaped, extraClass) {
  const cls = extraClass ? 'inv-email-unlock-btn ' + extraClass : 'inv-email-unlock-btn';
  return (
    '<button type="button" class="' + cls + '" data-unlock-email data-person-slug="' + slugEscaped + '">' +
    LOCK_ICON +
    '<span class="inv-email-unlock-label">Unlock email</span></button>'
  );
}

module.exports = {
  LOCK_ICON,
  unlockEmailButtonHtml
};
