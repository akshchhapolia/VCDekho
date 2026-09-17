#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS_V = '65';

const BUNDLES = {
  home: ['/css/base.css', '/css/hero.css', '/css/blog.css'],
  blog: ['/css/base.css', '/css/hero.css', '/css/ambient.css', '/css/blog.css'],
  directory: ['/css/base.css', '/css/hero.css', '/css/ambient.css', '/css/directory.css'],
  login: ['/css/base.css', '/css/hero.css', '/css/ambient.css']
};

function cssLinkTags(bundleKey) {
  return BUNDLES[bundleKey]
    .map((href) => `<link rel="stylesheet" href="${href}?v=${CSS_V}">`)
    .join('\n    ');
}

function cssLinkTagsJs(bundleKey) {
  return BUNDLES[bundleKey]
    .map((href) => `'${`<link rel="stylesheet" href="${href}?v=${CSS_V}">`}',`)
    .join('\n    ');
}

const GA_HTML = /<!-- Google tag \(gtag\.js\) -->[\s\S]*?<\/script>\s*\n?/g;
const GA_INLINE = /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-BJ23KLLWFM"><\/script>\s*<script>[\s\S]*?<\/script>\s*\n?/g;

const STYLE_SINGLE = /\s*<link rel="stylesheet" href="(\/)?style\.css\?v=\d+">\s*\n?/g;

function patchHtml(content, bundleKey) {
  let out = content;
  out = out.replace(GA_HTML, '    <script src="/js/analytics.js?v=2" defer></script>\n');
  out = out.replace(GA_INLINE, '    <script src="/js/analytics.js?v=2" defer></script>\n');
  if (!out.includes('/js/analytics.js?v=2')) {
    out = out.replace(/<head>\s*\n/, '<head>\n    <script src="/js/analytics.js?v=2" defer></script>\n');
  }
  out = out.replace(STYLE_SINGLE, '\n    ' + cssLinkTags(bundleKey) + '\n');
  out = out.replace(/\/assets\/(blog_[a-z0-9_]+)\.png/g, '/assets/$1.webp');
  return out;
}

function patchSsr(content, bundleKey) {
  let out = content;
  out = out.replace(
    /'<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-BJ23KLLWFM"><\/script>',\s*'[\s\S]*?gtag\('config', 'G-BJ23KLLWFM'\);[\s\S]*?<\/script>',/,
    "'<script src=\"/js/analytics.js?v=2\" defer></script>',"
  );
  if (!out.includes('/js/analytics.js?v=2')) {
    out = out.replace(
      /'<meta charset="UTF-8">',/,
      "'<script src=\"/js/analytics.js?v=2\" defer></script>',\n    '<meta charset=\"UTF-8\">',"
    );
  }
  out = out.replace(
    /'<link rel="stylesheet" href="\/style\.css\?v=\d+">',/,
    cssLinkTagsJs(bundleKey)
  );
  out = out.replace(/\/assets\/(blog_[a-z0-9_]+)\.png/g, '/assets/$1.webp');
  return out;
}

function walk(dir, ext, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, ext, out);
    else if (entry.name.endsWith(ext)) out.push(full);
  }
}

function bundleForHtml(rel) {
  if (rel === 'index.html') return 'home';
  if (rel.startsWith('investors/') || rel === 'people/index.html') return 'directory';
  if (['login.html', 'contact.html', 'about.html'].includes(rel)) return 'login';
  return 'blog';
}

const htmlFiles = [];
walk(ROOT, '.html', htmlFiles);
for (const file of htmlFiles) {
  const rel = path.relative(ROOT, file);
  fs.writeFileSync(file, patchHtml(fs.readFileSync(file, 'utf8'), bundleForHtml(rel)));
}

for (const rel of [
  'api/news/article.js',
  'api/investors/detail.js',
  'utils/render-investor-page.js',
  'utils/render-person-page.js',
  'utils/render-sector-page.js',
  'utils/render-stage-page.js'
]) {
  fs.writeFileSync(path.join(ROOT, rel), patchSsr(fs.readFileSync(path.join(ROOT, rel), 'utf8'), 'directory'));
}

console.log('Patched analytics, CSS bundles, WebP.');
