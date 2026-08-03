#!/usr/bin/env node
/**
 * Find emails via Bitscale grid API (Enterprise plan required for /grids/:id/run).
 *
 * Usage:
 *   node scripts/find_emails_bitscale.js --check
 *   node scripts/find_emails_bitscale.js --run --limit 10 [--apply]
 *
 * Env: BITSCALE_API_KEY, BITSCALE_EMAIL_GRID_ID (default: Email Production grid)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const {
  getWorkspace,
  getGrid,
  getGridCurl,
  runGrid,
  waitForRun,
  extractEmailFromOutputs
} = require('../utils/bitscale');
const { deriveName } = require('./lib/person_name');
const { resolveOrg } = require('./lib/org_lookup');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const REPORT_PATH = path.join(ROOT, 'data', 'candidates', 'find-emails-bitscale-report.json');
const DEFAULT_GRID = 'f9636948-df72-41b4-b012-a2ca2951b25a'; // Email Production
const LINKEDIN_INPUT_COL = '6d65d205-9095-4e82-ad7c-19c02228b846';
const EMAIL_OUTPUT_COL = '241a021c-1170-4691-848d-668bf52c7bcd';

function parseArgs(argv) {
  const args = { check: false, run: false, apply: false, limit: 10 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--run') args.run = true;
    else if (argv[i] === '--apply') { args.apply = true; args.run = true; }
    else if (argv[i] === '--limit') args.limit = Number(argv[++i]);
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

async function checkConnection() {
  const ws = await getWorkspace();
  console.log('Workspace:', ws.name);
  console.log('Plan:', ws.plan?.name);
  console.log('Credits remaining:', ws.credits?.remaining);

  const gridId = process.env.BITSCALE_EMAIL_GRID_ID || DEFAULT_GRID;
  const grid = await getGrid(gridId);
  console.log('\nGrid:', grid.name, grid.id);
  console.log('Columns:', grid.columns?.map((c) => `${c.name} (${c.id})`).join(', '));

  try {
    const curl = await getGridCurl(gridId);
    console.log('\nAPI contract available. Required inputs:', Object.keys(curl.request_body?.inputs || {}));
  } catch (err) {
    if (err.code === 'MISSING_SOURCE') {
      console.log('\n⚠ Grid has no BitScale API source yet. In app.bitscale.ai:');
      console.log('  Data Sources → Add → BitScale API (Enterprise required for programmatic runs)');
    } else if (err.code === 'FEATURE_DISABLED') {
      console.log('\n⚠ BitScale External API requires Enterprise plan.');
      console.log('  Use export_bitscale_emails.js + UI import on Growth plan instead.');
    } else {
      throw err;
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.BITSCALE_API_KEY) {
    console.error('BITSCALE_API_KEY missing');
    process.exit(1);
  }

  if (args.check || !args.run) {
    await checkConnection();
    if (!args.run) return;
  }

  const gridId = process.env.BITSCALE_EMAIL_GRID_ID || DEFAULT_GRID;
  const rows = loadCsv();
  const candidates = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if ((row.Email || '').trim()) continue;
    if (!(row['First Name'] || '').trim()) continue;
    const linkedin = (row['LinkedIn URL'] || '').trim();
    if (!linkedin) continue;
    candidates.push({ index: i, row, linkedin });
    if (candidates.length >= args.limit) break;
  }

  console.log(`\nRunning Bitscale on ${candidates.length} candidates (grid ${gridId})…`);

  const report = { generatedAt: new Date().toISOString(), attempted: 0, found: 0, notFound: 0, errors: [], results: [] };

  for (const c of candidates) {
    const name = deriveName(c.row['First Name'], c.linkedin);
    process.stdout.write(`  [${c.index}] ${name.firstname} ${name.lastname} … `);
    try {
      let result = await runGrid(
        gridId,
        { [LINKEDIN_INPUT_COL]: c.linkedin },
        { mode: 'sync', outputColumns: [EMAIL_OUTPUT_COL, 'dbb4cfd0-89b5-4cec-9e29-17c9b22e0896'] }
      );

      if (result.request_id && result.status !== 'completed') {
        result = await waitForRun(result.request_id);
      }

      report.attempted++;
      const email = extractEmailFromOutputs(result.outputs);
      if (email) {
        console.log(`FOUND ${email}`);
        report.found++;
        report.results.push({ index: c.index, name: `${name.firstname} ${name.lastname}`.trim(), email, company: c.row.Company });
        if (args.apply) rows[c.index].Email = email;
      } else {
        console.log('not found');
        report.notFound++;
      }
    } catch (err) {
      console.log('ERROR', err.message.split('\n')[0]);
      report.errors.push({ index: c.index, error: err.message, code: err.code });
      if (err.code === 'FEATURE_DISABLED') break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  if (args.apply && report.found > 0) {
    fs.writeFileSync(CSV_PATH, stringify(rows, { header: true, columns: Object.keys(rows[0] || {}) }));
  }

  const dir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`\nDone. Attempted ${report.attempted}, found ${report.found}, not found ${report.notFound}`);
  console.log(`Report → ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
