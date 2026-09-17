#!/usr/bin/env node
/**
 * Deeper Pass B: web-search for LinkedIn/Twitter for people with ZERO socials.
 * Uses DuckDuckGo HTML results only — never invents URLs. LinkedIn slugs must
 * match the person's name (see social_extract.linkedinSlugMatchesName).
 *
 * Stages → data/candidates/people-social-candidates.json
 * Apply with: node scripts/apply_people_socials.js --apply --methods search
 *
 * Usage:
 *   node scripts/search_zero_socials.js --dry-run --limit 20
 *   node scripts/search_zero_socials.js --limit 80
 *   node scripts/search_zero_socials.js --retry-failed --limit 50
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { fetchOne } = require('./lib/site_crawl');
const {
  personKey,
  normalizeLinkedIn,
  normalizeTwitter,
  linkedinSlugMatchesName,
  twitterHandleMatchesName
} = require('./lib/social_extract');

const ROOT = path.join(__dirname, '..');
const PEOPLE_CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const SOCIAL_CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-social-candidates.json');
const PROGRESS_PATH = path.join(__dirname, '.search_zero_socials_progress.json');

function parseArgs(argv) {
  const args = { limit: 60, start: 0, dryRun: false, retryFailed: false, delayMs: 1200 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--start') args.start = Number(argv[++i]);
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--retry-failed') args.retryFailed = true;
    else if (a === '--delay') args.delayMs = Number(argv[++i]);
  }
  return args;
}

function loadJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function emptySocial(v) {
  const s = String(v || '').trim();
  return !s || /^(n\/?a|-|none|na)$/i.test(s);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cleanName(name) {
  return String(name || '')
    .replace(/^(mr\.?|ms\.?|mrs\.?|smt\.?|dr\.?|ca\.?|prof\.?)\s+/i, '')
    .replace(/,.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function scorePerson(row) {
  const name = (row['First Name'] || '').trim();
  const tokens = cleanName(name).split(/\s+/).filter(Boolean);
  const title = row.Title || '';
  let s = 0;
  if (tokens.length >= 2) s += 3;
  if (tokens.length >= 3) s += 1;
  if (/founder|partner|managing|ceo|director|principal|chairman|gp\b/i.test(title)) s += 4;
  if (!/angel|individual|solo/i.test(row.Company || '')) s += 2;
  if (name.includes('@') || tokens.length < 2) s -= 10;
  return s;
}

function extractResultUrls(html) {
  const urls = [];
  const seen = new Set();
  const push = (u) => {
    try {
      const decoded = decodeURIComponent(String(u || '').replace(/\+/g, ' '));
      if (!decoded.startsWith('http')) return;
      if (seen.has(decoded)) return;
      seen.add(decoded);
      urls.push(decoded);
    } catch {
      /* ignore */
    }
  };
  const uddg = [...String(html || '').matchAll(/uddg=([^&"]+)/gi)];
  for (const m of uddg) push(m[1]);
  const hrefs = [...String(html || '').matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)];
  for (const m of hrefs) push(m[1]);
  return urls;
}

async function ddgSearch(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetchOne(url, 12000);
  if (!res.ok || !res.html) return { ok: false, urls: [], html: '' };
  return { ok: true, urls: extractResultUrls(res.html), html: res.html };
}

function pickSocials(urls, name) {
  let linkedinUrl = '';
  let twitterUrl = '';
  const evidence = [];
  for (const u of urls) {
    if (!linkedinUrl) {
      const li = normalizeLinkedIn(u);
      if (li && linkedinSlugMatchesName(li, name)) {
        linkedinUrl = li;
        evidence.push({ type: 'linkedin', url: li, via: 'ddg' });
      }
    }
    if (!twitterUrl) {
      const tw = normalizeTwitter(u);
      if (tw && twitterHandleMatchesName(tw, name)) {
        twitterUrl = tw;
        evidence.push({ type: 'twitter', url: tw, via: 'ddg' });
      }
    }
    if (linkedinUrl && twitterUrl) break;
  }
  return { linkedinUrl, twitterUrl, evidence };
}

function upsertFound(candidates, entry) {
  const idx = candidates.found.findIndex((f) => f.key === entry.key);
  if (idx >= 0) {
    const prev = candidates.found[idx];
    candidates.found[idx] = {
      ...prev,
      ...entry,
      linkedinUrl: entry.linkedinUrl || prev.linkedinUrl || '',
      twitterUrl: entry.twitterUrl || prev.twitterUrl || ''
    };
  } else {
    candidates.found.push(entry);
  }
}

function buildQueue() {
  const rows = parse(fs.readFileSync(PEOPLE_CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });
  return rows
    .filter((r) => emptySocial(r['LinkedIn URL']) && emptySocial(r['Twitter URL']))
    .filter((r) => (r['First Name'] || '').trim() && (r.Company || '').trim())
    .map((r) => ({
      name: (r['First Name'] || '').trim(),
      company: (r.Company || '').trim(),
      title: (r.Title || '').trim(),
      key: personKey(r['First Name'], r.Company),
      score: scorePerson(r),
      searchName: cleanName(r['First Name'] || '')
    }))
    .filter((p) => p.searchName.split(/\s+/).length >= 2 && p.score >= 4)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

async function searchOne(person) {
  const queries = [
    `"${person.searchName}" "${person.company}" linkedin`,
    `"${person.searchName}" ${person.company} site:linkedin.com/in`,
    `"${person.searchName}" investor OR venture OR partner linkedin`
  ];

  const allUrls = [];
  for (const q of queries) {
    const res = await ddgSearch(q);
    if (res.ok) allUrls.push(...res.urls);
    await sleep(400);
    const hit = pickSocials(allUrls, person.searchName);
    // Also try original name (with titles) for slug match fallback
    const hit2 = pickSocials(allUrls, person.name);
    const linkedinUrl = hit.linkedinUrl || hit2.linkedinUrl;
    const twitterUrl = hit.twitterUrl || hit2.twitterUrl;
    if (linkedinUrl || twitterUrl) {
      return {
        ok: true,
        linkedinUrl,
        twitterUrl,
        sourceUrl: `ddg:${q}`,
        method: 'search',
        confidence: linkedinUrl && queries.indexOf(q) === 0 ? 'high' : 'medium'
      };
    }
  }
  return { ok: false, reason: 'no-matching-social-in-search' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const queue = buildQueue();
  const progress = loadJson(PROGRESS_PATH, { done: {} });
  const candidates = loadJson(SOCIAL_CANDIDATES_PATH, {
    generatedAt: null,
    schemaVersion: 1,
    found: [],
    unresolved: []
  });

  const pending = queue.filter((p) => {
    const status = progress.done[p.key];
    if (!status) return true;
    if (args.retryFailed && status === 'unresolved') return true;
    return false;
  });

  console.log(`Unvalidated multi-token priority queue: ${queue.length}. Pending: ${pending.length}.`);
  const slice = pending.slice(args.start, args.start + args.limit);
  console.log(`This run: ${slice.length}\n`);

  if (args.dryRun) {
    slice.forEach((p, i) => console.log(`  ${i + 1}. [${p.score}] ${p.name} | ${p.company}`));
    return;
  }

  let found = 0;
  let unresolved = 0;
  for (let i = 0; i < slice.length; i++) {
    const p = slice[i];
    process.stdout.write(`[${i + 1}/${slice.length}] ${p.name} @ ${p.company} ... `);
    try {
      const res = await searchOne(p);
      if (res.ok) {
        upsertFound(candidates, {
          key: p.key,
          name: p.name,
          company: p.company,
          title: p.title,
          linkedinUrl: res.linkedinUrl || '',
          twitterUrl: res.twitterUrl || '',
          sourceUrl: res.sourceUrl || '',
          method: 'search',
          confidence: res.confidence || 'medium',
          companyType: ''
        });
        progress.done[p.key] = 'found';
        found++;
        console.log(`OK li=${res.linkedinUrl || '-'} tw=${res.twitterUrl || '-'}`);
      } else {
        progress.done[p.key] = 'unresolved';
        unresolved++;
        console.log(res.reason || 'unresolved');
      }
    } catch (err) {
      progress.done[p.key] = 'unresolved';
      unresolved++;
      console.log(`error: ${err.message || err}`);
    }
    if ((i + 1) % 5 === 0) {
      candidates.generatedAt = new Date().toISOString();
      saveJson(SOCIAL_CANDIDATES_PATH, candidates);
      saveJson(PROGRESS_PATH, progress);
    }
    await sleep(args.delayMs);
  }

  candidates.generatedAt = new Date().toISOString();
  saveJson(SOCIAL_CANDIDATES_PATH, candidates);
  saveJson(PROGRESS_PATH, progress);
  console.log(`\nDone. Found: ${found}. Unresolved: ${unresolved}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
