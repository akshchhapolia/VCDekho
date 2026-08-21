const GUIDE_ROOTS: Record<string, boolean> = { stages: true, themes: true, sectors: true };

export function isAppRoute(pathname: string) {
  const p = String(pathname || '').split('?')[0].replace(/\/$/, '') || '/';
  if (p === '/' || p === '/investors' || p === '/funds') return true;
  if (/^\/investors\/[^/]+$/.test(p)) return true;
  const fund = p.match(/^\/funds\/([^/]+)$/);
  if (fund && !GUIDE_ROOTS[fund[1]]) return true;
  return false;
}

export { GUIDE_ROOTS };
