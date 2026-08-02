const db = require('./db');
const { getAllInvestors } = require('./investors');
const { getAllPeople } = require('./people');
const { THESIS_THEMES } = require('../data/thesis-themes');
const { INVESTMENT_STAGES } = require('../data/investment-stages');
const { SECTOR_GUIDES } = require('../data/sectors');

async function renderSitemapXml() {
  let dynamicUrls = '';

  if (process.env.DATABASE_URL) {
    try {
      const query = `SELECT slug, category, published_at FROM articles WHERE status = 'published' ORDER BY published_at DESC LIMIT 500`;
      const { rows } = await db.query(query);
      rows.forEach((article) => {
        const date = article.published_at
          ? new Date(article.published_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        const pathPrefix = article.category === 'blog' ? 'blog' : 'news';
        const priority = article.category === 'blog' ? '0.8' : '0.7';
        dynamicUrls += `
  <url>
    <loc>https://vcdekho.com/${pathPrefix}/${article.slug}</loc>
    <lastmod>${date}</lastmod>
    <priority>${priority}</priority>
  </url>`;
      });
    } catch (e) {
      console.warn('Article sitemap skipped:', e.message);
    }
  }

  try {
    getAllInvestors().forEach((inv) => {
      dynamicUrls += `
  <url>
    <loc>https://vcdekho.com/investors/${inv.slug}</loc>
    <priority>0.75</priority>
  </url>`;
    });
  } catch (e) {
    console.warn('Investor sitemap skipped:', e.message);
  }

  try {
    getAllPeople().forEach((p) => {
      dynamicUrls += `
  <url>
    <loc>https://vcdekho.com/people/${p.slug}</loc>
    <priority>0.6</priority>
  </url>`;
    });
  } catch (e) {
    console.warn('People sitemap skipped:', e.message);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://vcdekho.com/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://vcdekho.com/about</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://vcdekho.com/contact</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://vcdekho.com/login</loc>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://vcdekho.com/investors/themes</loc>
    <priority>0.9</priority>
  </url>${THESIS_THEMES.map(
    (t) => `
  <url>
    <loc>https://vcdekho.com/investors/themes/${t.id}</loc>
    <priority>0.85</priority>
  </url>`
  ).join('')}
  <url>
    <loc>https://vcdekho.com/investors/stages</loc>
    <priority>0.9</priority>
  </url>${INVESTMENT_STAGES.map(
    (s) => `
  <url>
    <loc>https://vcdekho.com/investors/stages/${s.id}</loc>
    <priority>0.85</priority>
  </url>`
  ).join('')}
  <url>
    <loc>https://vcdekho.com/investors/sectors</loc>
    <priority>0.9</priority>
  </url>${SECTOR_GUIDES.map(
    (s) => `
  <url>
    <loc>https://vcdekho.com/investors/sectors/${s.id}</loc>
    <priority>0.85</priority>
  </url>`
  ).join('')}
  <url>
    <loc>https://vcdekho.com/blog</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://vcdekho.com/news</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://vcdekho.com/guide/raising-vc-funding-india</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://vcdekho.com/blog/micro-vcs-india-first-cheque</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://vcdekho.com/blog/what-is-vc-investment-thesis</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://vcdekho.com/blog/top-vc-firms-india</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://vcdekho.com/blog/how-to-find-right-vc-india</loc>
    <priority>0.8</priority>
  </url>${dynamicUrls}
</urlset>`;
}

module.exports = { renderSitemapXml };
