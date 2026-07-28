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

async function isValidToken(token) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY
      }
    });
    return response.ok;
  } catch (_) {
    return false;
  }
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Allow static assets under /investors (JS used by the directory page)
  if (/\.(js|css|map|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/i.test(pathname)) {
    return;
  }

  const isInvestorsPath =
    pathname === '/investors' ||
    pathname.startsWith('/investors/') ||
    pathname === '/api/investors/list' ||
    pathname.startsWith('/api/investors/');

  if (!isInvestorsPath) {
    return;
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    token = readCookie(cookieHeader, 'vd_access_token');
  }

  const accept = request.headers.get('accept') || '';
  const wantsHtml = accept.includes('text/html');

  if (!token || !(await isValidToken(token))) {
    if (wantsHtml || pathname.startsWith('/investors')) {
      const next = encodeURIComponent(pathname + url.search);
      return Response.redirect(new URL(`/login?next=${next}`, request.url), 302);
    }
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }
}

export const config = {
  matcher: ['/investors', '/investors/:path*', '/api/investors/:path*']
};
