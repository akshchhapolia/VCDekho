const GUIDE_ROOTS: Record<string, boolean> = { stages: true, themes: true, sectors: true };

export function normalizePath(pathname: string) {
  return String(pathname || '').split('?')[0].replace(/\/$/, '') || '/';
}

export function isAppRoute(pathname: string) {
  const p = normalizePath(pathname);
  if (p === '/' || p === '/investors' || p === '/funds') return true;
  if (/^\/investors\/[^/]+$/.test(p)) return true;
  const fund = p.match(/^\/funds\/([^/]+)$/);
  if (fund && !GUIDE_ROOTS[fund[1]]) return true;
  return false;
}

/** Never hijack clicks. Founder Tape model: every route is a real document load. */
export function isSoftNavRoute(_pathname: string) {
  return false;
}

export function isProfileRoute(pathname: string) {
  const p = normalizePath(pathname);
  if (/^\/investors\/[^/]+$/.test(p)) return true;
  const fund = p.match(/^\/funds\/([^/]+)$/);
  return Boolean(fund && !GUIDE_ROOTS[fund[1]]);
}

export function documentClasses(pathname: string) {
  const p = normalizePath(pathname);
  if (p === '/') {
    return { html: 'home-page has-announcement', body: 'has-announcement home-page', home: true };
  }
  if (p === '/investors') {
    return {
      html: 'scrollable-page',
      body: 'scrollable-page inv-page inv-dir-page inv-people-dir',
      home: false
    };
  }
  if (p === '/funds') {
    return { html: 'scrollable-page', body: 'scrollable-page inv-page inv-dir-page', home: false };
  }
  if (/^\/investors\/[^/]+$/.test(p)) {
    return {
      html: 'scrollable-page',
      body: 'scrollable-page inv-page inv-person-profile inv-profile-ready',
      home: false
    };
  }
  const fund = p.match(/^\/funds\/([^/]+)$/);
  if (fund && !GUIDE_ROOTS[fund[1]]) {
    return {
      html: 'scrollable-page',
      body: 'scrollable-page inv-page inv-investor-profile inv-profile-ready',
      home: false
    };
  }
  return { html: 'scrollable-page', body: 'scrollable-page', home: false };
}

export { GUIDE_ROOTS };
