const { filterInvestors, getFilters, toCard } = require('../../utils/investors');
const { getAllThemes } = require('../../utils/thesis-themes');

module.exports = async function handler(req, res) {
  try {
    const query = req.query || {};

    if (query.view === 'themes') {
      const themes = getAllThemes().map(t => ({
        id: t.id,
        label: t.label,
        summary: t.summary,
        investorCount: t.investorCount
      }));
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
      return res.status(200).json({ total: themes.length, themes });
    }

    const {
      q = '',
      sector = '',
      stage = '',
      type = '',
      thesis = '',
      cheque = '',
      limit = '100',
      offset = '0'
    } = query;

    const all = filterInvestors({ q, sector, stage, type, thesis, cheque });
    const start = Math.max(0, parseInt(offset, 10) || 0);
    const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    const page = all.slice(start, start + take).map(toCard);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    res.status(200).json({
      total: all.length,
      offset: start,
      limit: take,
      filters: getFilters(),
      investors: page
    });
  } catch (error) {
    console.error('investors list error:', error);
    res.status(500).json({ error: error.message });
  }
};
