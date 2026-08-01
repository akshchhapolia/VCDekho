/**
 * Cache headers for public SSR HTML (firm / person / guide pages).
 * Vercel needs s-maxage (or CDN-Cache-Control) for edge HITs on serverless responses.
 */
function setPublicHtmlCache(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800');
  res.setHeader('CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
}

module.exports = { setPublicHtmlCache };
