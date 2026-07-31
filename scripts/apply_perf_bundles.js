#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS_V = '65';

const BUNDLES = {
  home: ['/css/base.css', '/css/hero.css', '/css/blog.css'],
  blog: ['/css/base.css', '/css/hero.css', '/css/ambient.css', '/css/blog.css'],
  directory: ['/css/base.css', '/css/hero.css', '/css/directory.css'],
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

const GA_HTML =
  /<!-- Google tag \(gtag\.js\) -->[\s\S]*?gtag\('config', 'G-BJ23KLLWFM'\);\s*\}<\/script>\s*\n?/g;

const STYLE_SINGLE = /\s*<link rel="stylesheet" href="(\/)?style\.css\?v=\d+">\s*\n?/g;

function patchHtml(content, bundleKey) {
  let out = content.replace(GA_HTML, '    <script src="/js/analytics.js" defer></script>\n');
  out = out.replace(STYLE_SINGLE, '\n    ' + cssLinkTags(bundleKey) + '\n');
  out = out.replace(/\/assets\/(blog_[a-z0-9_]+)\.png/g, '/assets/$1.webp');
  return out;
}

function patchSsr(content, bundleKey) {
  let out = content;
  out = out.replace(
    /'<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-BJ23KLLWFM"><\/script>',\s*'<script>[\s\S]*?gtag\('config', 'G-BJ23KLLWFM'\);\s*<\/script>',/,
    "'<script src=\"/js/analytics.js\" defer></script>',"
  );
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
  console.log('html', rel, bundleForHtml(rel));
}

for (const rel of [
  'api/news/article.js',
  'api/investors/detail.js',
  'utils/render-investor-page.js',
  'utils/render-person-page.js',
  'utils/render-sector-page.js',
  'utils/render-stage-page.js'
]) {
  const file = path.join(ROOT, rel);
  fs.writeFileSync(file, patchSsr(fs.readFileSync(file, 'utf8'), 'directory'));
  console.log('ssr', rel);
}

console.log('Applied CSS bundles v' + CSS_V + ', WebP refs, deferred analytics.');
