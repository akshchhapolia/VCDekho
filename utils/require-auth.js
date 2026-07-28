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

function wantsHtml(req) {
  const accept = String(req.headers.accept || '');
  return accept.includes('text/html');
}

function requestHost(req) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase();
}

/** Production only — preview / preprod hosts stay open for QA. */
function isProductionHost(host) {
  const h = String(host || '')
    .split(':')[0]
    .toLowerCase();
  return h === 'vcdekho.com' || h === 'www.vcdekho.com';
}

function loginRedirect(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'vcdekho.com';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const path = req.url || '/investors';
  const next = encodeURIComponent(path.startsWith('/') ? path : '/' + path);
  res.writeHead(302, { Location: `${proto}://${host}/login?next=${next}` });
  res.end();
}

async function verifyAccessToken(token) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY
    }
  });
  if (!response.ok) return null;
  return response.json();
}

/**
 * Require a valid Supabase session for investor APIs/pages.
 * Returns the user object, or null after sending 401/302.
 * Skipped on non-production hosts so previews/preprod stay testable.
 */
async function requireAuth(req, res) {
  if (!isProductionHost(requestHost(req))) {
    return { id: 'preview', email: 'preview@local' };
  }

  const authHeader = String(req.headers.authorization || '');
  let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    token = readCookie(req.headers.cookie, 'vd_access_token');
  }

  if (!token) {
    if (wantsHtml(req)) {
      loginRedirect(req, res);
      return null;
    }
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  try {
    const user = await verifyAccessToken(token);
    if (!user) {
      if (wantsHtml(req)) {
        loginRedirect(req, res);
        return null;
      }
      res.status(401).json({ error: 'Invalid or expired session' });
      return null;
    }
    return user;
  } catch (err) {
    console.error('auth verify error:', err);
    if (wantsHtml(req)) {
      loginRedirect(req, res);
      return null;
    }
    res.status(401).json({ error: 'Authentication failed' });
    return null;
  }
}

module.exports = {
  requireAuth,
  verifyAccessToken,
  isProductionHost,
  requestHost,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
};
