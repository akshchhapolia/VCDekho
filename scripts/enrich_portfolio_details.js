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

const PROMPT = `You extract one funding deal detail. Given search results about an investor backing a specific startup, return JSON only:
{"found": true, "amount": "string or null", "stage": "Pre-Seed|Seed|Series A|Series B|Series C+|Bridge|Debt|Angel|null", "date": "YYYY-MM-DD or null", "highlight": "short phrase or null", "source_url": "best article URL", "source_title": "article title", "website": "startup website or null", "sector": "string or null"}
or {"found": false}
Only use the snippets. Do not invent.`;

function needsEnrichment(c) {
  if (!c || !c.name) return false;
  const hasAmount = c.amount && String(c.amount).trim() && String(c.amount).toLowerCase() !== 'unknown';
  const hasDate = Boolean(c.date);
  const hasSource = Boolean(c.sourceUrl);
  // Thin if missing both amount and source (or missing date+source).
  return !hasSource || (!hasAmount && !hasDate);
}

function extractJson(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

function investorAliases(inv) {
  const names = new Set([inv.name]);
  const blob = [inv.name, inv.writeup, inv.notes].filter(Boolean).join(' ');
  // "formerly 9Unicorns" / "rebranded from X"
  const formerly = blob.match(/formerly\s+([A-Z0-9][\w .&-]{1,40})/i);
  if (formerly) names.add(formerly[1].trim().replace(/[.,;].*$/, ''));
  const aka = blob.match(/(?:also known as|aka|rebranded from)\s+([A-Z0-9][\w .&-]{1,40})/i);
  if (aka) names.add(aka[1].trim().replace(/[.,;].*$/, ''));
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
    maxOutputTokens: 500,
    jsonMode: false
  });

  const parsed = extractJson(text);
  const costUsd = (usage?.costUsd || 0) + SEARLO_COST_PER_QUERY;
  if (!parsed || !parsed.found) return { company, costUsd, updated: false };

  const next = { ...company };
  if (parsed.amount) next.amount = String(parsed.amount);
  if (parsed.stage && String(parsed.stage).toLowerCase() !== 'null') next.stage = String(parsed.stage);
  if (parsed.highlight) next.highlight = String(parsed.highlight);
  if (parsed.date && !Number.isNaN(new Date(parsed.date).getTime())) {
    next.date = new Date(parsed.date).toISOString().slice(0, 10);
  }
  if (parsed.source_url) {
    next.sourceUrl = String(parsed.source_url);
    next.sourceTitle = parsed.source_title ? String(parsed.source_title) : next.sourceTitle;
  }
  if (parsed.website) {
    let website = String(parsed.website).trim();
    if (website && !/^https?:\/\//i.test(website)) website = 'https://' + website;
    next.website = website;
    next.logoUrl = next.logoUrl || logoUrlForWebsite(website);
  }
  if (parsed.sector) next.sector = String(parsed.sector);

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
