const fs = require('fs');
const path = require('path');
const { buildInvestorIndex, findBestMatch } = require('./investor-activity-matcher');

let indexCache = null;
let scanTermsCache = null;

/** Common Reddit / founder spellings → a name the matcher understands. */
const MENTION_ALIASES = {
  peakxv: 'Peak XV',
  'peak xv partners': 'Peak XV',
  'peak xv': 'Peak XV',
  'sequoia india': 'Peak XV',
  'sequoia capital india': 'Peak XV',
  sequoia: 'Peak XV',
  'lightspeed vc': 'Lightspeed',
  'lightspeed india': 'Lightspeed',
  'lightspeed venture partners': 'Lightspeed',
  vcats: '9Unicorns',
  'venture catalysts': '9Unicorns',
  '9 unicorns': '9Unicorns',
  '100 unicorns': '100Unicorns',
  '9unicorns/vcats': '9Unicorns',
  '9unicorns': '9Unicorns',
  elevation: 'Elevation Capital',
  antler: 'Antler',
  'antler india': 'Antler',
  matrix: 'Matrix Partners',
  'matrix partners india': 'Matrix Partners',
  kalaari: 'Kalaari Capital',
  'inflection point': 'Inflection Point Ventures',
  'wtf fund': 'Nikhil Kamath',
  'nikhil kamath wtf': 'Nikhil Kamath',
  'nikhil kamath’s wtf fund': 'Nikhil Kamath',
  "nikhil kamath's wtf fund": 'Nikhil Kamath'
};

/** Hard slug overrides when fuzzy matching is too strict. */
const ALIAS_SLUGS = {
  'venture catalysts': 'venture-catalysts-india-s-first-integrated-incubator',
  vcats: 'venture-catalysts-india-s-first-integrated-incubator',
  '9unicorns/vcats': '9unicorns',
  'wtf fund': 'nikhil-kamath'
};

function loadInvestorIndex() {
  if (indexCache) return indexCache;
  const filePath = path.join(__dirname, '..', 'data', 'investors.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  indexCache = buildInvestorIndex(data.investors || []);
  return indexCache;
}

function normalizeMention(raw) {
  let mention = String(raw || '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!mention) return '';

  // Drop trailing score fragments from table cells: "Lightspeed|8/10"
  mention = mention.split('|')[0].trim();

  const key = mention.toLowerCase().replace(/[’']/g, "'");
  if (MENTION_ALIASES[key]) return MENTION_ALIASES[key];

  // "Sequoia India (PeakXV)" → try PeakXV / Peak XV first
  const paren = mention.match(/\(([^)]+)\)/);
  if (paren) {
    const inner = paren[1].trim();
    const aliased = MENTION_ALIASES[inner.toLowerCase()] || inner;
    if (aliased.length >= 3) return aliased;
  }

  return mention;
}

function extractBoldMentions(text) {
  const out = [];
  const re = /\*\*([^*]{2,80})\*\*/g;
  let m;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
}

function extractTableVcMentions(text) {
  const out = [];
  const lines = String(text || '').split('\n');
  let inTable = false;
  let headerLooksLikeVc = false;

  for (const line of lines) {
    if (!/^\s*\|.+\|\s*$/.test(line)) {
      inTable = false;
      headerLooksLikeVc = false;
      continue;
    }
    const cells = line
      .trim()
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());
    if (!cells.length) continue;

    if (!inTable) {
      inTable = true;
      headerLooksLikeVc = /^(vc|fund|investor|firm)$/i.test(cells[0] || '');
      continue;
    }
    if (/^:?-+:?$/.test(cells[0] || '')) continue;
    if (headerLooksLikeVc && cells[0]) out.push(cells[0]);
  }
  return out;
}

function buildScanTerms(index) {
  if (scanTermsCache) return scanTermsCache;
  const terms = [];
  const seen = new Set();

  function add(term, slug, name) {
    const t = String(term || '').trim();
    if (t.length < 4) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    // Skip ultra-generic single words that false-positive often
    if (!/\s/.test(t) && t.length < 6) return;
    seen.add(key);
    terms.push({ term: t, key, slug, name });
  }

  for (const inv of index) {
    add(inv.name, inv.slug, inv.name);
    // Left / right side of "A / B" names
    for (const part of String(inv.name).split(/\s*\/\s*|\s*\|\s*/)) {
      add(part.replace(/\([^)]*\)/g, '').trim(), inv.slug, inv.name);
    }
    // Parenthetical aka
    const paren = String(inv.name).match(/\(([^)]+)\)/);
    if (paren) add(paren[1], inv.slug, inv.name);
  }

  for (const [alias, canonical] of Object.entries(MENTION_ALIASES)) {
    if (ALIAS_SLUGS[alias]) {
      const inv = index.find((i) => i.slug === ALIAS_SLUGS[alias]);
      if (inv) add(alias, inv.slug, inv.name);
    }
    const hit = findBestMatch(canonical, index);
    if (hit) add(alias, hit.inv.slug, hit.inv.name);
  }

  for (const [alias, slug] of Object.entries(ALIAS_SLUGS)) {
    const inv = index.find((i) => i.slug === slug);
    if (inv) add(alias, inv.slug, inv.name);
  }

  terms.sort((a, b) => b.term.length - a.term.length);
  scanTermsCache = terms;
  return terms;
}

function scanBodyForInvestors(text, index) {
  const hay = String(text || '');
  if (!hay.trim()) return [];
  const lower = hay.toLowerCase();
  const found = [];
  const seen = new Set();

  for (const term of buildScanTerms(index)) {
    const idx = lower.indexOf(term.key);
    if (idx < 0) continue;
    // Word-ish boundary check
    const before = idx === 0 ? ' ' : lower[idx - 1];
    const after = idx + term.key.length >= lower.length ? ' ' : lower[idx + term.key.length];
    if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) continue;
    if (seen.has(term.slug)) continue;
    seen.add(term.slug);
    found.push(term.name);
  }
  return found;
}

/**
 * Map raw investor mention strings to known fund slugs.
 * @param {string[]} mentionNames
 * @returns {{ slugs: string[], names: string[] }}
 */
function resolveMention(raw, index) {
  const rawKey = String(raw || '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'");

  if (ALIAS_SLUGS[rawKey]) {
    const inv = index.find((i) => i.slug === ALIAS_SLUGS[rawKey]);
    if (inv) return inv;
  }

  const mention = normalizeMention(raw);
  if (!mention || mention.length < 3) return null;

  const mentionKey = mention.toLowerCase();
  if (ALIAS_SLUGS[mentionKey]) {
    const inv = index.find((i) => i.slug === ALIAS_SLUGS[mentionKey]);
    if (inv) return inv;
  }

  const hit = findBestMatch(mention, index);
  return hit ? hit.inv : null;
}

function matchInvestorMentions(mentionNames) {
  const index = loadInvestorIndex();
  const slugs = [];
  const names = [];
  const seen = new Set();

  for (const raw of mentionNames || []) {
    const inv = resolveMention(raw, index);
    if (!inv || seen.has(inv.slug)) continue;
    seen.add(inv.slug);
    slugs.push(inv.slug);
    names.push(inv.name);
  }

  return { slugs, names };
}

/**
 * Combine AI mentions + body/title extraction for Fund in conversation.
 */
function matchInvestorsInBuzz({ title = '', body = '', aiMentions = [] } = {}) {
  const index = loadInvestorIndex();
  const candidates = [
    ...aiMentions,
    ...extractBoldMentions(body),
    ...extractTableVcMentions(body),
    ...scanBodyForInvestors(`${title}\n${body}`, index)
  ];

  // Prefer longer / earlier unique matches via matchInvestorMentions dedupe
  return matchInvestorMentions(candidates);
}

module.exports = {
  loadInvestorIndex,
  matchInvestorMentions,
  matchInvestorsInBuzz,
  normalizeMention,
  extractBoldMentions,
  extractTableVcMentions
};
