#!/usr/bin/env node
/**
 * Fill missing Website / Company Linkedin on Org.csv (research-only).
 *
 * Usage:
 *   node scripts/enrich_missing_links.js --limit 50
 *   node scripts/enrich_missing_links.js --limit 200 --batch-size 8
 *   node scripts/enrich_missing_links.js --dry-run --limit 20
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.production') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
require('dotenv').config();

// Ignore Vercel pull placeholders like [SENSITIVE...]
if (
  process.env.ANTHROPIC_API_KEY &&
  (/^\[SENSITIVE/i.test(process.env.ANTHROPIC_API_KEY) || process.env.ANTHROPIC_API_KEY.length < 20)
) {
  delete process.env.ANTHROPIC_API_KEY;
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), override: true });
  require('dotenv').config({
    path: require('path').join(__dirname, '..', '.env.production'),
    override: false
  });
}

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { Anthropic } = require('@anthropic-ai/sdk');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'Updated VC Dekho Sheet - Org.csv');
const REPORT_PATH = path.join(ROOT, 'data', 'candidates', 'missing-links-enrich-report.json');
const PROGRESS_PATH = path.join(ROOT, 'scripts', '.enrich_missing_links_progress.json');

const COL = {
  company: 'Company',
  type: 'Company Type',
  stages: 'Invests in(Preseed, Seed, Series A ...)',
  sector: 'Sector',
  website: 'Website',
  linkedin: 'Company Linkedin',
  notes: 'Notes',
  source: 'Source',
  thesis: 'Company Thesis',
  writeup: 'Detailed Writeup (~200 words)'
};

const USER_AGENT = 'Mozilla/5.0 (compatible; VCDekhoLinkEnrich/1.0; +https://vcdekho.com)';

function parseArgs(argv) {
  const args = {
    limit: 100,
    start: 0,
    batchSize: 3,
    dryRun: false,
    saveEvery: 1,
    prefer: 'all' // all | orgs | angels
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--start') args.start = Number(argv[++i]);
    else if (a === '--batch-size') args.batchSize = Number(argv[++i]);
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--save-every') args.saveEvery = Number(argv[++i]);
    else if (a === '--prefer') args.prefer = String(argv[++i] || 'all');
  }
  return args;
}

function blank(v) {
  return !(v && String(v).trim());
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

function normalizeHttpUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s.replace(/^\/\//, '');
  try {
    const u = new URL(s);
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    return u.toString();
  } catch {
    return '';
  }
}

function normalizeLinkedin(raw) {
  const s = normalizeHttpUrl(raw);
  if (!s) return '';
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return '';
    if (!/^\/(company|in|school)\//i.test(u.pathname)) return '';
    u.protocol = 'https:';
    u.hostname = 'www.linkedin.com';
    return u.toString();
  } catch {
    return '';
  }
}

async function probeWebsite(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10000);
  try {
    let res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' }
    });
    if (res.status >= 200 && res.status < 400) return { ok: true, finalUrl: res.url || url, status: res.status };
    if (res.status === 401 || res.status === 403) return { ok: true, finalUrl: res.url || url, status: res.status };
    return { ok: false, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(t);
  }
}

function websiteVariants(url) {
  const base = normalizeHttpUrl(url);
  if (!base) return [];
  const out = new Set([base]);
  try {
    const u = new URL(base);
    const host = u.hostname;
    const noWww = host.replace(/^www\./i, '');
    const withWww = host.startsWith('www.') ? host : 'www.' + host;
    for (const h of [host, noWww, withWww]) {
      const x = new URL(base);
      x.hostname = h;
      x.protocol = 'https:';
      out.add(x.toString());
      if (x.pathname === '/') {
        const y = new URL(x.toString());
        y.pathname = '';
        out.add(y.toString().replace(/\/?$/, '/'));
        out.add(y.toString().replace(/\/$/, ''));
      }
    }
  } catch {
    /* ignore */
  }
  return [...out];
}

async function probeWebsiteWithVariants(url) {
  for (const candidate of websiteVariants(url)) {
    const probe = await probeWebsite(candidate);
    if (probe.ok) return { ...probe, tried: candidate };
  }
  return { ok: false };
}

function isAngelType(type) {
  return /angel|individual/i.test(String(type || ''));
}

function buildBatchPrompt(items) {
  const payload = items.map((it) => ({
    id: it.id,
    company: it.company,
    type: it.type,
    stages: it.stages,
    sector: it.sector,
    notes: (it.notes || '').slice(0, 280),
    source: (it.source || '').slice(0, 160),
    thesis: (it.thesis || '').slice(0, 180),
    needWebsite: it.needWebsite,
    needLinkedin: it.needLinkedin,
    existingWebsite: it.existingWebsite || '',
    existingLinkedin: it.existingLinkedin || '',
    isAngel: isAngelType(it.type)
  }));

  return `Find the official website and/or LinkedIn URL for each investor org/person below.
These are real Indian-ecosystem VCs, PE firms, angels, accelerators, family offices, and government programs.

Be diligent: use well-known official domains when you know them (e.g. antler.co, ycombinator.com, peakxv.com, sequoiacap.com, softbank.com, temasek.com.sg, gic.com.sg, kkr.com, blackstone.com, generalatlantic.com, bvp.com, insightpartners.com).
For Indian angels/founders, LinkedIn /in/ profile URLs are often the best public presence — return those when known.
For government programs, prefer *.gov.in or official program portals.
For accelerators/incubators, prefer the institute or program homepage.

Only return a URL if you believe it is the correct entity (not a namesake). If unsure, "".
Never invent plausible-looking URLs.

INPUT JSON:
${JSON.stringify(payload, null, 2)}

Return ONLY a JSON array:
[
  {
    "id": 12,
    "website": "https://... or \"\"",
    "linkedin": "https://www.linkedin.com/company/... or https://www.linkedin.com/in/... or \"\"",
    "confidence": "high|medium|low",
    "reason": "brief evidence"
  }
]

Rules:
- Fill only fields where needWebsite/needLinkedin is true; else "".
- For isAngel=true, prioritize linkedin /in/ over website unless they clearly run a fund site.
- For firms, prefer linkedin /company/.
- confidence "low" => both URLs must be "".
- medium/high OK when you recognize the org from public knowledge.`;
}

async function enrichBatch(anthropic, items) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2200,
    system:
      'You are a meticulous researcher for VCDekho. Output JSON only. Prefer known official URLs. Never invent. Empty string when unsure.',
    messages: [{ role: 'user', content: buildBatchPrompt(items) }]
  });
  const text = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
  const cleaned = String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const data = JSON.parse(cleaned);
  if (!Array.isArray(data)) throw new Error('Expected JSON array');
  return data;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY missing');
    process.exit(1);
  }

  const rows = loadCsv();
  let candidates = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const needWebsite = blank(row[COL.website]);
    const needLinkedin = blank(row[COL.linkedin]);
    if (!needWebsite && !needLinkedin) continue;
    const type = row[COL.type] || '';
    const angel = isAngelType(type);
    if (args.prefer === 'orgs' && angel) continue;
    if (args.prefer === 'angels' && !angel) continue;
    candidates.push({
      id: i,
      company: row[COL.company],
      type,
      stages: row[COL.stages] || '',
      sector: row[COL.sector] || '',
      notes: row[COL.notes] || '',
      source: row[COL.source] || '',
      thesis: row[COL.thesis] || '',
      needWebsite,
      needLinkedin,
      existingWebsite: row[COL.website] || '',
      existingLinkedin: row[COL.linkedin] || ''
    });
  }

  // Prefer orgs first inside "all" for better hit rate early
  if (args.prefer === 'all') {
    candidates.sort((a, b) => Number(isAngelType(a.type)) - Number(isAngelType(b.type)));
  }

  const slice = candidates.slice(args.start, args.start + args.limit);
  console.log(
    `Missing-link candidates: ${candidates.length}; this run: ${slice.length} (prefer=${args.prefer}, batch=${args.batchSize})`
  );
  if (args.dryRun) {
    slice.slice(0, 20).forEach((c) => {
      console.log(
        `  ${c.company} | needWeb=${c.needWebsite} needLi=${c.needLinkedin} | ${c.type}`
      );
    });
    return;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const report = {
    generatedAt: new Date().toISOString(),
    filledWebsite: 0,
    filledLinkedin: 0,
    rejected: 0,
    failures: [],
    fills: []
  };

  for (let offset = 0; offset < slice.length; offset += args.batchSize) {
    const batch = slice.slice(offset, offset + args.batchSize);
    const label = `${offset + 1}-${Math.min(offset + batch.length, slice.length)}/${slice.length}`;
    process.stdout.write(`Batch ${label}: ${batch.map((b) => b.company).join(' | ')} ... `);

    let results;
    try {
      results = await enrichBatch(anthropic, batch);
    } catch (err) {
      console.log('FAIL', err.message.split('\n')[0]);
      report.failures.push({ batch: label, error: err.message });
      continue;
    }

    const byId = new Map(results.map((r) => [Number(r.id), r]));
    for (const item of batch) {
      const res = byId.get(item.id);
      if (!res) {
        report.rejected++;
        continue;
      }
      const conf = String(res.confidence || '').toLowerCase();
      if (conf === 'low') {
        report.rejected++;
        continue;
      }

      if (item.needWebsite && res.website) {
        let url = normalizeHttpUrl(res.website);
        if (url) {
          const probe = await probeWebsiteWithVariants(url);
          if (probe.ok) {
            rows[item.id][COL.website] = probe.finalUrl || url;
            report.filledWebsite++;
            report.fills.push({
              company: item.company,
              field: 'Website',
              url: rows[item.id][COL.website],
              confidence: conf,
              reason: res.reason || ''
            });
          } else {
            report.rejected++;
          }
        }
      }

      if (item.needLinkedin && res.linkedin) {
        const url = normalizeLinkedin(res.linkedin);
        if (url) {
          rows[item.id][COL.linkedin] = url;
          report.filledLinkedin++;
          report.fills.push({
            company: item.company,
            field: 'Company Linkedin',
            url,
            confidence: conf,
            reason: res.reason || ''
          });
        } else {
          report.rejected++;
        }
      }
    }

    console.log(`ok (+web ${report.filledWebsite}, +li ${report.filledLinkedin})`);
    if ((Math.floor(offset / args.batchSize) + 1) % args.saveEvery === 0 || offset + args.batchSize >= slice.length) {
      saveCsv(rows);
      fs.writeFileSync(
        PROGRESS_PATH,
        JSON.stringify(
          {
            updatedAt: new Date().toISOString(),
            filledWebsite: report.filledWebsite,
            filledLinkedin: report.filledLinkedin,
            lastOffset: offset
          },
          null,
          2
        )
      );
      console.log('  checkpoint saved');
    }

    // gentle pacing
    await new Promise((r) => setTimeout(r, 400));
  }

  saveCsv(rows);
  if (!fs.existsSync(path.dirname(REPORT_PATH))) fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log('\nDone.');
  console.log(`Filled websites: ${report.filledWebsite}`);
  console.log(`Filled LinkedIn: ${report.filledLinkedin}`);
  console.log(`Rejected/unsure: ${report.rejected}`);
  console.log('Report →', REPORT_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
