const { INVESTMENT_STAGES } = require('../data/investment-stages');
const { filterInvestors, toCard } = require('./investors');
const { getThemeById } = require('./thesis-themes');

function getAllStages() {
  return INVESTMENT_STAGES
    .map(stage => {
      const investors = filterInvestors({ stage: stage.id });
      return {
        ...stage,
        investorCount: investors.length,
        sampleInvestors: investors.slice(0, 4).map(toCard)
      };
    })
    .sort((a, b) => a.order - b.order);
}

function getStageById(id) {
  return INVESTMENT_STAGES.find(s => s.id === id) || null;
}

function getStagePage(id) {
  const stage = getStageById(id);
  if (!stage) return null;

  const investors = filterInvestors({ stage: stage.id }).map(toCard);
  const relatedStages = INVESTMENT_STAGES
    .filter(s => s.id !== stage.id)
    .sort((a, b) => Math.abs(a.order - stage.order) - Math.abs(b.order - stage.order) || a.order - b.order)
    .slice(0, 3)
    .map(s => ({
      id: s.id,
      label: s.label,
      summary: s.summary,
      order: s.order,
      investorCount: filterInvestors({ stage: s.id }).length
    }));

  const relatedThemes = (stage.relatedThesisIds || [])
    .map(tid => {
      const theme = getThemeById(tid);
      if (!theme) return null;
      return {
        id: theme.id,
        label: theme.label,
        summary: theme.summary
      };
    })
    .filter(Boolean);

  const prev = INVESTMENT_STAGES.find(s => s.order === stage.order - 1) || null;
  const next = INVESTMENT_STAGES.find(s => s.order === stage.order + 1) || null;

  return {
    ...stage,
    investorCount: investors.length,
    investors,
    relatedStages,
    relatedThemes,
    prev: prev ? { id: prev.id, label: prev.label } : null,
    next: next ? { id: next.id, label: next.label } : null
  };
}

module.exports = {
  INVESTMENT_STAGES,
  getAllStages,
  getStageById,
  getStagePage
};
