const { filterInvestors, getFilters, toCard } = require('../../utils/investors');

module.exports = async function handler(req, res) {
  try {
    const {
      q = '',
      sector = '',
      stage = '',
      type = '',
      thesis = '',
      cheque = '',
      limit = '100',
      offset = '0'
    } = req.query || {};

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
