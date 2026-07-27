#!/usr/bin/env node
/**
 * Enrich incomplete investor rows in the Org CSV using Claude.
 *
 * Usage:
 *   node scripts/enrich_org_csv.js --limit 25
 *   node scripts/enrich_org_csv.js --start 0 --limit 50
 *   node scripts/enrich_org_csv.js --dry-run --limit 3
 *   node scripts/enrich_org_csv.js --sheet-start 54 --sheet-end 80
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { Anthropic } = require('@anthropic-ai/sdk');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'Updated VC Dekho Sheet - Org.csv');
const PROGRESS_PATH = path.join(ROOT, 'scripts', '.enrich_org_progress.json');

const COL = {
  company: 'Company',
  type: 'Company Type',
  stages: 'Invests in(Preseed, Seed, Series A ...)',
  thesis: 'Company Thesis',
  sector: 'Sector',
  cheque: 'Cheque Size',
  website: 'Website',
  linkedin: 'Company Linkedin',
  notes: 'Notes',
  criteria: 'Investment Criteria (evaluation)',
  process: 'Process / Extra Notes',
  writeup: 'Detailed Writeup (~200 words)',
  confidence: 'Data Confidence'
};

function parseArgs(argv) {
  const args = {
    limit: Infinity,
    start: 0,
    dryRun: false,
    sheetStart: null,
    sheetEnd: null,
    saveEvery: 5
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--start') args.start = Number(argv[++i]);
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--sheet-start') args.sheetStart = Number(argv[++i]);
    else if (a === '--sheet-end') args.sheetEnd = Number(argv[++i]);
    else if (a === '--save-every') args.saveEvery = Number(argv[++i]);
  }
  return args;
}

function blank(v) {
  return !(v && String(v).trim());
}

function needsEnrichment(row) {
  return blank(row[COL.thesis]) || blank(row[COL.writeup]);
}

function stripCodeFences(text) {
  return String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function loadCsv() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });
}

function saveCsv(rows) {
  const out = stringify(rows, {
    header: true,
    columns: Object.values(COL)
  });
  fs.writeFileSync(CSV_PATH, out, 'utf8');
}

function buildPrompt(row) {
  return `Enrich this Indian investor / VC / family office / angel profile for VCDekho founders.

EXISTING DATA:
- Company: ${row[COL.company] || ''}
- Company Type: ${row[COL.type] || ''}
- Stages: ${row[COL.stages] || ''}
- Sector: ${row[COL.sector] || ''}
- Cheque Size: ${row[COL.cheque] || ''}
- Website: ${row[COL.website] || ''}
- LinkedIn: ${row[COL.linkedin] || ''}
- Notes: ${row[COL.notes] || ''}
- Existing Thesis: ${row[COL.thesis] || ''}
- Existing Writeup: ${row[COL.writeup] || ''}

Return ONLY valid JSON with keys:
{
  "thesis": "1-2 sentence investment thesis",
  "notes": "short India-relevant notes (1-3 sentences). Keep useful facts from existing Notes if present.",
  "writeup": "founder-facing detailed writeup around 180-210 words",
  "website": "https://... or empty string if unsure",
  "linkedin": "https://www.linkedin.com/... or empty string if unsure"
}

Rules:
- Do NOT invent precise AUM, fund sizes, unicorn counts, or year-founded numbers unless already present in EXISTING DATA.
- If unsure, stay qualitative and practical for founders.
- Writeup tone: professional, concrete, India VC ecosystem context. No markdown, no bullets in writeup.
- Only fill website/linkedin if you are reasonably confident; otherwise empty string.
- Prefer improving empty thesis/writeup; if one already exists, refine lightly without contradicting it.`;
}

async function enrichRow(anthropic, row) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: 'You are a careful research editor for an Indian startup fundraising database. Output JSON only. Never invent hard statistics.',
    messages: [{ role: 'user', content: buildPrompt(row) }]
  });

  const text = msg.content.map(c => (c.type === 'text' ? c.text : '')).join('');
  let data;
  try {
    data = JSON.parse(stripCodeFences(text));
  } catch (e) {
    throw new Error(`JSON parse failed: ${e.message}\nRaw: ${text.slice(0, 400)}`);
  }
  return data;
}

function applyEnrichment(row, data) {
  if (blank(row[COL.thesis]) && data.thesis) {
    row[COL.thesis] = String(data.thesis).trim();
  }
  if (blank(row[COL.writeup]) && data.writeup) {
    row[COL.writeup] = String(data.writeup).trim();
  }
  if (blank(row[COL.notes]) && data.notes) {
    row[COL.notes] = String(data.notes).trim();
  }

  // Only fill website/linkedin when empty and model provided a value
  if (blank(row[COL.website]) && data.website && /^https?:\/\//i.test(String(data.website).trim())) {
    row[COL.website] = String(data.website).trim();
  }
  if (blank(row[COL.linkedin]) && data.linkedin && /^https?:\/\//i.test(String(data.linkedin).trim())) {
    row[COL.linkedin] = String(data.linkedin).trim();
  }

  // Do not overwrite Verified confidence tags
  const conf = (row[COL.confidence] || '').trim();
  if (!conf || /^unverified/i.test(conf)) {
    row[COL.confidence] = 'Unverified – inferred';
  }

  return row;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!process.env.ANTHROPIC_API_KEY && !args.dryRun) {
    console.error('ANTHROPIC_API_KEY missing');
    process.exit(1);
  }

  const rows = loadCsv();
  console.log(`Loaded ${rows.length} rows from CSV`);

  // Candidate indices: missing thesis or writeup
  let candidates = [];
  for (let i = 0; i < rows.length; i++) {
    const sheetRow = i + 2; // header is row 1
    if (args.sheetStart != null && sheetRow < args.sheetStart) continue;
    if (args.sheetEnd != null && sheetRow > args.sheetEnd) continue;
    if (needsEnrichment(rows[i])) {
      candidates.push(i);
    }
  }

  // --start is offset into candidates list
  candidates = candidates.slice(args.start, args.start + (Number.isFinite(args.limit) ? args.limit : candidates.length));

  console.log(`Candidates to enrich this run: ${candidates.length}`);
  if (candidates.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  if (args.dryRun) {
    candidates.slice(0, 10).forEach(i => {
      console.log(`  dry-run sheet ${i + 2}: ${rows[i][COL.company]} | thesis=${!blank(rows[i][COL.thesis])} writeup=${!blank(rows[i][COL.writeup])}`);
    });
    return;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let enriched = 0;
  let failed = 0;
  const failures = [];

  for (let n = 0; n < candidates.length; n++) {
    const i = candidates[n];
    const sheetRow = i + 2;
    const name = rows[i][COL.company];
    process.stdout.write(`[${n + 1}/${candidates.length}] sheet ${sheetRow}: ${name} ... `);

    try {
      const data = await enrichRow(anthropic, rows[i]);
      applyEnrichment(rows[i], data);
      const wc = wordCount(rows[i][COL.writeup]);
      console.log(`ok (writeup ${wc} words)`);
      enriched += 1;
    } catch (err) {
      failed += 1;
      failures.push({ sheetRow, name, error: err.message });
      console.log(`FAIL: ${err.message.split('\n')[0]}`);
    }

    if ((n + 1) % args.saveEvery === 0 || n === candidates.length - 1) {
      saveCsv(rows);
      fs.writeFileSync(
        PROGRESS_PATH,
        JSON.stringify({ updatedAt: new Date().toISOString(), enriched, failed, lastSheetRow: sheetRow }, null, 2)
      );
      console.log(`  saved checkpoint (${enriched} enriched, ${failed} failed)`);
    }
  }

  console.log('\nDone.');
  console.log(`Enriched: ${enriched}`);
  console.log(`Failed: ${failed}`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  sheet ${f.sheetRow}: ${f.name} — ${f.error}`));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
