#!/usr/bin/env node
/**
 * Fetch profile photos for people who have a Twitter/X handle, using the
 * server-rendered `og:image` meta tag on the public profile page (no login
 * required — same mechanism Slack/Discord link previews rely on).
 *
 * Saves images under assets/people/ and writes data/people-photos.json
 * (also patches `photo` onto data/people.json, mirroring investor-logos.json).
 *
 * Usage:
 *   node scripts/fetch_people_twitter_photos.js               # dry run, no downloads
 *   node scripts/fetch_people_twitter_photos.js --run
 *   node scripts/fetch_people_twitter_photos.js --run --force
 *   node scripts/fetch_people_twitter_photos.js --run --limit=10
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PEOPLE_PATH = path.join(ROOT, 'data', 'people.json');
const PHOTOS_META_PATH = path.join(ROOT, 'data', 'people-photos.json');
const OUT_DIR = path.join(ROOT, 'assets', 'people');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const TIMEOUT_MS = 12000;

const args = process.argv.slice(2);
const RUN = args.includes('--run');
const FORCE = args.includes('--force');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Normalize the messy raw "Twitter URL" cell into a bare handle, or '' if unusable. */
function extractHandle(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(n\/?a|-|none|na)$/i.test(s)) return '';

  let candidate = '';
  const urlMatch = s.match(/(?:twitter\.com|x\.com)\/(@?[A-Za-z0-9_]+)/i);
  if (urlMatch) {
    candidate = urlMatch[1];
  } else {
    candidate = s;
  }
  candidate = candidate.replace(/^@/, '').trim();
  if (!candidate) return '';
  if (/^(home|i|share|intent|search|hashtag|explore|notifications|messages)$/i.test(candidate)) return '';
  if (!/^[A-Za-z0-9_]{1,15}$/.test(candidate)) return '';
  return candidate;
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
        Accept: options.accept || 'text/html,application/xhtml+xml',
        ...(options.headers || {})
      }
    });
  } finally {
    clearTimeout(t);
  }
}

async function fetchProfileImageUrl(handle) {
  const res = await fetchWithTimeout(`https://twitter.com/${encodeURIComponent(handle)}`);
  if (!res.ok) return { ok: false, reason: `http-${res.status}` };
  const html = await res.text();

  const m =
    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (!m) return { ok: false, reason: 'no-og-image' };

  const imgUrl = m[1];
  if (/default_profile/i.test(imgUrl)) return { ok: false, reason: 'default-avatar' };
  if (!/pbs\.twimg\.com\/profile_images/i.test(imgUrl)) return { ok: false, reason: 'unexpected-image-host' };

  return { ok: true, url: imgUrl };
}

function upgradeResolution(url) {
  return url.replace(/_(normal|bigger|200x200)(?=\.[a-z]+$)/i, '_400x400');
}

function extFromUrl(url) {
  const m = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return m ? m[1].toLowerCase() : 'jpg';
}

async function downloadImage(url) {
  const res = await fetchWithTimeout(url, { accept: 'image/avif,image/webp,image/*,*/*;q=0.8' });
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html')) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) return null;
  return buf;
}

function existingPhotoFile(slug) {
  if (!fs.existsSync(OUT_DIR)) return null;
  const found = fs.readdirSync(OUT_DIR).find((f) => f.startsWith(slug + '.'));
  return found ? path.join(OUT_DIR, found) : null;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const data = JSON.parse(fs.readFileSync(PEOPLE_PATH, 'utf8'));
  let photosMeta = {};
  if (fs.existsSync(PHOTOS_META_PATH)) {
    try {
      photosMeta = JSON.parse(fs.readFileSync(PHOTOS_META_PATH, 'utf8'));
    } catch (_) {}
  }

  let candidates = data.people
    .map((p) => ({ person: p, handle: extractHandle(p.twitter) }))
    .filter((c) => c.handle);

  console.log(`People with a usable Twitter/X handle: ${candidates.length} (of ${data.people.filter((p) => p.twitter).length} raw Twitter cells)`);

  if (LIMIT > 0) candidates = candidates.slice(0, LIMIT);

  if (!RUN) {
    console.log('\nDry run — no requests made. Sample:');
    candidates.slice(0, 15).forEach((c) => console.log(`  ${c.person.name.padEnd(24)} @${c.handle}`));
    console.log('\nRe-run with --run to actually fetch photos.');
    return;
  }

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const { person, handle } of candidates) {
    const existing = existingPhotoFile(person.slug);
    if (existing && !FORCE) {
      const rel = '/assets/people/' + path.basename(existing);
      photosMeta[person.slug] = { ...(photosMeta[person.slug] || {}), path: rel, handle };
      skipped++;
      console.log(`skip  ${person.name} (cached)`);
      continue;
    }

    try {
      const found = await fetchProfileImageUrl(handle);
      if (!found.ok) {
        failed++;
        console.log(`fail  ${person.name} @${handle} — ${found.reason}`);
        photosMeta[person.slug] = { ...(photosMeta[person.slug] || {}), handle, status: found.reason, checkedAt: new Date().toISOString() };
        await sleep(600);
        continue;
      }

      const hiRes = upgradeResolution(found.url);
      let buf = await downloadImage(hiRes);
      let usedUrl = hiRes;
      if (!buf) {
        buf = await downloadImage(found.url);
        usedUrl = found.url;
      }
      if (!buf) {
        failed++;
        console.log(`fail  ${person.name} @${handle} — download-failed`);
        await sleep(600);
        continue;
      }

      for (const f of fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR) : []) {
        if (f.startsWith(person.slug + '.')) fs.unlinkSync(path.join(OUT_DIR, f));
      }
      const ext = extFromUrl(usedUrl);
      const fileName = `${person.slug}.${ext}`;
      fs.writeFileSync(path.join(OUT_DIR, fileName), buf);

      const rel = '/assets/people/' + fileName;
      photosMeta[person.slug] = {
        path: rel,
        handle,
        source: 'twitter',
        from: usedUrl,
        bytes: buf.length,
        fetchedAt: new Date().toISOString()
      };
      ok++;
      console.log(`ok    ${person.name} @${handle} (${buf.length}b)`);
    } catch (err) {
      failed++;
      console.log(`fail  ${person.name} @${handle} — ${err.message}`);
    }

    await sleep(700); // gentle pacing against X
  }

  fs.writeFileSync(PHOTOS_META_PATH, JSON.stringify(photosMeta, null, 2));

  // Patch photo field onto data/people.json
  data.people.forEach((p) => {
    if (photosMeta[p.slug] && photosMeta[p.slug].path) {
      p.photo = photosMeta[p.slug].path;
    }
  });
  fs.writeFileSync(PEOPLE_PATH, JSON.stringify(data));

  console.log(`\nDone. ok=${ok} skipped=${skipped} failed=${failed}`);
  console.log(`Wrote ${PHOTOS_META_PATH}`);
  console.log(`Updated ${PEOPLE_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
