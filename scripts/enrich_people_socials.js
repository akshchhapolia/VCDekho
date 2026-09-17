#!/usr/bin/env node
/**
 * Pass A: harvest LinkedIn / Twitter URLs for existing People from their
 * firm's team/about pages (and optional prior candidate source URLs).
 *
 * Grounded only — URLs must appear near the person's name in fetched HTML.
 * Stages results in data/candidates/people-social-candidates.json.
 * Does NOT write the Individuals CSV (use apply_people_socials.js).
 *
 * Usage:
 *   node scripts/enrich_people_socials.js --dry-run --limit 20
 *   node scripts/enrich_people_socials.js --limit 50
 *   node scripts/enrich_people_socials.js --limit 500 --need linkedin
 *   node scripts/enrich_people_socials.js --retry-failed --limit 50
 *   node scripts/enrich_people_socials.js --merge path/to/batch.json
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { crawlForTeamPage, fetchOne } = require('./lib/site_crawl');
const { extractSocialsNearName, personKey, normalizeLinkedIn, normalizeTwitter } = require('./lib/social_extract');

const ROOT = path.join(__dirname, '..');
const PEOPLE_CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const PEOPLE_JSON_PATH = path.join(ROOT, 'data', 'people.json');
const INVESTORS_JSON_PATH = path.join(ROOT, 'data', 'investors.json');
const PEOPLE_CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');
const SOCIAL_CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-social-candidates.json');
const PROGRESS_PATH = path.join(__dirname, '.enrich_people_socials_progress.json');

function parseArgs(argv) {
  const args = {
    limit: 50,
    start: 0,
    dryRun: false,
    retryFailed: false,
    need: 'any', // any | linkedin | twitter
    merge: null
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--start') args.start = Number(argv[++i]);
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--retry-failed') args.retryFailed = true;
    else if (a === '--need') args.need = String(argv[++i] || 'any');
    else if (a === '--merge') args.merge = String(argv[++i] || '');
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

function emptySocials(rawLi, rawTw) {
  const li = String(rawLi || '').trim();
  const tw = String(rawTw || '').trim();
  const liEmpty = !li || /^(n\/?a|-|none|na)$/i.test(li);
  const twEmpty = !tw || /^(n\/?a|-|none|na)$/i.test(tw);
  return { liEmpty, twEmpty };
}

function buildQueue(need) {
  const peopleData = JSON.parse(fs.readFileSync(PEOPLE_JSON_PATH, 'utf8'));
  const investors = JSON.parse(fs.readFileSync(INVESTORS_JSON_PATH, 'utf8')).investors || [];
  const orgBySlug = new Map(investors.map((inv) => [inv.slug, inv]));

  const csvRows = parse(fs.readFileSync(PEOPLE_CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  // Prefer CSV as source of truth for empty cells + exact Company string for apply matching.
  const queue = [];
  for (const row of csvRows) {
    const name = (row['First Name'] || '').trim();
    const company = (row.Company || '').trim();
    if (!name) continue;
    const { liEmpty, twEmpty } = emptySocials(row['LinkedIn URL'], row['Twitter URL']);
    if (need === 'linkedin' && !liEmpty) continue;
    if (need === 'twitter' && !twEmpty) continue;
    if (need === 'any' && !liEmpty && !twEmpty) continue;

    const personJson = (peopleData.people || []).find(
      (p) =>
        p.name.toLowerCase() === name.toLowerCase() &&
        String(p.company || '').toLowerCase() === company.toLowerCase()
    ) || (peopleData.people || []).find((p) => p.name.toLowerCase() === name.toLowerCase());

    const slug = personJson?.companySlug || '';
    const org = slug ? orgBySlug.get(slug) : null;
    const website = (org && org.website) || '';

    queue.push({
      name,
      company,
      title: (row.Title || '').trim() || (personJson && personJson.title) || '',
      companySlug: slug,
      companyType: (org && org.type) || (personJson && personJson.companyType) || '',
      website,
      needLinkedin: liEmpty,
      needTwitter: twEmpty,
      key: personKey(name, company)
    });
  }

  // Priority: VC missing LinkedIn first, then others; Twitter-only later.
  const typeRank = (t) => {
    if (/venture capital/i.test(t)) return 0;
    if (/private equity/i.test(t)) return 1;
    if (/accelerator|incubator/i.test(t)) return 2;
    if (/corporate|cvc/i.test(t)) return 3;
    if (/angel/i.test(t)) return 4;
    return 5;
  };
  queue.sort((a, b) => {
    const aLi = a.needLinkedin ? 0 : 1;
    const bLi = b.needLinkedin ? 0 : 1;
    if (aLi !== bLi) return aLi - bLi;
    return typeRank(a.companyType) - typeRank(b.companyType) || a.name.localeCompare(b.name);
  });

  return queue;
}

function sourceUrlIndex() {
  const candidates = loadJson(PEOPLE_CANDIDATES_PATH, { found: [] });
  const map = new Map(); // personKey(name, company) -> sourceUrl
  for (const c of candidates.found || []) {
    if (!c.sourceUrl) continue;
    const k = personKey(c.name, c.company);
    if (!map.has(k)) map.set(k, c.sourceUrl);
  }
  return map;
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

function mergeBatchFile(mergePath) {
  const batch = JSON.parse(fs.readFileSync(path.resolve(mergePath), 'utf8'));
  const items = Array.isArray(batch) ? batch : batch.found || [];
  const candidates = loadJson(SOCIAL_CANDIDATES_PATH, {
    generatedAt: null,
    schemaVersion: 1,
    found: [],
    unresolved: []
  });
  let n = 0;
  for (const raw of items) {
    const name = (raw.name || '').trim();
    const company = (raw.company || '').trim();
    if (!name || !company) continue;
    const linkedinUrl = normalizeLinkedIn(raw.linkedinUrl || raw.linkedin || '');
    const twitterUrl = normalizeTwitter(raw.twitterUrl || raw.twitter || '');
    if (!linkedinUrl && !twitterUrl) continue;
    upsertFound(candidates, {
      key: personKey(name, company),
      name,
      company,
      title: raw.title || '',
      linkedinUrl,
      twitterUrl,
      sourceUrl: raw.sourceUrl || '',
      method: raw.method || 'search',
      confidence: raw.confidence || 'medium',
      companyType: raw.companyType || ''
    });
    n++;
  }
  candidates.generatedAt = new Date().toISOString();
  saveJson(SOCIAL_CANDIDATES_PATH, candidates);
  console.log(`Merged ${n} search/manual hits → ${SOCIAL_CANDIDATES_PATH}`);
  console.log(`Totals: found=${candidates.found.length}, unresolved=${candidates.unresolved.length}`);
}

async function harvestOne(person, priorSourceUrl) {
  const pages = []; // { url, html }

  if (person.website) {
    const crawl = await crawlForTeamPage(person.website);
    if (crawl.ok && crawl.html) {
      pages.push({ url: crawl.sourceUrl, html: crawl.html });
    }
  }

  if (priorSourceUrl && !pages.some((p) => p.url === priorSourceUrl)) {
    const res = await fetchOne(priorSourceUrl, 8000);
    if (res.ok && res.html) pages.push({ url: res.finalUrl || priorSourceUrl, html: res.html });
  }

  if (!pages.length) {
    return { ok: false, reason: person.website ? 'crawl-failed' : 'no-website' };
  }

  let linkedinUrl = '';
  let twitterUrl = '';
  let sourceUrl = '';
  const evidence = [];

  for (const page of pages) {
    const hit = extractSocialsNearName(page.html, person.name);
    if (hit.linkedinUrl && !linkedinUrl) {
      linkedinUrl = hit.linkedinUrl;
      sourceUrl = sourceUrl || page.url;
    }
    if (hit.twitterUrl && !twitterUrl) {
      twitterUrl = hit.twitterUrl;
      sourceUrl = sourceUrl || page.url;
    }
    evidence.push(...hit.evidence.map((e) => ({ ...e, page: page.url })));
  }

  if (!linkedinUrl && !twitterUrl) {
    return { ok: false, reason: 'no-socials-near-name', sourceUrl: pages[0].url };
  }

  // Only keep fields the person still needs
  if (!person.needLinkedin) linkedinUrl = '';
  if (!person.needTwitter) twitterUrl = '';
  if (!linkedinUrl && !twitterUrl) {
    return { ok: false, reason: 'socials-already-filled' };
  }

  return {
    ok: true,
    linkedinUrl,
    twitterUrl,
    sourceUrl,
    evidence,
    method: 'harvest'
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.merge) {
    mergeBatchFile(args.merge);
    return;
  }

  const queue = buildQueue(args.need);
  const progress = loadJson(PROGRESS_PATH, { done: {} });
  const candidates = loadJson(SOCIAL_CANDIDATES_PATH, {
    generatedAt: null,
    schemaVersion: 1,
    found: [],
    unresolved: []
  });
  const priorSources = sourceUrlIndex();

  const pending = queue.filter((p) => {
    const status = progress.done[p.key];
    if (!status) return true;
    if (args.retryFailed && status === 'unresolved') return true;
    return false;
  });

  console.log(`People needing socials (${args.need}): ${queue.length}. Pending this tracker: ${pending.length}.`);
  const slice = pending.slice(args.start, args.start + args.limit);
  console.log(`This run: ${slice.length} people.\n`);

  if (args.dryRun) {
    slice.forEach((p, i) => {
      console.log(
        `  ${i + 1}. ${p.name} | ${p.company} | needLI=${p.needLinkedin} needTW=${p.needTwitter} | ${p.website || '(no website)'}`
      );
    });
    return;
  }

  let foundCount = 0;
  let unresolvedCount = 0;

  // Group by website to crawl once per firm when possible
  const byWebsite = new Map();
  for (const p of slice) {
    const w = p.website || `__none__:${p.key}`;
    if (!byWebsite.has(w)) byWebsite.set(w, []);
    byWebsite.get(w).push(p);
  }

  const crawledHtml = new Map(); // website -> { ok, pages[] }

  for (const [website, people] of byWebsite) {
    if (!website.startsWith('__none__')) {
      process.stdout.write(`Crawl ${website} (${people.length} people) ... `);
      const crawl = await crawlForTeamPage(website);
      if (crawl.ok && crawl.html) {
        crawledHtml.set(website, [{ url: crawl.sourceUrl, html: crawl.html }]);
        console.log(`ok (${crawl.sourceUrl})`);
      } else {
        crawledHtml.set(website, []);
        console.log(`fail (${crawl.reason || 'unknown'})`);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  for (let i = 0; i < slice.length; i++) {
    const person = slice[i];
    process.stdout.write(`[${i + 1}/${slice.length}] ${person.name} @ ${person.company} ... `);

    const pages = [];
    if (person.website && crawledHtml.has(person.website)) {
      pages.push(...(crawledHtml.get(person.website) || []));
    }

    const prior = priorSources.get(person.key);
    if (prior && !pages.some((p) => p.url === prior)) {
      const res = await fetchOne(prior, 8000);
      if (res.ok && res.html) pages.push({ url: res.finalUrl || prior, html: res.html });
    }

    if (!pages.length && person.website) {
      // Individual harvest fallback
      const result = await harvestOne(person, prior);
      if (!result.ok) {
        console.log(`unresolved (${result.reason})`);
        candidates.unresolved.push({
          key: person.key,
          name: person.name,
          company: person.company,
          reason: result.reason,
          sourceUrl: result.sourceUrl || '',
          method: 'harvest'
        });
        progress.done[person.key] = 'unresolved';
        unresolvedCount++;
        saveProgress();
        continue;
      }
      upsertFound(candidates, {
        key: person.key,
        name: person.name,
        company: person.company,
        title: person.title,
        linkedinUrl: result.linkedinUrl,
        twitterUrl: result.twitterUrl,
        sourceUrl: result.sourceUrl,
        method: 'harvest',
        confidence: 'high',
        companyType: person.companyType,
        evidence: result.evidence
      });
      console.log(`FOUND li=${result.linkedinUrl || '-'} tw=${result.twitterUrl || '-'}`);
      progress.done[person.key] = 'found';
      foundCount++;
      saveProgress();
      continue;
    }

    if (!pages.length) {
      console.log('unresolved (no-website)');
      candidates.unresolved.push({
        key: person.key,
        name: person.name,
        company: person.company,
        reason: 'no-website',
        method: 'harvest'
      });
      progress.done[person.key] = 'unresolved';
      unresolvedCount++;
      saveProgress();
      continue;
    }

    let linkedinUrl = '';
    let twitterUrl = '';
    let sourceUrl = '';
    const evidence = [];
    for (const page of pages) {
      const hit = extractSocialsNearName(page.html, person.name);
      if (hit.linkedinUrl && !linkedinUrl) {
        linkedinUrl = hit.linkedinUrl;
        sourceUrl = sourceUrl || page.url;
      }
      if (hit.twitterUrl && !twitterUrl) {
        twitterUrl = hit.twitterUrl;
        sourceUrl = sourceUrl || page.url;
      }
      evidence.push(...hit.evidence.map((e) => ({ ...e, page: page.url })));
    }

    if (!person.needLinkedin) linkedinUrl = '';
    if (!person.needTwitter) twitterUrl = '';

    if (!linkedinUrl && !twitterUrl) {
      console.log(`unresolved (no-socials-near-name)`);
      candidates.unresolved.push({
        key: person.key,
        name: person.name,
        company: person.company,
        reason: 'no-socials-near-name',
        sourceUrl: pages[0].url,
        method: 'harvest'
      });
      progress.done[person.key] = 'unresolved';
      unresolvedCount++;
      saveProgress();
      continue;
    }

    upsertFound(candidates, {
      key: person.key,
      name: person.name,
      company: person.company,
      title: person.title,
      linkedinUrl,
      twitterUrl,
      sourceUrl,
      method: 'harvest',
      confidence: 'high',
      companyType: person.companyType,
      evidence
    });
    console.log(`FOUND li=${linkedinUrl || '-'} tw=${twitterUrl || '-'}`);
    progress.done[person.key] = 'found';
    foundCount++;
    saveProgress();
  }

  function saveProgress() {
    candidates.generatedAt = new Date().toISOString();
    const foundKeys = new Set(candidates.found.map((f) => f.key));
    const unresolvedByKey = new Map();
    for (const u of candidates.unresolved) {
      if (foundKeys.has(u.key)) continue;
      unresolvedByKey.set(u.key, u);
    }
    candidates.unresolved = [...unresolvedByKey.values()];
    saveJson(SOCIAL_CANDIDATES_PATH, candidates);
    saveJson(PROGRESS_PATH, progress);
  }

  saveProgress();
  console.log(`\nDone. This run: ${foundCount} found, ${unresolvedCount} unresolved.`);
  console.log(`Staged → ${SOCIAL_CANDIDATES_PATH}`);
  console.log(`Totals: found=${candidates.found.length}, unresolved=${candidates.unresolved.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
