const { filterPeople, getFilters, toCard } = require('../../utils/people');
const { requireAuth } = require('../../utils/require-auth');

module.exports = async function handler(req, res) {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const query = req.query || {};
    const { q = '', companyType = '', limit = '100', offset = '0' } = query;

    const all = filterPeople({ q, companyType });
    const start = Math.max(0, parseInt(offset, 10) || 0);
    const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    const page = all.slice(start, start + take).map(toCard);

    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).json({
      total: all.length,
      offset: start,
      limit: take,
      filters: getFilters(),
      people: page
    });
  } catch (error) {
    console.error('people list error:', error);
    res.status(500).json({ error: error.message });
  }
};
