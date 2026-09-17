/**
 * Standard favicon / PWA icon link tags for HTML <head>.
 * Keep paths in sync with files at site root (favicon.ico, etc.).
 */
function renderFaviconLinks() {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="any">',
    '<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">',
    '<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">'
  ];
}

/** Intrinsic size of /assets/logoforvc.png — used so the header doesn't shift on decode. */
const LOGO_INTRINSIC = { width: 220, height: 204 };

function renderLogoImg(opts) {
  const o = opts || {};
  const attrs = [
    'src="' + (o.src || '/assets/logoforvc.png') + '"',
    'alt="' + (o.alt === undefined ? 'VC Dekho Logo' : o.alt) + '"',
    'class="logo-img"',
    'width="' + LOGO_INTRINSIC.width + '"',
    'height="' + LOGO_INTRINSIC.height + '"'
  ];
  if (o.id) attrs.push('id="' + o.id + '"');
  if (o.fetchpriority) attrs.push('fetchpriority="' + o.fetchpriority + '"');
  return '<img ' + attrs.join(' ') + '>';
}

module.exports = { renderFaviconLinks, renderLogoImg, LOGO_INTRINSIC };
