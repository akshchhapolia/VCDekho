const { SECTOR_GUIDES } = require('../data/sectors');
const { filterInvestors, toCard } = require('./investors');

function getAllSectorGuides() {
  return SECTOR_GUIDES.map((sector) => {
    const investors = filterInvestors({ sector: sector.id });
    return {
      ...sector,
      investorCount: investors.length,
      sampleInvestors: investors.slice(0, 4).map(toCard)
    };
  }).sort((a, b) => b.investorCount - a.investorCount);
}

function getSectorGuideById(id) {
  return SECTOR_GUIDES.find((s) => s.id === id) || null;
}

function getSectorPage(id) {
  const sector = getSectorGuideById(id);
  if (!sector) return null;
  const investors = filterInvestors({ sector: sector.id }).map(toCard);
  return {
    ...sector,
    investorCount: investors.length,
    investors
  };
}

function hasSectorGuide(id) {
  return Boolean(id && SECTOR_GUIDES.some((s) => s.id === id));
}

module.exports = {
  getAllSectorGuides,
  getSectorGuideById,
  getSectorPage,
  hasSectorGuide,
  SECTOR_GUIDES
};
