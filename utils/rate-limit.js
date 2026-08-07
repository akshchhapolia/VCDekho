/**
 * Lightweight in-memory IP rate limiter for serverless handlers.
 * Best-effort per instance — still meaningfully slows bulk scraping.
 */

const buckets = new Map();

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '')
    .split(',')[0]
    .trim();
  return forwarded || 'unknown';
}

function pruneBuckets(now) {
  if (buckets.size < 5000) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

/**
 * @param {string} ip
 * @param {string} bucketKey
 * @param {{ max: number, windowMs: number }} opts
 * @returns {{ ok: true } | { ok: false, retryAfterMs: number }}
 */
function rateLimitByIp(ip, bucketKey, opts) {
  const max = Math.max(1, opts.max || 60);
  const windowMs = Math.max(1000, opts.windowMs || 15 * 60 * 1000);
  const now = Date.now();
  pruneBuckets(now);

  const key = `${bucketKey}:${ip}`;
  let entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }

  entry.count += 1;
  if (entry.count > max) {
    return { ok: false, retryAfterMs: Math.max(0, entry.resetAt - now) };
  }
  return { ok: true };
}

function sendRateLimitResponse(res, retryAfterMs) {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  res.setHeader('Retry-After', String(seconds));
  res.status(429).json({
    error: 'Too many requests',
    code: 'rate_limit',
    retryAfterSeconds: seconds
  });
}

const LIST_PUBLIC_LIMIT = { max: 90, windowMs: 15 * 60 * 1000 };
const LIST_AUTH_LIMIT = { max: 240, windowMs: 15 * 60 * 1000 };

function enforceListRateLimit(req, res, { authenticated }) {
  const ip = getClientIp(req);
  const bucket = authenticated ? 'directory-list-auth' : 'directory-list-public';
  const config = authenticated ? LIST_AUTH_LIMIT : LIST_PUBLIC_LIMIT;
  const result = rateLimitByIp(ip, bucket, config);
  if (!result.ok) {
    sendRateLimitResponse(res, result.retryAfterMs);
    return false;
  }
  return true;
}

module.exports = {
  getClientIp,
  rateLimitByIp,
  sendRateLimitResponse,
  enforceListRateLimit,
  LIST_PUBLIC_LIMIT,
  LIST_AUTH_LIMIT
};
