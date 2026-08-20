#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { renderFontLinks } = require('../utils/font-assets');

const FONT_BLOCK = '    ' + renderFontLinks().join('\n    ');
const SSR_FONT_BLOCK = FONT_BLOCK;

function patchHtml(file) {
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/style\.css\?v=\d+/g, 'style.css?v=64');
  if (!html.includes('/css/fonts.css')) {
    html = html.replace(
      /(<meta name="viewport"[^>]*>)/,
      `$1\n${FONT_BLOCK}`
    );
  }
  html = html.replace(/<script src="\/app.js"><\/script>/g, '<script src="/app.js" defer></script>');
  html = html.replace(/<script src="\/blog\/blog.js"><\/script>/g, '<script src="/blog/blog.js" defer></script>');
  html = html.replace(/<script src="\/js\/auth.js"><\/script>/g, '<script src="/js/auth.js" defer></script>');
  html = html.replace(
    /<script src="\/js\/auth-guard.js(\?v=\d+)?"><\/script>/g,
    '<script src="/js/auth-guard.js?v=25" defer></script>'
  );
  html = html.replace(
    /<script src="\/investors\/investors.js(\?v=\d+)?"><\/script>/g,
    '<script src="/investors/investors.js?v=31" defer></script>'
  );
  html = html.replace(
    /<script src="\/people\/people.js(\?v=\d+)?"><\/script>/g,
    '<script src="/js/people.js?v=118" defer></script>'
  );
  html = html.replace(/<script src="\/login.js"><\/script>/g, '<script src="/login.js" defer></script>');
  fs.writeFileSync(file, html);
}

function patchBlogImages(file) {
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(
    /(<img src="\/assets\/blog_[^"]+" alt="[^"]+" class="blog-image")(?! loading=)/g,
    '$1 loading="lazy"'
  );
  html = html.replace(
    /(<img src="\/assets\/blog_vc_dekho_cta.png" alt="[^"]+" class="blog-cta-bg")(?! loading=)/g,
    '$1 loading="lazy"'
  );
  fs.writeFileSync(file, html);
}

function patchJs(file) {
  let src = fs.readFileSync(file, 'utf8');
  src = src.replace(/style\.css\?v=\d+/g, 'style.css?v=64');
  if (!src.includes('/css/fonts.css') && src.includes('<meta name="viewport"')) {
    src = src.replace(
      /(<meta name="viewport"[^>]*>)/,
      `$1\n${SSR_FONT_BLOCK}`
    );
  }
  src = src.replace(/<script src="\/app.js"><\/script>/g, '<script src="/app.js" defer></script>');
  fs.writeFileSync(file, src);
}

function walk(dir, ext, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      walk(full, ext, out);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      out.push(full);
    }
  }
}

const htmlFiles = [];
walk(ROOT, '.html', htmlFiles);
htmlFiles.forEach(patchHtml);

const blogPosts = htmlFiles.filter((f) => f.includes(`${path.sep}blog${path.sep}`) && !f.endsWith('index.html'));
blogPosts.forEach(patchBlogImages);

[
  'api/news/article.js',
  'api/investors/detail.js',
  'utils/render-investor-page.js',
  'utils/render-person-page.js',
  'utils/render-sector-page.js',
  'utils/render-stage-page.js'
].forEach((rel) => patchJs(path.join(ROOT, rel)));

console.log(`Patched ${htmlFiles.length} HTML files and 6 SSR templates.`);
