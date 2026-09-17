#!/usr/bin/env node
/**
 * Backfill portfolio company websites when fund /companies/* pages are missing or broken.
 *
 * Usage:
 *   node scripts/enrich_portfolio_websites.js --slug 021-capital
 *   node scripts/enrich_portfolio_websites.js --all-thin --limit 50 --concurrency 2
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../utils/db');
const { webSearch, SEARLO_COST_PER_QUERY } = require('../utils/web-search');
const { generateText } = require('../utils/gemini');
const { logoUrlForWebsite } = require('../utils/investor-portfolio-websearch');
const { isFundPortfolioDetailUrl } = require('../utils/portfolio-card-href');

const INVESTORS_PATH = path.join(__dirname, '..', 'data', 'investors.json');

const PROMPT = `From the search results, find the official website for this startup (not LinkedIn, Crunchbase, Tracxn, fund portfolio pages, or news articles).
Reply EXACTLY one line:
YES|https://example.com
or
NO
Use only verifiable results. Do not guess domains.`;

function argVal(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (def === null || typeof def === 'string') return v == null ? def : v;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

const ONLY_SLUG = argVal('--slug', null);
const ALL_THIN = process.argv.includes('--all-thin');
const LIMIT = argVal('--limit', ALL_THIN ? 9999 : 20);
const CONCURRENCY = argVal('--concurrency', 2);
const BUDGET_USD = argVal('--budget', ALL_THIN ? 15 : Infinity);
const DELAY_MS = argVal('--delay-ms', 2500);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function needsWebsite(c, investorWebsite) {
  if (!c || !c.name) return false;
  const w = c.website ? String(c.website).trim() : '';
  if (w && /^https?:\/\//i.test(w) && !isFundPortfolioDetailUrl(w, investorWebsite)) return false;
  return true;
}

function parseWebsiteLine(text) {
  const line = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^(YES|NO)\|/i.test(l));
  if (!line) return null;
  const [flag, urlRaw] = line.split('|').map((p) => p.trim());
  if (/^NO/i.test(flag)) return null;
  if (!urlRaw || !/^https?:\/\//i.test(urlRaw)) return null;
  try {
    const u = new URL(urlRaw);
    if (/linkedin|crunchbase|tracxn|pitchbook|facebook|twitter|x\.com|instagram/i.test(u.hostname)) {
      return null;
    }
    return u.origin + '/';
  } catch (_) {
    return null;
  }
}

async function probeDomain(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'VCDekhoBot/1.0 (+https://vcdekho.com)' }
    });
    return res.ok || res.status === 403 || res.status === 405;
  } catch (_) {
    return false;
  }
}

async function guessWebsite(company) {
  const slug = slugify(company.name);
  if (!slug) return null;
  const candidates = [
    `https://${slug}.com`,
    `https://www.${slug}.com`,
    `https://${slug}.in`,
    `https://www.${slug}.in`,
    `https://${slug.replace(/-/g, '')}.com`,
    `https://${slug}.io`
  ];
  for (const url of candidates) {
    if (await probeDomain(url)) return url;
  }
  return null;
}

async function lookupWebsite(company, investorWebsite) {
  const guessed = await guessWebsite(company);
  if (guessed) return { website: guessed, costUsd: 0, method: 'domain_guess' };

  const q = `"${company.name}" startup official website India`;
  const res = await webSearch(q, { limit: 8, gl: 'in', hl: 'en' });
  const organic = res.organic || [];
  if (!organic.length) return { website: null, costUsd: SEARLO_COST_PER_QUERY, method: 'search' };

  const { text, usage } = await generateText({
    system: PROMPT,
    user: `Startup: ${company.name}\nInvestor site (ignore as answer): ${investorWebsite || 'n/a'}\n\nResults:\n${organic
      .map((r, i) => `${i + 1}. ${r.title}\n${r.snippet || ''}\nURL: ${r.link}`)
      .join('\n\n')}`,
    maxOutputTokens: 80,
    jsonMode: false
  });

  const website = parseWebsiteLine(text);
  return {
    website,
    costUsd: (usage?.costUsd || 0) + SEARLO_COST_PER_QUERY,
    method: 'search'
  };
}

async function runPool(items, worker, concurrency) {
  let idx = 0;
  async function nextWorker() {
    while (idx < items.length) {
      const i = idx++;
      await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, nextWorker));
}

async function main() {
  const bySlug = new Map(
    JSON.parse(fs.readFileSync(INVESTORS_PATH, 'utf8')).investors.map((i) => [i.slug, i])
  );

  let rows;
  if (ONLY_SLUG) {
    rows = (
      await db.query(`SELECT slug, companies FROM investor_portfolio WHERE slug = $1`, [ONLY_SLUG])
    ).rows;
  } else {
    rows = (
      await db.query(
        `SELECT slug, companies, company_count FROM investor_portfolio WHERE company_count > 0 ORDER BY company_count DESC`
      )
    ).rows;
  }

  let spend = 0;
  let investorsDone = 0;

  for (const row of rows.slice(0, LIMIT)) {
    if (spend >= BUDGET_USD) break;
    const inv = bySlug.get(row.slug);
    const investorWebsite = (inv && inv.website) || null;
    const companies = [...(row.companies || [])];
    const targets = companies
      .map((c, index) => ({ c, index }))
      .filter(({ c }) => needsWebsite(c, investorWebsite));

    if (!targets.length) continue;
    if (ALL_THIN && targets.length < companies.length * 0.4 && companies.length >= 8) {
      // Skip portfolios that are already mostly linked.
      const withSite = companies.filter((c) => !needsWebsite(c, investorWebsite)).length;
      if (withSite >= companies.length * 0.6) continue;
    }

    console.log(`\n${row.slug}: enriching ${targets.length}/${companies.length} companies…`);
    let updated = 0;

    await runPool(
      targets,
      async ({ c, index }) => {
        if (spend >= BUDGET_USD) return;
        await sleep(DELAY_MS);
        try {
          const { website, costUsd, method } = await lookupWebsite(c, investorWebsite);
          spend += costUsd;
          if (!website || isFundPortfolioDetailUrl(website, investorWebsite)) return;
          companies[index] = {
            ...c,
            website,
            logoUrl: c.logoUrl || logoUrlForWebsite(website),
            sourceUrl: c.sourceUrl,
            sourceTitle: c.sourceTitle
          };
          updated += 1;
          console.log(`  ✓ ${c.name} → ${website} (${method})`);
        } catch (err) {
          console.warn(`  ✗ ${c.name}: ${err.message}`);
        }
      },
      CONCURRENCY
    );

    if (updated > 0) {
      await db.query(
        `UPDATE investor_portfolio SET companies = $2, company_count = $3, updated_at = NOW() WHERE slug = $1`,
        [row.slug, JSON.stringify(companies), companies.length]
      );
    }
    console.log(`  saved ${updated} website(s) for ${row.slug}`);
    investorsDone += 1;
  }

  console.log(`\nDone. Investors processed: ${investorsDone}, est. spend: $${spend.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
