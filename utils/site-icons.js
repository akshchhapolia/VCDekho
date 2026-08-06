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

module.exports = { renderFaviconLinks };
