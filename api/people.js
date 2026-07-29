/**
 * Single serverless function for both People routes (Hobby plan caps
 * functions per deployment, so list + detail are consolidated here,
 * mirroring how api/investors/detail.js multiplexes theme/stage/sector views).
 *
 *   GET /api/people?slug=<slug>              -> public HTML profile page
 *   GET /api/people?q=&companyType=&...      -> gated JSON list (used by /people)
 */
const { filterPeople, getFilters, toCard, getPersonBySlug, getPeopleByCompanySlug } = require('../utils/people');
const { requireAuth } = require('../utils/require-auth');
const { renderPersonPage } = require('../utils/render-person-page');

module.exports = async function handler(req, res) {
  const query = req.query || {};

  if (query.slug) {
    try {
      const person = getPersonBySlug(query.slug);
      if (!person) return res.status(404).send('<h1>404 - Person Not Found</h1>');

      const colleagues = getPeopleByCompanySlug(person.companySlug, person.slug).map(toCard);
      return renderPersonPage(person, colleagues, res);
    } catch (error) {
      console.error('person detail error:', error);
      return res.status(500).send('<h1>500 - Internal Server Error</h1>');
    }
  }

  try {
    const user = await requireAuth(req, res);
    if (!user) return;

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
