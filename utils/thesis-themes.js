const { THESIS_THEMES } = require('../data/thesis-themes');
const { filterInvestors, toCard } = require('./investors');

function getAllThemes() {
  return THESIS_THEMES.map(theme => {
    const investors = filterInvestors({ thesis: theme.id });
    return {
      ...theme,
      investorCount: investors.length,
      sampleInvestors: investors.slice(0, 4).map(toCard)
    };
  }).sort((a, b) => b.investorCount - a.investorCount);
}

function getThemeById(id) {
  return THESIS_THEMES.find(t => t.id === id) || null;
}

function getThemePage(id) {
  const theme = getThemeById(id);
  if (!theme) return null;
  const investors = filterInvestors({ thesis: theme.id }).map(toCard);
  return {
    ...theme,
    investorCount: investors.length,
    investors
  };
}

module.exports = {
  getAllThemes,
  getThemeById,
  getThemePage,
  THESIS_THEMES
};
