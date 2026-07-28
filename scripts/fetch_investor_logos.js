#!/usr/bin/env node
/**
 * Fetch investor logos from websites (apple-touch / favicon / og:image)
 * with Google favicon fallback. Saves under assets/investors/ and writes
 * data/investor-logos.json (also patches logo onto data/investors.json).
 *
 * Usage:
 *   node scripts/fetch_investor_logos.js
 *   node scripts/fetch_investor_logos.js --limit=20
 *   node scripts/fetch_investor_logos.js --force
 *   node scripts/fetch_investor_logos.js --slug=kalaari-capital
 */
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.join(__dirname, '..');
const INVESTORS_PATH = path.join(ROOT, 'data', 'investors.json');
const LOGOS_META_PATH = path.join(ROOT, 'data', 'investor-logos.json');
const OUT_DIR = path.join(ROOT, 'assets', 'investors');

const UA =
  'Mozilla/5.0 (compatible; VCDekhoLogoBot/1.0; +https://vcdekho.com)';
const CONCURRENCY = 6;
const TIMEOUT_MS = 12000;

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : 0;
const slugArg = args.find((a) => a.startsWith('--slug='));
const ONLY_SLUG = slugArg ? slugArg.split('=')[1] : '';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hostnameFromWebsite(website) {
  if (!website) return '';
  let raw = String(website).trim();
  if (!raw || /nowebsite/i.test(raw)) return '';
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  try {
    const u = new URL(raw);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch (_) {
    return '';
  }
}

function absoluteUrl(href, base) {
  if (!href) return null;
  const h = String(href).trim().replace(/^['"]|['"]$/g, '');
  if (!h || h.startsWith('data:')) return null;
  try {
    return new URL(h, base).toString();
  } catch (_) {
    return null;
  }
}

function extFromContentType(ct, fallbackUrl) {
  const c = String(ct || '').toLowerCase();
  if (c.includes('svg')) return 'svg';
  if (c.includes('webp')) return 'webp';
  if (c.includes('jpeg') || c.includes('jpg')) return 'jpg';
  if (c.includes('gif')) return 'gif';
  if (c.includes('ico') || c.includes('icon')) return 'ico';
  if (c.includes('png')) return 'png';
  const m = String(fallbackUrl || '').match(/\.(svg|webp|jpe?g|gif|ico|png)(?:\?|$)/i);
  if (m) return m[1].toLowerCase().replace('jpeg', 'jpg');
  return 'png';
}

function parseIconCandidates(html, pageUrl) {
  const out = [];
  const push = (href, score) => {
    const abs = absoluteUrl(href, pageUrl);
    if (!abs) return;
    out.push({ url: abs, score });
  };

  const linkRe =
    /<link\b([^>]*?)>/gi;
  let m;
  while ((m = linkRe.exec(html))) {
    const attrs = m[1];
    const relM = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i);
    const hrefM = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!relM || !hrefM) continue;
    const rel = relM[1].toLowerCase();
    const href = hrefM[1];
    if (rel.includes('apple-touch-icon')) push(href, 100);
    else if (rel === 'icon' || rel.includes('shortcut icon') || rel.includes('mask-icon')) {
      const sizeM = attrs.match(/\bsizes\s*=\s*["']([^"']+)["']/i);
      const size = sizeM ? parseInt(sizeM[1], 10) || 0 : 0;
      push(href, 60 + Math.min(size, 256) / 10);
    }
  }

  const ogRe =
    /<meta\b[^>]*property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>/i;
  const ogRe2 =
    /<meta\b[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:image["'][^>]*>/i;
  const og = html.match(ogRe) || html.match(ogRe2);
  if (og) push(og[1], 40);

  // common defaults
  try {
    const origin = new URL(pageUrl).origin;
    push(origin + '/apple-touch-icon.png', 30);
    push(origin + '/favicon.ico', 20);
    push(origin + '/favicon.png', 25);
  } catch (_) {}

  out.sort((a, b) => b.score - a.score);
  const seen = new Set();
  return out.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

async function fetchWithTimeout(url, options = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: options.accept || '*/*',
        ...(options.headers || {})
      }
    });
  } finally {
    clearTimeout(t);
  }
}

async function downloadImage(url) {
  const res = await fetchWithTimeout(url, {
    accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
  });
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html')) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 40 || buf.length > 2_500_000) return null;
  // Reject obvious HTML payloads
  const head = buf.slice(0, 64).toString('utf8').toLowerCase();
  if (head.includes('<!doctype') || head.includes('<html')) return null;
  return { buf, contentType: ct, url };
}

async function fetchPageIcons(website) {
  let raw = String(website).trim();
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  const candidates = [];
  try {
    const res = await fetchWithTimeout(raw, { accept: 'text/html,application/xhtml+xml' });
    if (res.ok) {
      const html = await res.text();
      const finalUrl = res.url || raw;
      candidates.push(...parseIconCandidates(html.slice(0, 250000), finalUrl));
    }
  } catch (_) {}

  const host = hostnameFromWebsite(website);
  if (host) {
    candidates.push({
      url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
      score: 10,
      source: 'google'
    });
    candidates.push({
      url: `https://icons.duckduckgo.com/ip3/${host}.ico`,
      score: 8,
      source: 'duckduckgo'
    });
  }

  const seen = new Set();
  for (const c of candidates) {
    if (!c.url || seen.has(c.url)) continue;
    seen.add(c.url);
    try {
      const img = await downloadImage(c.url);
      if (img) {
        return {
          ...img,
          source: c.source || 'website'
        };
      }
    } catch (_) {}
  }
  return null;
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let idx = 0;
  async function run() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i], i);
    }
  }
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

function existingLogoFile(slug) {
  if (!fs.existsSync(OUT_DIR)) return null;
  const found = fs.readdirSync(OUT_DIR).find((f) => f.startsWith(slug + '.'));
  return found ? path.join(OUT_DIR, found) : null;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const data = JSON.parse(fs.readFileSync(INVESTORS_PATH, 'utf8'));
  let logosMeta = {};
  if (fs.existsSync(LOGOS_META_PATH)) {
    try {
      logosMeta = JSON.parse(fs.readFileSync(LOGOS_META_PATH, 'utf8'));
    } catch (_) {
      logosMeta = {};
    }
  }

  let list = data.investors.filter((i) => hostnameFromWebsite(i.website));
  if (ONLY_SLUG) list = list.filter((i) => i.slug === ONLY_SLUG);
  if (LIMIT > 0) list = list.slice(0, LIMIT);

  console.log(`Fetching logos for ${list.length} investors (concurrency ${CONCURRENCY})…`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  await mapPool(list, CONCURRENCY, async (inv) => {
    const existing = existingLogoFile(inv.slug);
    if (existing && !FORCE) {
      const rel = '/assets/investors/' + path.basename(existing);
      logosMeta[inv.slug] = {
        ...(logosMeta[inv.slug] || {}),
        path: rel,
        source: (logosMeta[inv.slug] && logosMeta[inv.slug].source) || 'cached',
        fetchedAt: (logosMeta[inv.slug] && logosMeta[inv.slug].fetchedAt) || new Date().toISOString()
      };
      inv.logo = rel;
      skipped++;
      process.stdout.write(`skip  ${inv.slug}\n`);
      return;
    }

    try {
      const img = await fetchPageIcons(inv.website);
      if (!img) {
        failed++;
        process.stdout.write(`fail  ${inv.slug}\n`);
        return;
      }
      // clear old extensions for this slug
      for (const f of fs.readdirSync(OUT_DIR)) {
        if (f.startsWith(inv.slug + '.')) fs.unlinkSync(path.join(OUT_DIR, f));
      }
      const ext = extFromContentType(img.contentType, img.url);
      const fileName = `${inv.slug}.${ext}`;
      const abs = path.join(OUT_DIR, fileName);
      fs.writeFileSync(abs, img.buf);
      const rel = '/assets/investors/' + fileName;
      logosMeta[inv.slug] = {
        path: rel,
        source: img.source,
        contentType: img.contentType,
        bytes: img.buf.length,
        fetchedAt: new Date().toISOString(),
        from: img.url
      };
      inv.logo = rel;
      ok++;
      process.stdout.write(`ok    ${inv.slug} (${img.source}, ${img.buf.length}b)\n`);
    } catch (err) {
      failed++;
      process.stdout.write(`fail  ${inv.slug} ${err.message}\n`);
    }
    await sleep(40);
  });

  // Merge logos onto all investors from meta (including ones not in this run)
  data.investors.forEach((inv) => {
    if (logosMeta[inv.slug] && logosMeta[inv.slug].path) {
      inv.logo = logosMeta[inv.slug].path;
    }
  });

  fs.writeFileSync(LOGOS_META_PATH, JSON.stringify(logosMeta, null, 2));
  fs.writeFileSync(INVESTORS_PATH, JSON.stringify(data));
  console.log(`\nDone. ok=${ok} skipped=${skipped} failed=${failed}`);
  console.log(`Wrote ${LOGOS_META_PATH}`);
  console.log(`Updated ${INVESTORS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
