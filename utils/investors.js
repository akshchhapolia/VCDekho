const fs = require('fs');
const path = require('path');
const { INVESTMENT_STAGES } = require('../data/investment-stages');

let cache = null;

const STAGE_GUIDE_IDS = new Set(INVESTMENT_STAGES.map(s => s.id));

function loadInvestorsData() {
  if (cache) return cache;
  const filePath = path.join(__dirname, '..', 'data', 'investors.json');
  cache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return cache;
}

function getFilters() {
  return loadInvestorsData().filters;
}

function getAllInvestors() {
  return loadInvestorsData().investors;
}

function getInvestorBySlug(slug) {
  return getAllInvestors().find(i => i.slug === slug) || null;
}

function hasStageGuide(id) {
  return Boolean(id && STAGE_GUIDE_IDS.has(id));
}

function getStageGuideLabel(id) {
  const stage = INVESTMENT_STAGES.find(s => s.id === id);
  return stage ? stage.label : id;
}

function chequeOverlaps(inv, range) {
  if (inv.chequeMin == null && inv.chequeMax == null) return false;
  const min = inv.chequeMin != null ? inv.chequeMin : inv.chequeMax;
  const max = inv.chequeMax != null ? inv.chequeMax : inv.chequeMin;
  const rMin = range.min == null ? 0 : range.min;
  const rMax = range.max == null ? Number.POSITIVE_INFINITY : range.max;
  return max >= rMin && min <= rMax;
}

function filterInvestors(query = {}) {
  const data = loadInvestorsData();
  let list = data.investors;

  const q = (query.q || '').trim().toLowerCase();
  const sector = query.sector || '';
  const stage = query.stage || '';
  const type = query.type || '';
  const thesis = query.thesis || '';
  const cheque = query.cheque || '';

  if (q) {
    list = list.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.thesis || '').toLowerCase().includes(q) ||
      (i.writeup || '').toLowerCase().includes(q) ||
      i.sectors.join(' ').toLowerCase().includes(q)
    );
  }
  if (sector) list = list.filter(i => i.sectorIds.includes(sector));
  if (stage) list = list.filter(i => i.stageIds.includes(stage));
  if (type) list = list.filter(i => i.typeId === type);
  if (thesis) list = list.filter(i => i.thesisThemeIds.includes(thesis));
  if (cheque) {
    const range = (data.filters.chequeRanges || []).find(r => r.id === cheque);
    if (range) list = list.filter(i => chequeOverlaps(i, range));
  }

  list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function toCard(investor) {
  return {
    slug: investor.slug,
    name: investor.name,
    type: investor.type,
    typeId: investor.typeId,
    stages: investor.stages,
    stageIds: investor.stageIds || [],
    sectors: investor.sectors.slice(0, 4),
    thesisThemes: investor.thesisThemes.slice(0, 3),
    thesisThemeIds: (investor.thesisThemeIds || []).slice(0, 3),
    thesis: investor.thesis,
    chequeSize: investor.chequeSize,
    website: investor.website,
    logo: investor.logo || null
  };
}

/**
 * Derive top stage guides from a list of investors/cards (by stageId frequency).
 */
function deriveRelatedStages(investors, limit = 4) {
  const counts = Object.create(null);
  (investors || []).forEach(inv => {
    (inv.stageIds || []).forEach(id => {
      if (!hasStageGuide(id)) return;
      counts[id] = (counts[id] || 0) + 1;
    });
  });
  return Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
    .slice(0, limit)
    .map(id => ({
      id,
      label: getStageGuideLabel(id),
      count: counts[id]
    }));
}

module.exports = {
  loadInvestorsData,
  getFilters,
  getAllInvestors,
  getInvestorBySlug,
  filterInvestors,
  toCard,
  hasStageGuide,
  getStageGuideLabel,
  deriveRelatedStages,
  STAGE_GUIDE_IDS
};
