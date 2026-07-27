const { getAllThemes } = require('../../utils/thesis-themes');

module.exports = async function handler(req, res) {
  try {
    const themes = getAllThemes().map(t => ({
      id: t.id,
      label: t.label,
      summary: t.summary,
      investorCount: t.investorCount
    }));
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    res.status(200).json({ total: themes.length, themes });
  } catch (error) {
    console.error('themes list error:', error);
    res.status(500).json({ error: error.message });
  }
};
