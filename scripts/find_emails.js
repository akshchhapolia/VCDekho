#!/usr/bin/env node
/**
 * Find professional emails for individual investors using the Icypeas API.
 *
 * Modes:
 *   1) Single ad-hoc lookup (no CSV, no side effects):
 *        node scripts/find_emails.js --single --first Pierre --last Landoin --company icypeas.com
 *
 *   2) Check remaining credits / subscription:
 *        node scripts/find_emails.js --credits you@yourdomain.com
 *
 *   3) Batch mode over the Individuals sheet (default). Only ever targets rows
 *      with a BLANK Professional Email cell — existing emails are never overwritten or re-queried.
 *        node scripts/find_emails.js                  # dry run: shows what WOULD be queried, spends 0 credits
 *        node scripts/find_emails.js --run --limit 20  # actually calls Icypeas (costs credits, only for FOUND emails)
 *        node scripts/find_emails.js --run --apply     # also writes found emails back into the CSV
 *
 * Safety:
 *   - Dry run by default. Nothing is sent to Icypeas unless --run is passed.
 *   - A local progress cache (scripts/.find_emails_progress.json) remembers which
 *     rows were already attempted, so re-running never double-spends credits.
 *   - Low-certainty results are logged but NOT auto-applied to the CSV unless
 *     --min-certainty is loosened.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.production') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const icypeas = require('./lib/icypeas');
const { deriveName } = require('./lib/person_name');
const { resolveOrg } = require('./lib/org_lookup');
const { COL_PROFESSIONAL, isValidEmail } = require('./lib/person_email');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const REPORT_PATH = path.join(ROOT, 'data', 'candidates', 'find-emails-report.json');
const PROGRESS_PATH = path.join(__dirname, '.find_emails_progress.json');

// Certainty tiers accepted for auto-apply into the CSV without human review.
const HIGH_CERTAINTY = new Set(['ultra_sure', 'very_sure']);

function parseArgs(argv) {
  const args = {
    single: false,
    first: '',
    last: '',
    company: '',
    credits: '',
    run: false,
    apply: false,
    limit: 20,
    minCertainty: 'ultra_sure',
    retryFailed: false
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--single') args.single = true;
    else if (a === '--first') args.first = argv[++i] || '';
    else if (a === '--last') args.last = argv[++i] || '';
    else if (a === '--company') args.company = argv[++i] || '';
    else if (a === '--credits') args.credits = argv[++i] || '';
    else if (a === '--run') args.run = true;
    else if (a === '--apply') { args.apply = true; args.run = true; }
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--min-certainty') args.minCertainty = String(argv[++i] || 'ultra_sure').toLowerCase();
    else if (a === '--retry-failed') args.retryFailed = true;
  }
  return args;
}

function loadCsv() {
  return parse(fs.readFileSync(CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });
}

function saveCsv(rows) {
  const columns = Object.keys(rows[0] || {});
  fs.writeFileSync(CSV_PATH, stringify(rows, { header: true, columns }));
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
  } catch {
    return { attempted: {} };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

function rowKey(row) {
  return [row['First Name'], row.Company, row['LinkedIn URL']].join('||').toLowerCase();
}

function blank(v) {
  return !(v && String(v).trim());
}

async function runSingle(args) {
  if (!args.company || (!args.first && !args.last)) {
    console.error('Usage: --single --first <F> --last <L> --company <domainOrCompanyName>');
    process.exit(1);
  }
  console.log(`Searching: ${args.first} ${args.last} @ ${args.company} ...`);
  const res = await icypeas.emailSearchSync({ firstname: args.first, lastname: args.last, domainOrCompany: args.company });
  console.log(JSON.stringify(res, null, 2));
}

async function runCredits(args) {
  const res = await icypeas.subscriptionInfo({ email: args.credits });
  console.log(JSON.stringify(res, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.single) return runSingle(args);
  if (args.credits) return runCredits(args);

  const rows = loadCsv();
  const progress = loadProgress();

  const candidates = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (isValidEmail(row[COL_PROFESSIONAL])) continue;
    if (!row['First Name'] || !row['First Name'].trim()) continue; // fully empty row

    const key = rowKey(row);
    const prior = progress.attempted[key];
    if (prior && !args.retryFailed) continue;
    if (prior && args.retryFailed && prior.status !== 'error' && prior.status !== 'NOT_FOUND') continue;

    const name = deriveName(row['First Name'], row['LinkedIn URL']);
    const org = resolveOrg(row.Company);
    const domainOrCompany = (org.match && (org.match.domain || org.match.company)) || row.Company;

    candidates.push({ index: i, row, key, name, org, domainOrCompany });
  }

  console.log(`Blank-email candidates: ${candidates.length} (limit this run: ${Math.min(args.limit, candidates.length)})`);
  console.log(`Mode: ${args.run ? (args.apply ? 'RUN + APPLY (writes CSV, spends credits)' : 'RUN (spends credits, report only)') : 'DRY RUN (no API calls)'}\n`);

  const slice = candidates.slice(0, args.limit);

  for (const c of slice) {
    const nameStr = `${c.name.firstname} ${c.name.lastname}`.trim() || '(no name)';
    const orgNote = c.org.ambiguous ? `AMBIGUOUS(${c.org.candidates.length})` : (c.org.match ? c.org.matchedBy : 'unmatched→raw');
    console.log(`  [${c.index}] ${nameStr.padEnd(28)} | ${c.row.Company.padEnd(30)} -> ${c.domainOrCompany.padEnd(24)} (${orgNote}) | name-src=${c.name.source}`);
  }

  if (!args.run) {
    console.log('\nDry run only — no credits spent. Re-run with --run to call Icypeas, or --run --apply to also write results into the CSV.');
    return;
  }

  const report = { generatedAt: new Date().toISOString(), attempted: 0, found: 0, notFound: 0, lowCertainty: 0, errors: [], results: [] };

  for (const c of slice) {
    if (!c.name.firstname && !c.name.lastname) {
      console.log(`  SKIP [${c.index}] no usable name`);
      continue;
    }
    process.stdout.write(`  Querying [${c.index}] ${c.name.firstname} ${c.name.lastname} @ ${c.domainOrCompany} ... `);
    let res;
    try {
      res = await icypeas.emailSearchSync({ firstname: c.name.firstname, lastname: c.name.lastname, domainOrCompany: c.domainOrCompany });
    } catch (err) {
      console.log('ERROR', err.message.split('\n')[0]);
      report.errors.push({ index: c.index, company: c.row.Company, error: err.message });
      progress.attempted[c.key] = { status: 'error', at: new Date().toISOString() };
      continue;
    }

    report.attempted++;
    const status = res.status || (res.success ? 'UNKNOWN' : 'ERROR');
    const emails = Array.isArray(res.emails) ? res.emails : [];
    const best = emails[0];

    progress.attempted[c.key] = { status, email: best ? best.email : null, certainty: best ? best.certainty : null, at: new Date().toISOString() };

    if (status === 'FOUND' && best) {
      console.log(`FOUND ${best.email} (${best.certainty})`);
      report.found++;
      report.results.push({ index: c.index, company: c.row.Company, name: `${c.name.firstname} ${c.name.lastname}`.trim(), email: best.email, certainty: best.certainty });

      const isHighCertainty = HIGH_CERTAINTY.has(String(best.certainty || '').toLowerCase()) || String(best.certainty || '').toLowerCase() === args.minCertainty;
      if (args.apply && isHighCertainty) {
        rows[c.index][COL_PROFESSIONAL] = best.email;
      } else if (args.apply) {
        report.lowCertainty++;
      }
    } else {
      console.log(`not found (status=${status})`);
      report.notFound++;
    }

    saveProgress(progress);
    await new Promise((r) => setTimeout(r, 500)); // gentle pacing
  }

  if (args.apply) saveCsv(rows);
  if (!fs.existsSync(path.dirname(REPORT_PATH))) fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`\nDone. Attempted ${report.attempted}, found ${report.found}, not found ${report.notFound}, low-certainty (not applied) ${report.lowCertainty}.`);
  console.log(`Report → ${REPORT_PATH}`);
  if (args.apply) console.log(`CSV updated → ${CSV_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
