/**
 * Single serverless function for both People routes (Hobby plan caps
 * functions per deployment, so list + detail are consolidated here,
 * mirroring how api/investors/detail.js multiplexes theme/stage/sector views).
 *
 *   GET /api/people?slug=<slug>                         -> public HTML profile page
 *   GET /api/people?view=firmExtras&slug=<companySlug>  -> public JSON (activity/portfolio HTML)
 *   GET /api/people?q=&companyType=&...                 -> gated JSON list (used by /people)
 */
const { filterPeople, getFilters, toCard, getPersonBySlug, getPeopleByCompanySlug } = require('../utils/people');
const { getInvestorBySlug, ensureInvestorDetailExtras } = require('../utils/investors');
const { requireAuth } = require('../utils/require-auth');
const { renderPersonPage } = require('../utils/render-person-page');
const {
  firmActivitySection,
  firmPortfolioSection
} = require('../utils/render-person-firm-sections');

module.exports = async function handler(req, res) {
  const query = req.query || {};

  // Public firm extras for person pages — loaded after first paint
  if (query.view === 'firmExtras' && query.slug) {
    try {
      await ensureInvestorDetailExtras(query.slug);
      const investor = getInvestorBySlug(query.slug);
      if (!investor) {
        res.setHeader('Cache-Control', 'public, max-age=60');
        return res.status(404).json({ error: 'Firm not found' });
      }
      const person = {
        company: investor.name,
        companySlug: investor.slug
      };
      const html =
        firmActivitySection(person, investor) + firmPortfolioSection(person, investor, 9);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
      res.setHeader('CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      return res.status(200).json({ html: html || '' });
    } catch (error) {
      console.error('firmExtras error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (query.slug) {
    try {
      const person = getPersonBySlug(query.slug);
      if (!person) return res.status(404).send('<h1>404 - Person Not Found</h1>');

      // Do not await DB here — HTML paints first; firm-extras.js hydrates portfolio/activity
      const colleagues = getPeopleByCompanySlug(person.companySlug, person.slug).map(toCard);
      const investor = person.companySlug ? getInvestorBySlug(person.companySlug) : null;
      return renderPersonPage(person, colleagues, investor, res);
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
