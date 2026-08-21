const GUIDE_ROOTS = { stages: true, themes: true, sectors: true };

function isAppRoute(pathname) {
  const p = String(pathname || '').split('?')[0].replace(/\/$/, '') || '/';
  if (p === '/' || p === '/investors' || p === '/funds') return true;
  if (/^\/investors\/[^/]+$/.test(p)) return true;
  const fund = p.match(/^\/funds\/([^/]+)$/);
  if (fund && !GUIDE_ROOTS[fund[1]]) return true;
  return false;
}

module.exports = { isAppRoute, GUIDE_ROOTS };
