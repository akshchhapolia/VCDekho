#!/usr/bin/env node
/**
 * Phase 3: find the 1-2 most important real people at orgs that currently
 * have zero individuals mapped. Grounded pipeline — every accepted name must
 * literally appear in text fetched from the org's own website. Nothing is
 * invented from model recall.
 *
 * Usage:
 *   node scripts/find_people.js --limit 20                # process next 20 unresolved targets
 *   node scripts/find_people.js --limit 500 --start 0      # bigger batch
 *   node scripts/find_people.js --retry-failed --limit 50  # retry previously-failed targets
 *   node scripts/find_people.js --dry-run --limit 10       # list targets only, no crawling/API calls
 *
 * Output: stages results in data/candidates/people-candidates.json — this
 * script NEVER writes to the live Individuals CSV. A separate apply step
 * (scripts/apply_people_candidates.js) does that after review.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.production') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');
const { getTargetOrgs } = require('./lib/people_targets');
const { crawlForTeamPage } = require('./lib/site_crawl');
const { extractPeople } = require('./lib/people_extract');
const { normStrict } = require('./lib/org_lookup');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');
const PROGRESS_PATH = path.join(__dirname, '.find_people_progress.json');

function parseArgs(argv) {
  const args = { limit: 20, start: 0, dryRun: false, retryFailed: false };
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
  if (!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = getTargetOrgs();
  const progress = loadJson(PROGRESS_PATH, { done: {} }); // key -> 'found' | 'unresolved'
  const candidates = loadJson(CANDIDATES_PATH, { generatedAt: null, found: [], unresolved: [] });

  const pending = targets.filter((t) => {
    const key = normStrict(t.Company);
    const status = progress.done[key];
    if (!status) return true;
    if (args.retryFailed && status === 'unresolved') return true;
    return false;
  });

  console.log(`Total Phase 3 targets: ${targets.length}. Pending (not yet attempted${args.retryFailed ? ', incl. retry-failed' : ''}): ${pending.length}.`);

  const slice = pending.slice(args.start, args.start + args.limit);
  console.log(`This run: ${slice.length} orgs.\n`);

  if (args.dryRun) {
    slice.forEach((t, i) => console.log(`  ${i + 1}. ${t.Company} — ${t.Website || '(no website)'}`));
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY missing');
    process.exit(1);
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let foundCount = 0;
  let unresolvedCount = 0;

  for (let i = 0; i < slice.length; i++) {
    const org = slice[i];
    const key = normStrict(org.Company);
    process.stdout.write(`[${i + 1}/${slice.length}] ${org.Company} ... `);

    if (!org.Website || !org.Website.trim()) {
      console.log('SKIP (no website)');
      candidates.unresolved.push({ company: org.Company, website: '', reason: 'no-website' });
      progress.done[key] = 'unresolved';
      unresolvedCount++;
      saveProgressAndCandidates();
      continue;
    }

    const crawl = await crawlForTeamPage(org.Website);
    if (!crawl.ok) {
      console.log(`crawl-failed (${crawl.reason})`);
      candidates.unresolved.push({ company: org.Company, website: org.Website, reason: crawl.reason, detail: crawl.error || '' });
      progress.done[key] = 'unresolved';
      unresolvedCount++;
      saveProgressAndCandidates();
      continue;
    }

    let extraction;
    try {
      extraction = await extractPeople(anthropic, { company: org.Company, text: crawl.text });
    } catch (err) {
      console.log('extract-error', err.message.split('\n')[0]);
      candidates.unresolved.push({ company: org.Company, website: org.Website, reason: 'extract-error', detail: err.message });
      progress.done[key] = 'unresolved';
      unresolvedCount++;
      saveProgressAndCandidates();
      continue;
    }

    if (!extraction.people.length) {
      console.log(`no-names-found (source: ${crawl.sourceUrl})`);
      candidates.unresolved.push({ company: org.Company, website: org.Website, reason: 'no-names-in-text', sourceUrl: crawl.sourceUrl });
      progress.done[key] = 'unresolved';
      unresolvedCount++;
      saveProgressAndCandidates();
      continue;
    }

    for (const person of extraction.people) {
      candidates.found.push({
        company: org.Company,
        name: person.name,
        title: person.title,
        sourceUrl: crawl.sourceUrl,
        method: 'crawl',
        companyType: org['Company Type'] || ''
      });
    }
    console.log(`FOUND ${extraction.people.map((p) => p.name).join(', ')}`);
    progress.done[key] = 'found';
    foundCount++;
    saveProgressAndCandidates();

    await new Promise((r) => setTimeout(r, 300)); // gentle pacing

    function saveProgressAndCandidates() {
      candidates.generatedAt = new Date().toISOString();
      saveJson(CANDIDATES_PATH, candidates);
      saveJson(PROGRESS_PATH, progress);
    }
  }

  console.log(`\nDone. This run: ${foundCount} orgs with people found, ${unresolvedCount} unresolved.`);
  console.log(`Staged candidates → ${CANDIDATES_PATH}`);
  console.log(`Totals so far: found=${candidates.found.length} people across orgs, unresolved=${candidates.unresolved.length} orgs.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
