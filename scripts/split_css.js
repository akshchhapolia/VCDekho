#!/usr/bin/env node
/**
 * Split monolithic style.css into page-specific bundles.
 * Run: node scripts/split_css.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const lines = css.split('\n');

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n') + '\n';
}

const bundles = {
  'css/base.css': slice(1, 229),
  'css/hero.css': slice(230, 506),
  'css/ambient.css': slice(507, 968),
  'css/blog.css': slice(969, 2263),
  'css/directory.css': slice(2264, lines.length)
};

fs.mkdirSync(path.join(ROOT, 'css'), { recursive: true });

for (const [rel, content] of Object.entries(bundles)) {
  fs.writeFileSync(path.join(ROOT, rel), content);
  const kb = (Buffer.byteLength(content) / 1024).toFixed(1);
  console.log(`${rel}: ${kb} KB`);
}

// Keep style.css as full bundle for backwards compatibility during transition
console.log(`style.css (full): ${(Buffer.byteLength(css) / 1024).toFixed(1)} KB`);
