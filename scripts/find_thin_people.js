#!/usr/bin/env node
/**
 * Bulk pass for thin firms (1–2 people already mapped): crawl team pages and
 * stage additional senior investors. Grounded only — names must appear in
 * scraped HTML text. Never writes the Individuals CSV (use apply_people_candidates.js).
 *
 * Usage:
 *   node scripts/find_thin_people.js --limit 40
 *   node scripts/find_thin_people.js --limit 100 --max-people 6
 *   node scripts/find_thin_people.js --dry-run --limit 20
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.production') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Anthropic } = require('@anthropic-ai/sdk');
const { crawlForTeamPage } = require('./lib/site_crawl');
const { nameGroundedInText } = require('./lib/people_extract');
const { resolveOrg, normStrict } = require('./lib/org_lookup');

const ROOT = path.join(__dirname, '..');
const PEOPLE_CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const ORG_CSV_PATH = path.join(ROOT, 'Updated VC Dekho Sheet - Org.csv');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');
const PROGRESS_PATH = path.join(__dirname, '.find_thin_people_progress.json');

function parseArgs(argv) {
  const args = { limit: 40, start: 0, dryRun: false, maxPeople: 6, maxExisting: 2, retryFailed: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--start') args.start = Number(argv[++i]);
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--max-people') args.maxPeople = Number(argv[++i]);
    else if (a === '--max-existing') args.maxExisting = Number(argv[++i]);
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

function loadCsv(p) {
  return parse(fs.readFileSync(p, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });
}

function isAngelType(type) {
  return /angel/i.test(String(type || ''));
}

function isGovtGrantType(type) {
  return /government grant/i.test(String(type || ''));
}

function personKey(name, company) {
  return `${String(name || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()}||${String(company || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')}`;
}

function buildThinTargets(maxExisting) {
  const people = loadCsv(PEOPLE_CSV_PATH);
  const orgs = loadCsv(ORG_CSV_PATH);
  const byCo = new Map();
  for (const p of people) {
    const c = (p.Company || '').trim();
    if (!c) continue;
    if (!byCo.has(c)) byCo.set(c, []);
    byCo.get(c).push(p);
  }

  const orgByNorm = new Map();
  for (const o of orgs) {
    const name = (o.Company || '').trim();
    if (!name) continue;
    orgByNorm.set(normStrict(name), o);
  }

  const targets = [];
  for (const [company, plist] of byCo.entries()) {
    if (plist.length < 1 || plist.length > maxExisting) continue;
    if (/angel|individual|solo/i.test(company)) continue;
    const resolved = resolveOrg(company);
    const orgRow = resolved.match
      ? orgByNorm.get(normStrict(resolved.match.company))
      : orgByNorm.get(normStrict(company));
    const type = orgRow?.['Company Type'] || '';
    if (isAngelType(type) || isGovtGrantType(type)) continue;
    const website = (orgRow?.Website || orgRow?.website || '').trim();
    if (!website) continue;
    targets.push({
      company,
      website,
      count: plist.length,
      existingNames: plist.map((p) => (p['First Name'] || '').trim()).filter(Boolean),
      companyType: type
    });
  }
  targets.sort((a, b) => a.count - b.count || a.company.localeCompare(b.company));
  return targets;
}

function buildPrompt(company, text, existingNames, maxPeople) {
  const existing = existingNames.length ? existingNames.join(', ') : '(none listed)';
  return `You are extracting factual data from a SCRAPED WEB PAGE. Do not use any outside knowledge about "${company}" — only what appears verbatim in the TEXT below.

TEXT (scraped from ${company}'s website):
"""
${text}
"""

People already in our directory for this firm (do NOT return these): ${existing}

Task: identify up to ${maxPeople} additional senior investment professionals mentioned BY NAME in the TEXT above (prefer Founder / Managing Partner / General Partner / Managing Director / Partner). Skip analysts, associates, and ops-only roles unless no partners appear.

Rules:
- Only include a person if their full name literally appears in the TEXT above.
- Skip anyone already listed above (fuzzy match on first+last name is fine).
- Copy the name and title exactly as written in the text.
- If the text does not name additional team members, return [].
- Never invent or guess.
- Max ${maxPeople} people.

Return ONLY a JSON array:
[{"name": "...", "title": "..."}]`;
}

async function extractAdditional(anthropic, { company, text, existingNames, maxPeople, model = 'claude-sonnet-4-6' }) {
  const msg = await anthropic.messages.create({
    model,
    max_tokens: 900,
    system: 'You extract facts strictly from provided text. Output JSON only. Never use outside knowledge. Never invent.',
    messages: [{ role: 'user', content: buildPrompt(company, text, existingNames, maxPeople) }]
  });
  const raw = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  let data;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return { people: [], raw, parseError: true };
  }
  if (!Array.isArray(data)) return { people: [], raw };

  const existingNorm = new Set(
    existingNames.map((n) =>
      String(n)
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .trim()
    )
  );

  const verified = [];
  for (const item of data.slice(0, maxPeople)) {
    const name = String(item?.name || '').trim();
    const title = String(item?.title || '').trim();
    if (!name) continue;
    if (!nameGroundedInText(name, text)) continue;
    const nn = name.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    if (existingNorm.has(nn)) continue;
    // also skip if last-name+first-token already covered
    const tokens = nn.split(/\s+/).filter(Boolean);
    const already = [...existingNorm].some((e) => {
      const et = e.split(/\s+/).filter(Boolean);
      if (et.length < 2 || tokens.length < 2) return e === nn;
      return et[et.length - 1] === tokens[tokens.length - 1] && et[0] === tokens[0];
    });
    if (already) continue;
    verified.push({ name, title });
  }
  return { people: verified, raw };
}

function upsertCandidate(candidates, item) {
  const key = personKey(item.name, item.company);
  const idx = candidates.found.findIndex((c) => personKey(c.name, c.company) === key);
  if (idx >= 0) candidates.found[idx] = { ...candidates.found[idx], ...item };
  else candidates.found.push(item);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.ANTHROPIC_API_KEY && !args.dryRun) {
    console.error('Missing ANTHROPIC_API_KEY');
    process.exit(1);
  }

  const targets = buildThinTargets(args.maxExisting);
  const progress = loadJson(PROGRESS_PATH, { done: {} });
  const candidates = loadJson(CANDIDATES_PATH, { generatedAt: null, found: [], unresolved: [] });
  const peopleRows = loadCsv(PEOPLE_CSV_PATH);
  const existingKeys = new Set(peopleRows.map((r) => personKey(r['First Name'], r.Company)));

  const pending = targets.filter((t) => {
    const key = normStrict(t.company);
    const status = progress.done[key];
    if (!status) return true;
    if (args.retryFailed && status === 'unresolved') return true;
    return false;
  });

  console.log(`Thin firms (≤${args.maxExisting} people, with website): ${targets.length}`);
  console.log(`Pending this tracker: ${pending.length}`);
  const slice = pending.slice(args.start, args.start + args.limit);
  console.log(`This run: ${slice.length}\n`);

  if (args.dryRun) {
    slice.forEach((t, i) => console.log(`  ${i + 1}. [${t.count}] ${t.company} — ${t.website}`));
    return;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let added = 0;
  let foundOrgs = 0;
  let unresolved = 0;

  for (let i = 0; i < slice.length; i++) {
    const t = slice[i];
    const key = normStrict(t.company);
    process.stdout.write(`[${i + 1}/${slice.length}] ${t.company} ... `);
    try {
      const crawl = await crawlForTeamPage(t.website);
      if (!crawl.ok || !(crawl.text || '').trim()) {
        progress.done[key] = 'unresolved';
        unresolved++;
        console.log('no team page');
        continue;
      }
      const text = crawl.text;
      const { people } = await extractAdditional(anthropic, {
        company: t.company,
        text,
        existingNames: t.existingNames,
        maxPeople: args.maxPeople
      });
      let n = 0;
      for (const p of people) {
        const pk = personKey(p.name, t.company);
        if (existingKeys.has(pk)) continue;
        upsertCandidate(candidates, {
          company: t.company,
          name: p.name,
          title: p.title || '',
          linkedinUrl: '',
          sourceUrl: crawl.sourceUrl || crawl.teamUrl || t.website,
          method: 'crawl',
          companyType: t.companyType || ''
        });
        existingKeys.add(pk);
        n++;
        added++;
      }
      if (n > 0) {
        progress.done[key] = 'found';
        foundOrgs++;
        console.log(`+${n} (${people.map((p) => p.name).join(', ')})`);
      } else {
        progress.done[key] = 'unresolved';
        unresolved++;
        console.log('no new people');
      }
    } catch (err) {
      progress.done[key] = 'unresolved';
      unresolved++;
      console.log(`error: ${err.message || err}`);
    }
    if ((i + 1) % 5 === 0) {
      candidates.generatedAt = new Date().toISOString();
      saveJson(CANDIDATES_PATH, candidates);
      saveJson(PROGRESS_PATH, progress);
    }
  }

  candidates.generatedAt = new Date().toISOString();
  saveJson(CANDIDATES_PATH, candidates);
  saveJson(PROGRESS_PATH, progress);
  console.log(`\nDone. Orgs with new people: ${foundOrgs}. New candidates staged: ${added}. Unresolved: ${unresolved}.`);
  console.log(`Staged file: ${CANDIDATES_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
