#!/usr/bin/env node
/**
 * Mirrors the Google Fonts payload locally so pages stop paying two
 * cross-origin handshakes (fonts.googleapis.com -> fonts.gstatic.com) before
 * text can render.
 *
 * Rendering must not change, so this deliberately does NOT subset, re-encode,
 * or collapse anything:
 *
 *  - The woff2 binaries are byte-for-byte what fonts.gstatic.com serves.
 *  - Every @font-face keeps Google's exact font-weight/style/display and
 *    unicode-range values; only the src URL is rewritten.
 *
 * That last point matters more than it looks. Plus Jakarta Sans is a variable
 * font: all weights point at the same file, and Google emits one @font-face
 * per discrete weight. The stylesheets use font-weight 650 and 800, which are
 * not declared, so the browser snaps them to the nearest declared face (700).
 * Collapsing these into a single `font-weight: 200 900` face would make 650
 * and 800 render at their true variable weights — visibly lighter/heavier text.
 *
 * Usage: node scripts/build_fonts.js [--check]
 *   --check  verify local files still match Google (no writes)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const FONT_DIR = path.join(ROOT, 'assets', 'fonts');
const CSS_OUT = path.join(ROOT, 'css', 'fonts.css');
const MANIFEST = path.join(ROOT, 'data', 'fonts.manifest.json');

// Union of the two variants previously requested across the site (some pages
// asked for 400-700, others 300-700). Both resolve to the same 8 files.
const GOOGLE_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1' +
  '&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap';

// woff2 is only served to browsers that advertise support.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/128.0.0.0 Safari/537.36';

const CHECK_ONLY = process.argv.includes('--check');

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Split Google's stylesheet into blocks, keeping the `/* subset *​/` label. */
function parseFontFaces(css) {
  const blocks = [];
  const re = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/gi;
  let match;
  while ((match = re.exec(css))) {
    const [, subset, body] = match;
    const field = (name) => {
      const m = body.match(new RegExp(name + ':\\s*([^;]+);'));
      return m ? m[1].trim() : null;
    };
    const srcMatch = body.match(/url\(([^)]+)\)/);
    blocks.push({
      subset,
      family: (field('font-family') || '').replace(/^['"]|['"]$/g, ''),
      style: field('font-style'),
      weight: field('font-weight'),
      display: field('font-display'),
      unicodeRange: field('unicode-range'),
      url: srcMatch ? srcMatch[1] : null
    });
  }
  return blocks;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

async function fetchBinary(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function main() {
  console.log('Fetching Google Fonts stylesheet...');
  const googleCss = await fetchText(GOOGLE_CSS_URL);
  const faces = parseFontFaces(googleCss);
  if (!faces.length) throw new Error('Parsed 0 @font-face blocks — Google response format changed?');

  const incomplete = faces.filter((f) => !f.url || !f.family || !f.weight || !f.unicodeRange);
  if (incomplete.length) throw new Error(`${incomplete.length} @font-face blocks missing fields`);

  // Many faces share one file (variable font): download each URL once.
  const byUrl = new Map();
  faces.forEach((f) => {
    if (byUrl.has(f.url)) return;
    const italic = f.style === 'italic' ? '-italic' : '';
    byUrl.set(f.url, { filename: `${slug(f.family)}${italic}-${f.subset}.woff2` });
  });

  console.log(`Parsed ${faces.length} @font-face blocks -> ${byUrl.size} unique files`);

  if (!CHECK_ONLY) fs.mkdirSync(FONT_DIR, { recursive: true });

  const manifest = [];
  let mismatches = 0;

  for (const [url, info] of byUrl) {
    const remote = await fetchBinary(url);
    const digest = sha(remote);
    const dest = path.join(FONT_DIR, info.filename);

    if (CHECK_ONLY) {
      if (!fs.existsSync(dest)) {
        console.log(`  MISSING ${info.filename}`);
        mismatches++;
      } else if (sha(fs.readFileSync(dest)) !== digest) {
        console.log(`  CHANGED ${info.filename} — Google now serves different bytes`);
        mismatches++;
      }
    } else {
      fs.writeFileSync(dest, remote);
      console.log(`  ${info.filename.padEnd(44)} ${String(Math.round(remote.length / 1024)).padStart(3)}KB`);
    }
    manifest.push({ file: info.filename, bytes: remote.length, sha256: digest, source: url });
  }

  if (CHECK_ONLY) {
    console.log(mismatches ? `\n${mismatches} file(s) differ from Google.` : '\nAll local font files match Google byte-for-byte.');
    process.exit(mismatches ? 1 : 0);
  }

  const css = [
    '/*',
    ' * Self-hosted mirror of Google Fonts — generated by scripts/build_fonts.js.',
    ' * Do not hand-edit: descriptors are copied verbatim from Google so text',
    ' * renders identically. Run `node scripts/build_fonts.js` to regenerate.',
    ' */'
  ]
    .concat(
      faces.map((f) =>
        [
          `/* ${f.subset} */`,
          '@font-face {',
          `  font-family: '${f.family}';`,
          `  font-style: ${f.style};`,
          `  font-weight: ${f.weight};`,
          `  font-display: ${f.display};`,
          `  src: url(/assets/fonts/${byUrl.get(f.url).filename}) format('woff2');`,
          `  unicode-range: ${f.unicodeRange};`,
          '}'
        ].join('\n')
      )
    )
    .join('\n');

  fs.writeFileSync(CSS_OUT, css + '\n');
  fs.writeFileSync(
    MANIFEST,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), source: GOOGLE_CSS_URL, faces: faces.length, files: manifest },
      null,
      2
    ) + '\n'
  );

  console.log(`\nWrote ${faces.length} @font-face rules -> css/fonts.css (${Math.round(css.length / 1024)}KB)`);
  console.log(`Wrote checksums -> data/fonts.manifest.json`);
}

main().catch((err) => {
  console.error('build_fonts failed:', err.message);
  process.exit(1);
});
