#!/usr/bin/env node
/**
 * Apply perf bundle updates: split CSS links, WebP images, deferred analytics.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS_V = '65';

const CSS_BUNDLES = {
  home: ['/css/base.css', '/css/hero.css', '/css/blog.css'],
  blog: ['/css/base.css', '/css/hero.css', '/css/ambient.css', '/css/blog.css'],
  directory: ['/css/base.css', '/css/hero.css', '/css/directory.css'],
  login: ['/css/base.css', '/css/hero.css', '/css/ambient.css'],
  minimal: ['/css/base.css', '/css/hero.css', '/css/ambient.css', '/css/blog.css']
};

function cssLinks(bundle) {
  return bundle.map((href) => `    <link rel="stylesheet" href="${href}?v=${CSS_V}">`).join('\n');
}

const GA_BLOCK = /<!-- Google tag \(gtag\.js\) -->[\s\S]*?gtag\('config', 'G-BJ23KLLWFM'\);\s*\}<\/script>\s*\n/g;
const ANALYTICS = '    <script src="/js/analytics.js" defer></script>\n';

const STYLE_LINK = /\s*<link rel="stylesheet" href="(\/)?style\.css\?v=\d+">\s*\n/g;

function patchContent(content, bundleKey) {
  let out = content;
  out = out.replace(GA_BLOCK, ANALYTICS);
  out = out.replace(
    /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-BJ23KLLWFM"><\/script>\s*<script>[\s\S]*?gtag\('config', 'G-BJ23KLLWFM'\);\s*<\/script>\s*/g,
    '<script src="/js/analytics.js" defer></script>\n    '
  );
  out = out.replace(STYLE_LINK, '\n' + cssLinks(CSS_BUNDLES[bundleKey]) + '\n');
  out = out.replace(/\/assets\/(blog_[a-z0-9_]+)\.png/g, '/assets/$1.webp');
  return out;
}

function walk(dir, ext, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', 'css'].includes(entry.name)) {
      walk(full, ext, out);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      out.push(full);
    }
  }
}

function bundleForFile(rel) {
  if (rel === 'index.html') return 'home';
  if (rel.startsWith('investors/') || rel === 'people/index.html') return 'directory';
  if (rel === 'login.html' || rel === 'contact.html' || rel === 'about.html') return 'login';
  if (rel.startsWith('blog/') || rel.startsWith('news/') || rel.startsWith('guide/')) return 'blog';
  return 'minimal';
}

const htmlFiles = [];
walk(ROOT, '.html', htmlFiles);

for (const file of htmlFiles) {
  const rel = path.relative(ROOT, file);
  const bundleKey = bundleForFile(rel);
  const patched = patchContent(fs.readFileSync(file, 'utf8'), bundleKey);
  fs.writeFileSync(file, patched);
  console.log(`${rel} -> ${bundleKey}`);
}

const jsFiles = [
  'api/news/article.js',
  'api/investors/detail.js',
  'utils/render-investor-page.js',
  'utils/render-person-page.js',
  'utils/render-sector-page.js',
  'utils/render-stage-page.js'
];

for (const rel of jsFiles) {
  const file = path.join(ROOT, rel);
  let src = fs.readFileSync(file, 'utf8');
  src = src.replace(
    /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-BJ23KLLWFM"><\/script>',\s*'[\s\S]*?gtag\('config', 'G-BJ23KLLWFM'\);\s*<\/script>',/,
    "'<script src=\\\"/js/analytics.js\\\" defer></script>',"
  );
  src = src.replace(
    /'<link rel="stylesheet" href="\/style\.css\?v=\d+">',/,
    ...(() => {
      const bundle = rel.includes('render-person') || rel.includes('render-investor') || rel.includes('detail.js')
        ? CSS_BUNDLES.directory
        : CSS_BUNDLES.directory;
      const lines = bundle.map((h) => `'${`<link rel="stylesheet" href="${h}?v=${CSS_V}">`.replace(/'/g, "\\'")}',`).join('\n    ');
      return [lines];
    })()
  );
  // Simpler manual replace for SSR templates
  src = src.replace(/\/style\.css\?v=\d+/g, `/css/base.css?v=${CSS_V}`);
  src = src.replace(
    /'<link rel="stylesheet" href="\/css\/base\.css\?v=\d+">',/,
    CSS_BUNDLES.directory.map((h) => `'${`<link rel="stylesheet" href="${h}?v=${CSS_V}">`}',`).join('\n    ')
  );
  src = src.replace(/\/assets\/(blog_[a-z0-9_]+)\.png/g, '/assets/$1.webp');
  fs.writeFileSync(file, src);
  console.log(`${rel} -> SSR patched`);
}

console.log('Done.');
