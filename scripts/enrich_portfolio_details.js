#!/usr/bin/env node
/**
 * Enrich thin portfolio rows (name-only) with amount / stage / date / source
 * via one Searlo + Gemini call per company. Use for investors whose cards
 * currently show bare names (e.g. writeup-sourced lists).
 *
 * Usage:
 *   node scripts/enrich_portfolio_details.js --slug 100unicorns
 *   node scripts/enrich_portfolio_details.js --limit 40 --concurrency 2
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../utils/db');
const { webSearch, SEARLO_COST_PER_QUERY } = require('../utils/web-search');
const { generateText } = require('../utils/gemini');
const { logoUrlForWebsite } = require('../utils/investor-portfolio-websearch');

const INVESTORS_PATH = path.join(__dirname, '..', 'data', 'investors.json');

function argVal(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (def === null || typeof def === 'string') return v == null ? def : v;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

const ONLY_SLUG = argVal('--slug', null);
const LIMIT = argVal('--limit', 30);
const CONCURRENCY = argVal('--concurrency', 2);

// Pipe format — Gemini flash often truncates wide JSON objects mid-string.
const PROMPT = `Extract one funding/exit detail from the search results about this investor and startup.
Reply with EXACTLY one line in this format (use - for unknown fields):
FOUND|AMOUNT|STAGE|DATE|HIGHLIGHT|SOURCE_URL|SOURCE_TITLE
Example:
YES|$7M|Series A|2021-09-28|$7M Series A led by 9Unicorns|https://example.com/story|Zypp raises \$7M
If nothing verifiable: NO||||||
Only use the snippets. Do not invent.`;

function needsEnrichment(c) {
  if (!c || !c.name) return false;
  const hasAmount = c.amount && String(c.amount).trim() && String(c.amount).toLowerCase() !== 'unknown';
  const hasDate = Boolean(c.date);
  const hasSource = Boolean(c.sourceUrl);
  // Thin if missing both amount and source (or missing date+source).
  return !hasSource || (!hasAmount && !hasDate);
}

function parseEnrichLine(text) {
  const line = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^(YES|NO)\|/i.test(l) || /^FOUND\|/i.test(l));
  if (!line) return null;
  const parts = line.split('|').map((p) => p.trim());
  // Allow FOUND|... or YES|...
  const flag = (parts[0] || '').toUpperCase();
  if (flag === 'NO' || flag === 'FOUND' && parts.length < 3) {
    if (flag === 'NO') return { found: false };
  }
  if (flag !== 'YES' && flag !== 'FOUND') return null;
  // If format is FOUND|true|... shift — we use YES/NO.
  if (flag === 'FOUND') return null;
  const dash = (v) => (!v || v === '-' || v.toLowerCase() === 'null' || v.toLowerCase() === 'unknown' ? null : v);
  const dateRaw = dash(parts[3]);
  let date = null;
  if (dateRaw && !Number.isNaN(new Date(dateRaw).getTime())) {
    date = new Date(dateRaw).toISOString().slice(0, 10);
  }
  return {
    found: true,
    amount: dash(parts[1]),
    stage: dash(parts[2]),
    date,
    highlight: dash(parts[4]),
    source_url: dash(parts[5]),
    source_title: dash(parts[6])
  };
}

function investorAliases(inv) {
  const names = new Set([inv.name]);
  const blob = [inv.name, inv.writeup, inv.notes].filter(Boolean).join(' ');
  // "formerly 9Unicorns" / "rebranded from X"
  const formerly = blob.match(/formerly\s+([A-Z0-9][\w .&-]{1,40}?)(?:\s+[—–-]|\s+is\b|[.,;]|$)/i);
  if (formerly) names.add(formerly[1].trim());
  const aka = blob.match(/(?:also known as|aka|rebranded from)\s+([A-Z0-9][\w .&-]{1,40}?)(?:\s+[—–-]|\s+is\b|[.,;]|$)/i);
  if (aka) names.add(aka[1].trim());
  // Common short form before slash: "Sequoia (India) / Peak XV"
  if (inv.name.includes('/')) {
    inv.name.split('/').forEach((p) => names.add(p.trim()));
  }
  return [...names].filter(Boolean);
}

async function enrichOne(inv, company) {
  const aliases = investorAliases(inv);
  const aliasClause = aliases.map((a) => `"${a}"`).join(' OR ');
  const q = `"${company.name}" (${aliasClause}) (funding OR investment OR invested OR exit OR backed OR led)`;
  const { organic } = await webSearch(q, { limit: 8, gl: 'in', hl: 'en' });
  if (!organic.length) return { company, costUsd: SEARLO_COST_PER_QUERY, updated: false };

  const { text, usage } = await generateText({
    system: PROMPT,
    user: `Investor: ${aliases.join(' / ')}\nStartup: ${company.name}\n\nResults:\n${organic
      .map((r, i) => `${i + 1}. ${r.title}\n${r.snippet || ''}\nURL: ${r.link}`)
      .join('\n\n')}`,
    maxOutputTokens: 200,
    jsonMode: false
  });

  const parsed = parseEnrichLine(text);
  const costUsd = (usage?.costUsd || 0) + SEARLO_COST_PER_QUERY;
  if (!parsed || !parsed.found) return { company, costUsd, updated: false };

  const next = { ...company };
  if (parsed.amount) next.amount = String(parsed.amount);
  if (parsed.stage) next.stage = String(parsed.stage);
  if (parsed.highlight) next.highlight = String(parsed.highlight);
  if (parsed.date) next.date = parsed.date;
  if (parsed.source_url) {
    next.sourceUrl = String(parsed.source_url);
    next.sourceTitle = parsed.source_title ? String(parsed.source_title) : next.sourceTitle;
  }
  // Fallback: if model gave amount/stage but forgot URL, take top organic article.
  if (!next.sourceUrl && organic[0] && organic[0].link) {
    next.sourceUrl = organic[0].link;
    next.sourceTitle = organic[0].title || next.sourceTitle;
  }
  if (!next.logoUrl && next.website) next.logoUrl = logoUrlForWebsite(next.website);

  const changed = JSON.stringify(next) !== JSON.stringify(company);
  return { company: next, costUsd, updated: changed };
}

async function runPool(items, worker, concurrency) {
  let idx = 0;
  async function next() {
    while (idx < items.length) {
      const i = idx++;
      await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}

async function main() {
  const bySlug = new Map(
    JSON.parse(fs.readFileSync(INVESTORS_PATH, 'utf8')).investors.map((i) => [i.slug, i])
  );

  let rows;
  if (ONLY_SLUG) {
    const res = await db.query(`SELECT slug, companies FROM investor_portfolio WHERE slug = $1`, [ONLY_SLUG]);
    rows = res.rows;
  } else {
    const res = await db.query(
      `SELECT slug, companies FROM investor_portfolio WHERE company_count > 0 ORDER BY updated_at DESC LIMIT $1`,
      [LIMIT * 3]
    );
    rows = res.rows.filter((r) => (r.companies || []).some(needsEnrichment)).slice(0, LIMIT);
  }

  console.log(`Enriching portfolio details for ${rows.length} investor(s)...\n`);
  let spent = 0;
  let updatedCos = 0;

  for (const row of rows) {
    const inv = bySlug.get(row.slug);
    if (!inv) continue;
    const companies = row.companies || [];
    const thinIdx = companies.map((c, i) => (needsEnrichment(c) ? i : -1)).filter((i) => i >= 0);
    if (!thinIdx.length) continue;

    console.log(`${inv.name}: ${thinIdx.length} thin companies`);
    const nextCompanies = companies.slice();
    await runPool(
      thinIdx,
      async (i) => {
        try {
          const { company, costUsd, updated } = await enrichOne(inv, companies[i]);
          spent += costUsd;
          if (updated) {
            nextCompanies[i] = company;
            updatedCos++;
            console.log(
              `  ✓ ${company.name} → ${company.amount || company.stage || ''} ${company.date || ''} ${company.sourceUrl ? '🔗' : ''}`
            );
          } else {
            console.log(`  - ${companies[i].name} → no deal detail found`);
          }
        } catch (err) {
          console.error(`  ✗ ${companies[i].name}: ${err.message}`);
        }
      },
      CONCURRENCY
    );

    await db.query(
      `UPDATE investor_portfolio SET companies = $2, company_count = $3, updated_at = NOW() WHERE slug = $1`,
      [row.slug, JSON.stringify(nextCompanies), nextCompanies.length]
    );
  }

  console.log(`\nDone. Updated ${updatedCos} companies. Est. spend $${spent.toFixed(4)}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
