#!/usr/bin/env node
/**
 * Validation pass: people with ZERO socials (no LinkedIn AND no Twitter) are
 * treated as unvalidated contacts. This script prioritizes them and harvests
 * LinkedIn/Twitter from grounded sources only:
 *   1) people-candidates sourceUrl (team page that named them)
 *   2) firm website team crawl
 *
 * Stages into data/candidates/people-social-candidates.json.
 * Apply with: node scripts/apply_people_socials.js --apply
 *
 * Usage:
 *   node scripts/enrich_zero_socials.js --dry-run --limit 30
 *   node scripts/enrich_zero_socials.js --limit 150
 *   node scripts/enrich_zero_socials.js --retry-failed --limit 100
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { crawlForTeamPage, fetchOne } = require('./lib/site_crawl');
const {
  extractSocialsNearName,
  personKey,
  normalizeLinkedIn,
  normalizeTwitter
} = require('./lib/social_extract');

const ROOT = path.join(__dirname, '..');
const PEOPLE_CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const INVESTORS_JSON_PATH = path.join(ROOT, 'data', 'investors.json');
const PEOPLE_JSON_PATH = path.join(ROOT, 'data', 'people.json');
const PEOPLE_CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');
const SOCIAL_CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-social-candidates.json');
const PROGRESS_PATH = path.join(__dirname, '.enrich_zero_socials_progress.json');

function parseArgs(argv) {
  const args = { limit: 100, start: 0, dryRun: false, retryFailed: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--start') args.start = Number(argv[++i]);
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--retry-failed') args.retryFailed = true;
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

function buildZeroQueue() {
  const rows = parse(fs.readFileSync(PEOPLE_CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });
  const peopleData = loadJson(PEOPLE_JSON_PATH, { people: [] });
  const investors = loadJson(INVESTORS_JSON_PATH, { investors: [] }).investors || [];
  const orgBySlug = new Map(investors.map((inv) => [inv.slug, inv]));
  const peopleCand = loadJson(PEOPLE_CANDIDATES_PATH, { found: [] });
  const sourceByKey = new Map();
  for (const c of peopleCand.found || []) {
    const k = personKey(c.name, c.company);
    if (c.sourceUrl && !sourceByKey.has(k)) sourceByKey.set(k, c.sourceUrl);
  }

  const queue = [];
  for (const row of rows) {
    const name = (row['First Name'] || '').trim();
    const company = (row.Company || '').trim();
    if (!name || !company) continue;
    if (!emptySocial(row['LinkedIn URL']) || !emptySocial(row['Twitter URL'])) continue;

    const personJson =
      (peopleData.people || []).find(
        (p) =>
          p.name.toLowerCase() === name.toLowerCase() &&
          String(p.company || '').toLowerCase() === company.toLowerCase()
      ) || null;
    const slug = personJson?.companySlug || '';
    const org = slug ? orgBySlug.get(slug) : null;
    const website = (org && org.website) || '';
    const sourceUrl = sourceByKey.get(personKey(name, company)) || '';
    const tokens = name.split(/\s+/).filter(Boolean).length;

    queue.push({
      name,
      company,
      title: (row.Title || '').trim() || personJson?.title || '',
      website,
      sourceUrl,
      companyType: (org && org.type) || personJson?.companyType || '',
      key: personKey(name, company),
      nameTokens: tokens
    });
  }

  // Prefer: has sourceUrl, multi-token names, VC types
  const typeRank = (t) => {
    if (/venture capital/i.test(t)) return 0;
    if (/private equity/i.test(t)) return 1;
    if (/accelerator|incubator/i.test(t)) return 2;
    if (/corporate|cvc/i.test(t)) return 3;
    if (/angel/i.test(t)) return 4;
    return 5;
  };
  queue.sort((a, b) => {
    const aSrc = a.sourceUrl ? 0 : 1;
    const bSrc = b.sourceUrl ? 0 : 1;
    if (aSrc !== bSrc) return aSrc - bSrc;
    if (a.nameTokens !== b.nameTokens) return b.nameTokens - a.nameTokens;
    return typeRank(a.companyType) - typeRank(b.companyType) || a.name.localeCompare(b.name);
  });
  return queue;
}

async function harvestZero(person) {
  const pages = [];
  const tried = new Set();

  async function add(url) {
    if (!url || tried.has(url)) return;
    tried.add(url);
    const res = await fetchOne(url, 10000);
    if (res.ok && res.html) pages.push({ url: res.finalUrl || url, html: res.html });
  }

  if (person.sourceUrl) await add(person.sourceUrl);
  if (person.website) {
    const crawl = await crawlForTeamPage(person.website);
    if (crawl.ok && crawl.html) {
      pages.push({ url: crawl.sourceUrl, html: crawl.html });
    }
  }

  if (!pages.length) {
    return { ok: false, reason: person.sourceUrl || person.website ? 'fetch-failed' : 'no-source' };
  }

  let linkedinUrl = '';
  let twitterUrl = '';
  let sourceUrl = '';
  for (const page of pages) {
    const hit = extractSocialsNearName(page.html, person.name);
    if (hit.linkedinUrl && !linkedinUrl) {
      linkedinUrl = normalizeLinkedIn(hit.linkedinUrl);
      sourceUrl = sourceUrl || page.url;
    }
    if (hit.twitterUrl && !twitterUrl) {
      twitterUrl = normalizeTwitter(hit.twitterUrl);
      sourceUrl = sourceUrl || page.url;
    }
  }

  if (!linkedinUrl && !twitterUrl) {
    return { ok: false, reason: 'no-socials-near-name', sourceUrl: pages[0].url };
  }
  return { ok: true, linkedinUrl, twitterUrl, sourceUrl, method: 'harvest' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const queue = buildZeroQueue();
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

  console.log(`Zero-social people: ${queue.length}. Pending: ${pending.length}.`);
  const slice = pending.slice(args.start, args.start + args.limit);
  console.log(`This run: ${slice.length}\n`);

  if (args.dryRun) {
    slice.forEach((p, i) =>
      console.log(
        `  ${i + 1}. ${p.name} | ${p.company} | src=${p.sourceUrl || '-'} | site=${p.website || '-'}`
      )
    );
    return;
  }

  let found = 0;
  let unresolved = 0;
  for (let i = 0; i < slice.length; i++) {
    const p = slice[i];
    process.stdout.write(`[${i + 1}/${slice.length}] ${p.name} @ ${p.company} ... `);
    try {
      const res = await harvestZero(p);
      if (res.ok) {
        upsertFound(candidates, {
          key: p.key,
          name: p.name,
          company: p.company,
          title: p.title,
          linkedinUrl: res.linkedinUrl || '',
          twitterUrl: res.twitterUrl || '',
          sourceUrl: res.sourceUrl || '',
          method: 'harvest',
          confidence: 'high',
          companyType: p.companyType
        });
        progress.done[p.key] = 'found';
        found++;
        console.log(
          `OK li=${res.linkedinUrl ? 'yes' : 'no'} tw=${res.twitterUrl ? 'yes' : 'no'}`
        );
      } else {
        progress.done[p.key] = 'unresolved';
        unresolved++;
        candidates.unresolved = candidates.unresolved || [];
        if (!candidates.unresolved.some((u) => u.key === p.key)) {
          candidates.unresolved.push({
            key: p.key,
            name: p.name,
            company: p.company,
            reason: res.reason,
            sourceUrl: res.sourceUrl || p.sourceUrl || '',
            method: 'harvest'
          });
        }
        console.log(res.reason || 'unresolved');
      }
    } catch (err) {
      progress.done[p.key] = 'unresolved';
      unresolved++;
      console.log(`error: ${err.message || err}`);
    }
    if ((i + 1) % 10 === 0) {
      candidates.generatedAt = new Date().toISOString();
      saveJson(SOCIAL_CANDIDATES_PATH, candidates);
      saveJson(PROGRESS_PATH, progress);
    }
  }

  candidates.generatedAt = new Date().toISOString();
  saveJson(SOCIAL_CANDIDATES_PATH, candidates);
  saveJson(PROGRESS_PATH, progress);
  console.log(`\nDone. Found socials: ${found}. Unresolved: ${unresolved}.`);
  console.log(`Staged → ${SOCIAL_CANDIDATES_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
