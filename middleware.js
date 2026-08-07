const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qviyhvnubhduyhgwzuzc.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_8oN7IM2mUNSe8Q7WbaV2lw_86x1NPzb';

function readCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch (_) {
        return rest.join('=');
      }
    }
  }
  return null;
}

function isProductionHost(host) {
  const h = String(host || '')
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase();
  return h === 'vcdekho.com' || h === 'www.vcdekho.com';
}

/**
 * Block direct access to private data paths on production.
 * Directory pages and list APIs are public (page 1) or login-gated in handlers.
 */
export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';

  if (!isProductionHost(host)) {
    return;
  }

  const isSensitiveData =
    pathname.startsWith('/utils/_data/') ||
    pathname === '/utils/_data' ||
    pathname === '/VC Dekho Sheet - Investor - Individuals.csv';
  if (isSensitiveData) {
    return new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
}

export const config = {
  matcher: [
    '/utils/_data/:path*',
    '/VC Dekho Sheet - Investor - Individuals.csv'
  ]
};
