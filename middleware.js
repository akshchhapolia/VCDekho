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

/**
 * Only the investor directory (and its search API) stay behind login.
 * Individual profiles, thesis pages, and stage pages are public + crawlable.
 */
export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  const isDirectoryPage = pathname === '/investors';
  const isDirectoryApi =
    pathname === '/api/investors/list' &&
    url.searchParams.get('view') !== 'themes' &&
    url.searchParams.get('view') !== 'stages';

  if (!isDirectoryPage && !isDirectoryApi) {
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
    if (wantsHtml || isDirectoryPage) {
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
  matcher: ['/investors', '/api/investors/list']
};
