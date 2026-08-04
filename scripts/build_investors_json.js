#!/usr/bin/env node
/**
 * Build normalized investors JSON from the Org CSV.
 * Usage: node scripts/build_investors_json.js
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'Updated VC Dekho Sheet - Org.csv');
const OUT_PATH = path.join(ROOT, 'data', 'investors.json');

const STAGE_CANON = [
  { id: 'pre-seed', label: 'Pre-Seed', match: [/pre[-\s]?seed/i, /preseed/i] },
  { id: 'seed', label: 'Seed', match: [/\bseed\b/i], exclude: [/pre[-\s]?seed/i, /preseed/i] },
  { id: 'pre-series-a', label: 'Pre-Series A', match: [/pre[-\s]?series\s*a/i] },
  { id: 'series-a', label: 'Series A', match: [/series\s*a\b/i], exclude: [/pre[-\s]?series\s*a/i] },
  { id: 'series-b', label: 'Series B', match: [/series\s*b/i] },
  { id: 'series-c', label: 'Series C+', match: [/series\s*[c-z]/i, /growth/i, /pre[-\s]?ipo/i] },
  { id: 'debt', label: 'Debt', match: [/\bdebt\b/i, /venture\s*debt/i] }
];

const SECTOR_CANON = [
  { id: 'ai-ml', label: 'AI / ML', match: [/\bai\b/i, /artificial intelligence/i, /\bml\b/i, /machine learning/i] },
  { id: 'saas', label: 'SaaS / Enterprise', match: [/saas/i, /enterprise/i, /b2b software/i, /devops/i] },
  { id: 'fintech', label: 'Fintech', match: [/fintech/i, /finance/i, /payments?/i, /insurtech/i, /wealthtech/i] },
  { id: 'consumer', label: 'Consumer / D2C', match: [/consumer/i, /\bd2c\b/i, /ecommerce/i, /e-commerce/i, /marketplace/i] },
  { id: 'health', label: 'Healthcare / Medtech', match: [/health/i, /medtech/i, /biotech/i, /life sciences/i, /wellness/i] },
  { id: 'climate', label: 'Climate / Sustainability', match: [/climate/i, /sustainab/i, /cleantech/i, /energy/i, /ev\b/i] },
  { id: 'deeptech', label: 'Deep Tech', match: [/deep\s*tech/i, /hardtech/i, /semiconductor/i, /robotics/i, /iot/i, /space/i] },
  { id: 'edtech', label: 'Edtech', match: [/edtech/i, /education/i] },
  { id: 'logistics', label: 'Supply Chain / Logistics', match: [/logistics/i, /supply\s*chain/i, /mobility/i] },
  { id: 'agritech', label: 'Agritech / Food', match: [/agri/i, /food/i, /farming/i] },
  { id: 'gaming', label: 'Gaming / Media', match: [/gaming/i, /media/i, /entertainment/i, /content/i] },
  { id: 'proptech', label: 'PropTech / Real Estate', match: [/prop\s*tech/i, /real\s*estate/i] },
  { id: 'impact', label: 'Social Impact', match: [/impact/i, /social/i, /inclusion/i] },
  { id: 'cyber-security', label: 'Cyber Security', match: [/cyber\s*security/i, /cybersecurity/i, /infosec/i, /information security/i, /cloud\s*security/i, /endpoint security/i, /threat detection/i, /zero trust/i, /application security/i, /devsecops/i] },
  { id: 'blockchain', label: 'Blockchain', match: [/blockchain/i, /\bweb3\b/i, /\bcrypto\b/i, /crypto\//i, /crypto-/i, /\bdefi\b/i, /\bnft\b/i, /gamefi/i, /tokenomics/i, /on[-\s]?chain/i] },
  { id: 'sector-agnostic', label: 'Sector Agnostic', match: [/sector\s*agnostic/i, /multi[-\s]?sector/i, /generalist/i] }
];

const THESIS_THEMES = [
  { id: 'early-stage-builders', label: 'Early-stage builders', match: [/early[-\s]?stage/i, /first cheque/i, /pre[-\s]?seed/i, /seed/i, /day[-\s]?zero/i] },
  { id: 'founder-led', label: 'Founder-led / operator capital', match: [/founder/i, /operator/i, /angel/i] },
  { id: 'tech-first', label: 'Tech-first / product companies', match: [/technology/i, /tech[-\s]?enabled/i, /software/i, /saas/i, /product/i] },
  { id: 'india-first', label: 'India-first / Bharat', match: [/india/i, /bharat/i, /tier\s*[23]/i, /southeast asia/i, /sea\b/i] },
  { id: 'category-creators', label: 'Category creators', match: [/category/i, /enduring companies/i, /category[-\s]?defining/i, /transform/i] },
  { id: 'impact-inclusion', label: 'Impact & inclusion', match: [/impact/i, /inclusion/i, /underserved/i, /climate/i, /sustainab/i] },
  { id: 'growth-scale', label: 'Growth & scale-ups', match: [/growth/i, /scale/i, /series\s*[b-z]/i, /pre[-\s]?ipo/i] },
  { id: 'deep-science', label: 'Deep science / hard tech', match: [/deep\s*tech/i, /hard\s*tech/i, /science/i, /research/i, /semiconductor/i] },
  { id: 'fintech', label: 'Fintech / embedded finance', match: [/fintech/i, /embedded finance/i, /payments?/i, /\bupi\b/i, /insurtech/i, /wealthtech/i, /lending/i], sectorIds: ['fintech'] },
  { id: 'saas-b2b', label: 'SaaS / B2B software', match: [/\bsaas\b/i, /b2b software/i, /enterprise software/i, /b2b saas/i], sectorIds: ['saas'] },
  { id: 'consumer-d2c', label: 'Consumer / D2C brands', match: [/\bd2c\b/i, /consumer brand/i, /direct[-\s]?to[-\s]?consumer/i, /consumer internet/i, /marketplace/i], sectorIds: ['consumer'] },
  { id: 'ai-ml', label: 'AI / ML', match: [/\bai\b/i, /artificial intelligence/i, /machine learning/i, /\bml\b/i, /generative ai/i, /enterprise[-\s]?ai/i], sectorIds: ['ai-ml'] },
  { id: 'healthtech', label: 'Healthtech / wellness', match: [/healthtech/i, /health[-\s]?tech/i, /healthcare/i, /wellness/i, /medtech/i, /digital health/i], sectorIds: ['health'] },
  { id: 'climate', label: 'Climate / sustainability', match: [/climate/i, /sustainab/i, /clean[-\s]?tech/i, /cleantech/i, /renewable/i, /net[-\s]?zero/i], sectorIds: ['climate'] },
  { id: 'pre-seed-day-zero', label: 'Pre-seed / day-zero', match: [/pre[-\s]?seed/i, /day[-\s]?zero/i, /first cheque/i, /first significant backer/i], stageIds: ['pre-seed'] },
  { id: 'crypto-web3', label: 'Crypto / Web3', match: [/crypto/i, /web3/i, /blockchain/i, /bitcoin/i, /\bdefi\b/i], sectorIds: ['blockchain'] },
  { id: 'cyber-security', label: 'Cybersecurity / infosec', match: [/cyber\s*security/i, /cybersecurity/i, /infosec/i, /cloud\s*security/i, /threat detection/i], sectorIds: ['cyber-security'] },
  { id: 'family-offices', label: 'Family offices', match: [/family\s*office/i, /patient capital/i], typeIds: ['family-office'] },
  { id: 'angel-syndicates', label: 'Angel syndicates / networks', match: [/syndicate/i, /angel network/i, /angel community/i, /rolling fund/i], typeIds: ['syndicate', 'angel'] },
  { id: 'agri-food', label: 'Agri / food systems', match: [/agri/i, /agtech/i, /foodtech/i, /agriculture/i, /farming/i, /food system/i], sectorIds: ['agritech'] },
  { id: 'logistics-supply', label: 'Logistics / supply chain', match: [/logistics/i, /supply\s*chain/i, /warehous/i, /fulfiliment/i], sectorIds: ['logistics'] },
  { id: 'series-a-pmf', label: 'Series A / PMF capital', match: [/series\s*a\b/i, /product[-\s]?market[-\s]?fit/i, /\bpmf\b/i, /early growth/i], stageIds: ['series-a', 'pre-series-a'], exclude: [/pre[-\s]?series\s*a/i] },
  { id: 'edtech', label: 'Edtech / skilling', match: [/edtech/i, /ed[-\s]?tech/i, /skilling/i, /education tech/i, /learning platform/i], sectorIds: ['edtech'] },
  { id: 'micro-vc', label: 'Micro-VC / small cheque', match: [/micro[-\s]?vc/i, /small cheque/i, /cheque size.*(25|50|100|150|200)k/i] },
  { id: 'bootstrapped-profit', label: 'Bootstrapped / profitability-first', match: [/bootstrapp/i, /profitab/i, /unit economics/i, /capital efficien/i, /path to profit/i, /cash[-\s]?flow positive/i, /default[-\s]?alive/i] },
  { id: 'platform-marketplace', label: 'Platform / marketplace builders', match: [/marketplace/i, /two[-\s]?sided/i, /network effect/i, /platform business/i, /platform play/i] },
  { id: 'gaming-media', label: 'Gaming / media', match: [/gaming/i, /\bgame\b/i, /entertainment/i, /\bmedia\b/i, /content platform/i], sectorIds: ['gaming'] },
  { id: 'proptech', label: 'Proptech / real estate', match: [/prop\s*tech/i, /proptech/i, /real estate/i, /housing tech/i], sectorIds: ['proptech'] },
  { id: 'accelerator-studio', label: 'Accelerator / studio-linked', match: [/accelerator/i, /incubator/i, /venture studio/i, /startup studio/i, /government\s*grant/i, /\bgrant\s*scheme\b/i], typeIds: ['accelerator', 'government-grant'] },
  { id: 'sea-india', label: 'Southeast Asia + India', match: [/southeast asia/i, /\bsea\b/i, /\basean\b/i, /india and southeast/i] },
  { id: 'mobility-ev', label: 'Mobility / EV', match: [/mobility/i, /\bev\b/i, /electric vehicle/i, /auto[-\s]?tech/i, /two[-\s]?wheeler/i, /three[-\s]?wheeler/i, /fleet electr/i] }
];

// More specific types listed first so hybrids like "VC / Family Office" classify as FO/CVC/etc.
const TYPE_CANON = [
  { id: 'family-office', label: 'Family Office', match: [/family\s*office/i] },
  { id: 'government-grant', label: 'Government Grant', match: [/government\s*grant/i, /\bgrant\s*scheme\b/i] },
  { id: 'accelerator', label: 'Accelerator', match: [/accelerator/i, /incubator/i, /venture\s*studio/i] },
  { id: 'corporate', label: 'Corporate / CVC', match: [/corporate/i, /\bcvc\b/i, /strategic\s*fintech/i] },
  { id: 'syndicate', label: 'Syndicate / Network', match: [/syndicate/i, /angel\s*network/i] },
  { id: 'angel', label: 'Angel / Individual', match: [/\bangel\b/i, /individual/i] },
  { id: 'pe', label: 'Private Equity', match: [/\bpe\b/i, /private\s*equity/i, /growth\s*equity/i] },
  { id: 'vc', label: 'Venture Capital', match: [/^vc\b/i, /venture capital/i, /micro\s*vc/i, /impact\s*vc/i, /vc\s*\/\s*growth/i, /\bventures?\b/i] }
];

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'investor';
}

function splitList(value) {
  return String(value || '')
    .split(/[,;/|]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function matchCanon(text, canonList) {
  const hits = [];
  for (const item of canonList) {
    const ok = item.match.some(re => re.test(text));
    const blocked = (item.exclude || []).some(re => re.test(text));
    if (ok && !blocked) hits.push({ id: item.id, label: item.label });
  }
  return hits;
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

/**
 * Approximate FX for ticket filters (INR → USD).
 * Intentional round number so founders can compare bands; not live FX.
 */
const INR_PER_USD = 83;

function inrToUsd(inr) {
  if (inr == null || Number.isNaN(inr)) return null;
  // Round to nearest $1K so filter labels stay clean after FX
  return Math.round(inr / INR_PER_USD / 1000) * 1000;
}

function parseInrUnit(unit) {
  const u = String(unit || '').toLowerCase();
  if (/^(cr|crs|crore|crores)$/.test(u)) return 1e7;
  if (/^(lakh|lakhs|lac|lacs|l)$/.test(u)) return 1e5;
  return 0;
}

function isFundCorpusContext(raw, matchIndex) {
  const start = Math.max(0, matchIndex - 40);
  const window = raw.slice(start, matchIndex + 60).toLowerCase();
  if (/per\s+(deal|startup|company|cheque|check)/.test(window)) return false;
  if (/initial|cheque|ticket|per\s*deal/.test(window) && !/corpus|greenshoe/.test(window)) {
    return false;
  }
  return /\b(fund\s*(i{1,3}|[0-9]+|ii)?|corpus|greenshoe|aum|across\s+\d+\+?\s*deals)\b/.test(window);
}

function parseCheque(text) {
  const raw = String(text || '');
  const trimmed = raw.trim();
  if (!trimmed) return { min: null, max: null, label: null };
  if (/^n\/?a$/i.test(trimmed) || /^not\s+(publicly\s+)?disclosed\b/i.test(trimmed)) {
    return { min: null, max: null, label: trimmed };
  }

  const usdAmounts = [];
  // Prefer explicit $ amounts when present
  const usdRe = /\$\s*([\d,.]+)\s*(k|m|mn|million|b|bn|billion)?/gi;
  let m;
  while ((m = usdRe.exec(raw)) !== null) {
    let n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isNaN(n)) continue;
    const unit = (m[2] || '').toLowerCase();
    if (unit === 'k') n *= 1e3;
    else if (unit === 'm' || unit === 'mn' || unit === 'million') n *= 1e6;
    else if (unit === 'b' || unit === 'bn' || unit === 'billion') n *= 1e9;
    else if (n > 0 && n < 1000) n *= 1e6; // bare $8 → $8M
    if (n >= 1000) usdAmounts.push(n);
  }
  if (usdAmounts.length) {
    return {
      min: Math.min(...usdAmounts),
      max: Math.max(...usdAmounts),
      label: trimmed,
      source: 'usd'
    };
  }

  // INR / ₹ / Rs with Cr / Lakh (and ranges)
  const inrAmounts = [];
  const pushInr = (value, unit, index) => {
    let n = parseFloat(String(value).replace(/,/g, ''));
    if (Number.isNaN(n)) return;
    const mult = parseInrUnit(unit);
    if (!mult) return;
    const inr = n * mult;
    // Skip obvious fund/corpus figures unless tiny (lakh-sized)
    if (mult >= 1e7 && inr >= 50e7 && isFundCorpusContext(raw, index)) return;
    // "across N deals" aggregates — skip large Cr totals in that phrasing
    const around = raw.slice(Math.max(0, index - 10), index + 50).toLowerCase();
    if (/across\s+\d+/.test(around)) return;
    const usd = inrToUsd(inr);
    if (usd != null && usd >= 1000) inrAmounts.push(usd);
  };

  // INR 2–5 Cr | INR 1-6 Cr | ₹10 Lakh | Rs. 3cr | INR 3cr-INR 40cr
  const inrRangeRe =
    /(?:INR|₹|Rs\.?)\s*([\d,.]+)\s*(Cr|Crore|Crs|Lakh|Lac|Lacs|L)?\s*(?:–|-|—|to)\s*(?:(?:INR|₹|Rs\.?)\s*)?([\d,.]+)\s*(Cr|Crore|Crs|Lakh|Lac|Lacs|L)/gi;
  while ((m = inrRangeRe.exec(raw)) !== null) {
    const unitA = m[2] || m[4];
    const unitB = m[4] || m[2];
    pushInr(m[1], unitA, m.index);
    pushInr(m[3], unitB, m.index);
  }

  // INR 75L–3 Cr style already covered if both units present; also "75L–3 Cr" without INR prefix
  const bareRangeRe =
    /([\d,.]+)\s*(Cr|Crore|Crs|Lakh|Lac|Lacs|L)\s*(?:–|-|—|to)\s*([\d,.]+)\s*(Cr|Crore|Crs|Lakh|Lac|Lacs|L)\b/gi;
  while ((m = bareRangeRe.exec(raw)) !== null) {
    pushInr(m[1], m[2], m.index);
    pushInr(m[3], m[4], m.index);
  }

  // Single INR amounts: INR 10 Cr, ₹12k already not Cr — INR 10 Lakh
  const inrSingleRe = /(?:INR|₹|Rs\.?)\s*([\d,.]+)\s*(Cr|Crore|Crs|Lakh|Lac|Lacs|L)\b/gi;
  while ((m = inrSingleRe.exec(raw)) !== null) {
    pushInr(m[1], m[2], m.index);
  }

  // Compact: 3cr / 40cr without separator words already handled in ranges; singles like "3cr"
  const compactRe = /(?<![A-Za-z])([\d,.]+)\s*(cr|crore|crs|lakh|lac|lacs)\b/gi;
  while ((m = compactRe.exec(raw)) !== null) {
    // Avoid double-count if already captured via INR prefix at same number — OK to push dupes
    pushInr(m[1], m[2], m.index);
  }

  if (inrAmounts.length) {
    return {
      min: Math.min(...inrAmounts),
      max: Math.max(...inrAmounts),
      label: trimmed,
      source: 'inr'
    };
  }

  // Last resort: unit-less amounts — treat as USD tickets when they look like cheque sizes
  // e.g. "100,000 - 500,000", "USD 75000 - 100,000", "2,50,000-5,00,000"
  const loose = [];
  const looseRe = /([\d,.]+)\s*(k|m|mn|million|b|bn|billion)\b/gi;
  while ((m = looseRe.exec(raw)) !== null) {
    let n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isNaN(n)) continue;
    const unit = (m[2] || '').toLowerCase();
    if (unit === 'k') n *= 1e3;
    else if (unit === 'm' || unit === 'mn' || unit === 'million') n *= 1e6;
    else if (unit === 'b' || unit === 'bn' || unit === 'billion') n *= 1e9;
    if (n >= 1000) loose.push(n);
  }

  // Indian-format or plain USD integers (with optional USD prefix)
  const plainRe = /(?:USD|US\$)?\s*([\d]{1,3}(?:,\d{2},\d{3})+|[\d]{1,3}(?:,\d{3})+|\d{4,})/gi;
  while ((m = plainRe.exec(raw)) !== null) {
    // Skip percentages / ownership / deal counts nearby
    const around = raw.slice(Math.max(0, m.index - 12), m.index + m[0].length + 12).toLowerCase();
    if (/%|ownership|startups\/yr|deals\/|fund\s*i+\b/.test(around)) continue;
    let n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isNaN(n)) continue;
    // Indian lakh grouping sometimes written 2,50,000 — already stripped commas
    if (n >= 10000 && n <= 100000000) loose.push(n);
  }

  if (loose.length) {
    return {
      min: Math.min(...loose),
      max: Math.max(...loose),
      label: trimmed,
      source: 'loose'
    };
  }

  return { min: null, max: null, label: trimmed || null };
}

function formatUsd(n) {
  if (n == null) return null;
  if (n >= 1e6) {
    const v = n / 1e6;
    return `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (n >= 1e3) {
    const v = n / 1e3;
    return `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}K`;
  }
  return `$${n}`;
}

function classifyType(typeText) {
  const hits = matchCanon(typeText, TYPE_CANON);
  if (hits.length) return hits[0];
  return { id: 'other', label: typeText.trim() || 'Investor' };
}

function build() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  const usedSlugs = new Set();
  const investors = rows.map((row, idx) => {
    const name = (row.Company || '').trim();
    let slug = slugify(name);
    let base = slug;
    let n = 2;
    while (usedSlugs.has(slug)) {
      slug = `${base}-${n++}`;
    }
    usedSlugs.add(slug);

    const stageText = row['Invests in(Preseed, Seed, Series A ...)'] || '';
    const sectorText = row.Sector || '';
    const thesisText = row['Company Thesis'] || '';
    const typeText = row['Company Type'] || '';
    const cheque = parseCheque(row['Cheque Size']);

    const stages = uniqueById(matchCanon(stageText, STAGE_CANON));
    // Prefer explicit Sector cell + short thesis; include name/notes for keyword hits
    // (e.g. "W Health", "Beams") without scanning long template writeups.
    const writeupSnippet = String(row['Detailed Writeup (~200 words)'] || '').slice(0, 2500);
    let sectors = uniqueById(
      matchCanon(`${sectorText} ${thesisText} ${name} ${row.Notes || ''} ${writeupSnippet}`, SECTOR_CANON)
    );
    if (!sectors.length && sectorText.trim()) {
      const first = splitList(sectorText)[0] || 'Other';
      if (/^all sectors$/i.test(first) || /^sector-?agnostic$/i.test(first)) {
        sectors = [{ id: 'sector-agnostic', label: 'Sector Agnostic' }];
      } else if (/^(crypto|web3|blockchain)$/i.test(first) || /crypto\/blockchain/i.test(first)) {
        sectors = [{ id: 'blockchain', label: 'Blockchain' }];
      } else if (/^cyber\s*security$/i.test(first) || /^cybersecurity$/i.test(first)) {
        sectors = [{ id: 'cyber-security', label: 'Cyber Security' }];
      } else {
        sectors = [{ id: 'other', label: first }];
      }
    }
    if (!sectors.length) sectors = [{ id: 'sector-agnostic', label: 'Sector Agnostic' }];
    // If any specific sector is present, drop the generic agnostic tag
    if (sectors.length > 1) {
      sectors = sectors.filter((s) => s.id !== 'sector-agnostic');
    }

    const thesisThemes = uniqueById(matchCanon(`${thesisText} ${stageText} ${sectorText} ${typeText} ${row['Detailed Writeup (~200 words)'] || ''} ${row.Notes || ''}`, THESIS_THEMES));
    const type = classifyType(typeText);

    // Also tag themes from structured sector / stage / type fits
    for (const theme of THESIS_THEMES) {
      const sectorHit = (theme.sectorIds || []).some(id => sectors.some(s => s.id === id));
      const stageHit = (theme.stageIds || []).some(id => stages.some(s => s.id === id));
      const typeHit = (theme.typeIds || []).includes(type.id);
      if (sectorHit || stageHit || typeHit) {
        thesisThemes.push({ id: theme.id, label: theme.label });
      }
    }
    const finalThemes = uniqueById(thesisThemes);
    // Micro-VC: also tag small max cheque sizes
    if (cheque.max != null && cheque.max > 0 && cheque.max <= 250000) {
      finalThemes.push({ id: 'micro-vc', label: 'Micro-VC / small cheque' });
    }
    const themesOut = uniqueById(finalThemes);
    if (!themesOut.length && thesisText) {
      themesOut.push({ id: 'general', label: 'General thesis' });
    }

    let chequeLabel = cheque.label;
    if (cheque.min != null && cheque.max != null) {
      const a = formatUsd(cheque.min);
      const b = formatUsd(cheque.max);
      chequeLabel = a === b ? a : `${a} – ${b}`;
    }

    return {
      id: String(idx + 1),
      slug,
      name,
      type: type.label,
      typeId: type.id,
      companyTypeRaw: typeText,
      stages: stages.map(s => s.label),
      stageIds: stages.map(s => s.id),
      sectors: sectors.map(s => s.label),
      sectorIds: sectors.map(s => s.id),
      thesisThemes: themesOut.map(t => t.label),
      thesisThemeIds: themesOut.map(t => t.id),
      thesis: (row['Company Thesis'] || '').trim(),
      chequeSize: chequeLabel,
      chequeMin: cheque.min,
      chequeMax: cheque.max,
      website: (row.Website || '').trim(),
      linkedin: (row['Company Linkedin'] || '').trim(),
      notes: (row.Notes || '').trim(),
      criteria: (row['Investment Criteria (evaluation)'] || '').trim(),
      processNotes: (row['Process / Extra Notes'] || '').trim(),
      writeup: (row['Detailed Writeup (~200 words)'] || '').trim(),
      confidence: (row['Data Confidence'] || '').trim(),
      indiaRelevance: (row['India relevance'] || '').trim(),
      source: (row.Source || '').trim()
    };
  });

  // Preserve previously fetched logos across rebuilds
  const logosPath = path.join(ROOT, 'data', 'investor-logos.json');
  if (fs.existsSync(logosPath)) {
    try {
      const logos = JSON.parse(fs.readFileSync(logosPath, 'utf8'));
      investors.forEach((inv) => {
        if (logos[inv.slug] && logos[inv.slug].path) inv.logo = logos[inv.slug].path;
      });
    } catch (_) {}
  }

  // Static fallback for the "actively deploying" signal — a one-time snapshot
  // from the early manual runs of scripts/build_investor_activity.js. The live
  // source of truth is now the investor_activity DB table, refreshed
  // automatically by api/cron/investor-activity.js (news pipeline) and
  // api/cron/investor-activity-backfill.js (targeted web search), and merged
  // in at request time by utils/investors.js#ensureActivityFresh(). This file
  // is no longer regenerated — it only matters if the DB is briefly
  // unreachable. activelyDeploying itself is NOT stored here — it's derived
  // at request time from lastCheckDate, so the badge correctly ages out.
  const activityPath = path.join(ROOT, 'data', 'investor-activity.json');
  if (fs.existsSync(activityPath)) {
    try {
      const payload = JSON.parse(fs.readFileSync(activityPath, 'utf8'));
      const activity = payload.activity || {};
      investors.forEach((inv) => {
        const a = activity[inv.slug];
        if (!a) return;
        inv.lastCheckDate = a.lastCheckDate || null;
        inv.lastCheckSector = a.lastCheckSector || null;
        inv.lastCheckHighlight = a.lastCheckHighlight || null;
        inv.lastCheckSource = a.lastCheckSource || null;
        inv.lastCheckSourceTitle = a.lastCheckSourceTitle || null;
        inv.recentCheckCount = a.recentCheckCount || 0;
        inv.recentChecks = a.recentChecks || [];
      });
    } catch (_) {}
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    count: investors.length,
    filters: {
      stages: STAGE_CANON.map(s => ({ id: s.id, label: s.label })),
      sectors: SECTOR_CANON.map(s => ({ id: s.id, label: s.label })),
      thesisThemes: THESIS_THEMES.map(t => ({ id: t.id, label: t.label })),
      types: [...TYPE_CANON.map(t => ({ id: t.id, label: t.label })), { id: 'other', label: 'Other' }],
      chequeRanges: [
        { id: 'under-250k', label: 'Under $250K', min: 0, max: 250000 },
        { id: '250k-1m', label: '$250K – $1M', min: 250000, max: 1000000 },
        { id: '1m-5m', label: '$1M – $5M', min: 1000000, max: 5000000 },
        { id: '5m-plus', label: '$5M+', min: 5000000, max: null }
      ]
    },
    investors
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload), 'utf8');
  console.log(`Wrote ${investors.length} investors → ${OUT_PATH}`);
  console.log('Sample:', investors[0].name, investors[0].slug, investors[0].sectors.slice(0, 3));
}

build();
