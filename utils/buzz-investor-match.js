const fs = require('fs');
const path = require('path');
const { buildInvestorIndex, findBestMatch } = require('./investor-activity-matcher');

let indexCache = null;

function loadInvestorIndex() {
  if (indexCache) return indexCache;
  const filePath = path.join(__dirname, '..', 'data', 'investors.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  indexCache = buildInvestorIndex(data.investors || []);
  return indexCache;
}

/**
 * Map raw investor mention strings to known fund slugs.
 * @param {string[]} mentionNames
 * @returns {{ slugs: string[], names: string[] }}
 */
function matchInvestorMentions(mentionNames) {
  const index = loadInvestorIndex();
  const slugs = [];
  const names = [];
  const seen = new Set();

  for (const raw of mentionNames || []) {
    const mention = String(raw || '').trim();
    if (!mention || mention.length < 3) continue;
    const hit = findBestMatch(mention, index);
    if (!hit || seen.has(hit.inv.slug)) continue;
    seen.add(hit.inv.slug);
    slugs.push(hit.inv.slug);
    names.push(hit.inv.name);
  }

  return { slugs, names };
}

module.exports = { loadInvestorIndex, matchInvestorMentions };
