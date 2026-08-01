/**
 * Cache headers for public SSR HTML (firm / person / guide pages).
 * Vercel needs s-maxage (or CDN-Cache-Control) for edge HITs on serverless responses.
 */
function setPublicHtmlCache(res, opts) {
  opts = opts || {};
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800');
  res.setHeader('CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  // When HTML differs for mweb vs dweb (deferred extras), keep CDN variants separate
  if (opts.varyMobile) {
    res.setHeader('Vary', 'User-Agent, Sec-CH-UA-Mobile');
  }
}

module.exports = { setPublicHtmlCache };
