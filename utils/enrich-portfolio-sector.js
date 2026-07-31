/**
 * Infer portfolio company sector from homepage meta (title / description).
 */
const { generateText } = require('./gemini');

const UA =
  'Mozilla/5.0 (compatible; VCDekhoBot/1.0; +https://vcdekho.com) AppleWebKit/537.36';

const SECTOR_LABELS = [
  'AI / ML',
  'SaaS / Enterprise',
  'Fintech',
  'Consumer / D2C',
  'Healthcare / Medtech',
  'Climate / Sustainability',
  'Deep Tech',
  'Edtech',
  'Supply Chain / Logistics',
  'Agritech / Food',
  'Gaming / Media',
  'PropTech / Real Estate',
  'Social Impact'
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeMeta(raw) {
  return String(raw || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeta(html) {
  const title =
    decodeMeta((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]) ||
    decodeMeta((html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || [])[1]) ||
    decodeMeta((html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) || [])[1]);

  const description =
    decodeMeta((html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || [])[1]) ||
    decodeMeta((html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) || [])[1]) ||
    decodeMeta((html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) || [])[1]) ||
    decodeMeta((html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i) || [])[1]);

  return { title, description };
}

async function fetchWebsiteMeta(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 120000);
    return extractMeta(html);
  } catch (_) {
    return null;
  }
}

const SECTOR_PROMPT = `Classify this startup into 1–2 sectors from this list only (join with " / " if two fit):
${SECTOR_LABELS.join(', ')}
Reply with EXACTLY one line: SECTOR|confidence
Example: Fintech|high
If unclear: UNKNOWN|low
Use only homepage title/description. Do not invent.`;

function parseSectorLine(text) {
  const line = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^SECTOR\|/i.test(l) || SECTOR_LABELS.some((s) => l.includes(s)));
  if (!line) return null;
  const parts = line.replace(/^SECTOR\|/i, '').split('|');
  const sectorRaw = (parts[0] || line).replace(/^SECTOR\|/i, '').trim();
  if (!sectorRaw || /^unknown$/i.test(sectorRaw)) return null;
  // Validate labels are from our canon (allow combined with /)
  const bits = sectorRaw
    .split('/')
    .map((b) => b.trim())
    .filter(Boolean);
  const valid = bits.filter((b) =>
    SECTOR_LABELS.some((l) => l.toLowerCase() === b.toLowerCase() || l.toLowerCase().includes(b.toLowerCase()))
  );
  if (!valid.length) {
    // Accept close matches like "SaaS" -> SaaS / Enterprise
    for (const label of SECTOR_LABELS) {
      if (sectorRaw.toLowerCase().includes(label.split('/')[0].trim().toLowerCase())) {
        return label;
      }
    }
    return sectorRaw.slice(0, 80);
  }
  return valid
    .map((b) => SECTOR_LABELS.find((l) => l.toLowerCase().startsWith(b.toLowerCase())) || b)
    .slice(0, 2)
    .join(' / ');
}

async function inferSectorFromWebsite(company) {
  const url = company.website;
  if (!url) return { company, updated: false, costUsd: 0 };

  const meta = await fetchWebsiteMeta(url);
  if (!meta || (!meta.title && !meta.description)) {
    return { company, updated: false, costUsd: 0 };
  }

  const { text, usage } = await generateText({
    system: SECTOR_PROMPT,
    user: `Company: ${company.name}\nWebsite: ${url}\nTitle: ${meta.title || ''}\nDescription: ${meta.description || ''}`,
    maxOutputTokens: 60,
    jsonMode: false
  });

  const sector = parseSectorLine(text);
  const costUsd = usage?.costUsd || 0;
  if (!sector) return { company, updated: false, costUsd };

  return {
    company: { ...company, sector },
    updated: true,
    costUsd
  };
}

function needsSectorBackfill(c) {
  return Boolean(c && c.name && c.website && !c.sector);
}

async function enrichCompaniesSectors(companies, opts = {}) {
  const concurrency = opts.concurrency || 4;
  const delayMs = opts.delayMs || 80;
  const list = [...(companies || [])];
  const targets = list
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => needsSectorBackfill(c));

  let updated = 0;
  let spent = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < targets.length) {
      const idx = cursor++;
      const { c, i } = targets[idx];
      try {
        const result = await inferSectorFromWebsite(c);
        spent += result.costUsd || 0;
        if (result.updated) {
          list[i] = result.company;
          updated += 1;
        }
      } catch (_) {
        /* skip */
      }
      if (delayMs) await sleep(delayMs);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length || 1) }, () => worker())
  );
  return { companies: list, updated, checked: targets.length, costUsd: spent };
}

module.exports = {
  SECTOR_LABELS,
  fetchWebsiteMeta,
  inferSectorFromWebsite,
  needsSectorBackfill,
  enrichCompaniesSectors
};
