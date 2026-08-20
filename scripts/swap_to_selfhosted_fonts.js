#!/usr/bin/env node
/**
 * One-time codemod: point HTML pages at the self-hosted font CSS instead of
 * fonts.googleapis.com. Run once, then delete.
 *
 * Removes the two now-pointless font preconnects, and swaps the Google
 * stylesheet for a same-origin one plus preloads of the two latin woff2 files
 * (every page renders latin text, so those two always download).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const PRECONNECT_RE =
  /^[ \t]*<link rel="preconnect" href="https:\/\/fonts\.(?:googleapis|gstatic)\.com"[^>]*>[ \t]*\r?\n/gm;
const GOOGLE_CSS_RE =
  /^([ \t]*)<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*">[ \t]*$/gm;

function replacementBlock(indent) {
  return [
    `${indent}<link rel="preload" href="/assets/fonts/plus-jakarta-sans-latin.woff2" as="font" type="font/woff2" crossorigin>`,
    `${indent}<link rel="preload" href="/assets/fonts/instrument-serif-latin.woff2" as="font" type="font/woff2" crossorigin>`,
    `${indent}<link rel="stylesheet" href="/css/fonts.css?v=1">`
  ].join('\n');
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
}

const files = [];
walk(ROOT, files);

let changed = 0;
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  if (!before.includes('fonts.googleapis.com')) continue;

  let after = before.replace(PRECONNECT_RE, '');
  after = after.replace(GOOGLE_CSS_RE, (_m, indent) => replacementBlock(indent));

  if (after.includes('fonts.googleapis.com') || after.includes('fonts.gstatic.com')) {
    console.log(`  SKIPPED (leftover google reference): ${path.relative(ROOT, file)}`);
    continue;
  }
  if (after === before) continue;

  fs.writeFileSync(file, after);
  changed++;
  console.log(`  ${path.relative(ROOT, file)}`);
}

console.log(`\nSwapped ${changed} HTML files to self-hosted fonts.`);
