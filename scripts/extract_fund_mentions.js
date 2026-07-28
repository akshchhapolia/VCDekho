#!/usr/bin/env node
/**
 * Extract likely fund/investor mentions from news titles + digests
 * for Wave B+ candidate discovery. Does NOT publish — writes staging CSV.
 *
 * Usage:
 *   node scripts/extract_fund_mentions.js
 *   node scripts/extract_fund_mentions.js --limit 200
 *
 * Looks for local news JSON if present; otherwise samples recent /api-style
 * content files under data/ or content/. Output:
 *   data/candidates/news-fund-mentions.csv
 */
const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'candidates', 'news-fund-mentions.csv');

const STOP = new Set(
  [
    'india', 'indian', 'startup', 'startups', 'raises', 'raised', 'funding', 'round', 'series',
    'seed', 'pre', 'led', 'by', 'with', 'from', 'and', 'the', 'a', 'an', 'in', 'to', 'for',
    'crore', 'cr', 'million', 'billion', 'usd', 'inr', 'rs', 'rupees', 'closes', 'close',
    'fund', 'funds', 'venture', 'ventures', 'capital', 'partners', 'daily', 'digest', 'tech',
    'news', 'latest', 'how', 'why', 'what', 'after', 'over', 'into', 'its', 'new', 'first'
  ].map((s) => s.toLowerCase())
);

const FUND_HINT =
  /\b([A-Z][A-Za-z0-9&.’']+(?:\s+[A-Z][A-Za-z0-9&.’']+){0,4})\s+(Ventures|Capital|Partners|Fund|VC|Angels?|Investments?|Equity|Accelerator|Syndicate)\b/g;

const LED_BY = /(?:led by|co-led by|participated by|backing from|investors?(?: include|:))\s+([^.|;]+)/gi;

function normName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadExistingNorms() {
  const p = path.join(ROOT, 'data', 'investors.json');
  if (!fs.existsSync(p)) return new Set();
  const payload = JSON.parse(fs.readFileSync(p, 'utf8'));
  return new Set((payload.investors || []).map((i) => normName(i.name)));
}

function collectNewsTexts(limit) {
  const texts = [];
  const candidates = [
    path.join(ROOT, 'data', 'news.json'),
    path.join(ROOT, 'data', 'articles.json'),
    path.join(ROOT, 'content', 'news.json')
  ];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const list = Array.isArray(raw) ? raw : raw.articles || raw.news || raw.items || [];
      for (const a of list) {
        const title = a.title || a.headline || '';
        const desc = a.meta_description || a.summary || a.excerpt || a.description || '';
        const body = typeof a.content === 'string' ? a.content.replace(/<[^>]+>/g, ' ') : '';
        texts.push({
          source: a.slug ? `/news/${a.slug}` : file,
          title,
          text: [title, desc, body].filter(Boolean).join('\n')
        });
        if (texts.length >= limit) return texts;
      }
    } catch (_) {}
  }

  // Fallback: scan api/news article stubs if present as JS exports (best-effort strings)
  const articlePath = path.join(ROOT, 'api', 'news', 'article.js');
  if (fs.existsSync(articlePath)) {
    const src = fs.readFileSync(articlePath, 'utf8');
    const titles = [...src.matchAll(/title:\s*['`]([^'`]+)['`]/g)].map((m) => m[1]);
    for (const title of titles.slice(0, limit)) {
      texts.push({ source: 'api/news/article.js', title, text: title });
    }
  }

  return texts;
}

function extractFromText(text) {
  const found = new Map();
  const s = String(text || '');

  let m;
  const re = new RegExp(FUND_HINT.source, 'g');
  while ((m = re.exec(s)) !== null) {
    const name = `${m[1]} ${m[2]}`.replace(/\s+/g, ' ').trim();
    if (name.split(' ').length < 2) continue;
    const key = normName(name);
    if (!key || STOP.has(key)) continue;
    found.set(key, name);
  }

  let led;
  while ((led = LED_BY.exec(s)) !== null) {
    const chunk = led[1];
    const parts = chunk.split(/,| and | & /i).map((p) => p.trim()).filter(Boolean);
    for (let part of parts.slice(0, 6)) {
      part = part.replace(/\s+\(.*\)\s*$/, '').trim();
      if (part.length < 3 || part.length > 60) continue;
      if (!/[A-Z]/.test(part[0])) continue;
      const key = normName(part);
      if (!key || [...key.split(' ')].every((t) => STOP.has(t))) continue;
      found.set(key, part);
    }
  }

  return [...found.values()];
}

function main() {
  const args = process.argv.slice(2);
  const limIdx = args.indexOf('--limit');
  const limit = limIdx >= 0 ? Number(args[limIdx + 1]) || 300 : 300;

  const existing = loadExistingNorms();
  const news = collectNewsTexts(limit);
  const mentions = new Map();

  for (const item of news) {
    for (const name of extractFromText(item.text)) {
      const key = normName(name);
      if (existing.has(key)) continue;
      if (!mentions.has(key)) {
        mentions.set(key, {
          Company: name,
          'Company Type': 'VC',
          'India relevance': 'Active India cheque',
          Source: item.source,
          Notes: `Extracted from news: ${item.title || item.source}`,
          Wave: 'B-candidate',
          Status: 'needs_triage',
          mentionCount: 0
        });
      }
      mentions.get(key).mentionCount += 1;
      if (item.source && !String(mentions.get(key).Source).includes(item.source)) {
        mentions.get(key).Source += ` | ${item.source}`;
      }
    }
  }

  const rows = [...mentions.values()].sort((a, b) => b.mentionCount - a.mentionCount);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    stringify(rows, {
      header: true,
      columns: [
        'Company',
        'Company Type',
        'India relevance',
        'Source',
        'Notes',
        'Wave',
        'Status',
        'mentionCount'
      ]
    })
  );

  console.log(`Scanned ${news.length} news texts`);
  console.log(`Wrote ${rows.length} new fund-mention candidates → ${OUT}`);
  rows.slice(0, 15).forEach((r, i) => {
    console.log(`${i + 1}. ${r.Company} (x${r.mentionCount})`);
  });
}

main();
