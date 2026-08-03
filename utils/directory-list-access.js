const { enforceListRateLimit } = require('./rate-limit');
const { requireAuthWithActivity, optionalAuth, touchUserActivity } = require('./require-auth');

/**
 * Page 1 (offset 0) of directory list APIs is public; pagination requires login.
 * All list requests are IP rate-limited.
 */
async function resolveDirectoryListAccess(req, res, query) {
  const start = Math.max(0, parseInt(query.offset, 10) || 0);
  const paginated = start > 0;

  if (paginated) {
    if (!enforceListRateLimit(req, res, { authenticated: true })) {
      return null;
    }
    const user = await requireAuthWithActivity(req, res);
    if (!user) return null;
    return { start, user, paginated: true };
  }

  if (!enforceListRateLimit(req, res, { authenticated: false })) {
    return null;
  }

  const user = await optionalAuth(req);
  if (user) touchUserActivity(user, req);
  return { start, user, paginated: false };
}

module.exports = { resolveDirectoryListAccess };
