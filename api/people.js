/**
 * Single serverless function for both People routes (Hobby plan caps
 * functions per deployment, so list + detail are consolidated here,
 * mirroring how api/investors/detail.js multiplexes theme/stage/sector views).
 *
 *   GET /api/people?slug=<slug>              -> public HTML profile page
 *   GET /api/people?slug=<slug>&extras=1     -> public JSON (activity/portfolio HTML)
 *   GET /api/people?slug=<slug>&contact=email -> gated JSON (email unlock)
 *   GET /api/people?q=&role=&companyType=&stage=&sector=&thesis=&cheque= -> gated JSON list
 */
const { filterPeople, getFilters, toCard, getPersonBySlug, getPeopleByCompanySlug } = require('../utils/people');
const { getPersonContact } = require('../utils/people-contacts');
const {
  getUserUnlockMap,
  isPersonEmailUnlocked,
  recordPersonEmailUnlock,
  sortPeopleByUnlocks,
  getUnlockQuota
} = require('../utils/person-email-unlocks');
const { getInvestorBySlug, ensureInvestorDetailExtras } = require('../utils/investors');
const { requireAuth } = require('../utils/require-auth');
const { renderPersonPage, renderPersonExtrasHtml } = require('../utils/render-person-page');
const { isMobileRequest } = require('../utils/profile-page-assets');

module.exports = async function handler(req, res) {
  const query = req.query || {};

  if (query.slug) {
    try {
      const person = getPersonBySlug(query.slug);
      if (!person) {
        if (query.extras === '1' || query.extras === 'true') {
          res.setHeader('Cache-Control', 'public, max-age=60');
          return res.status(404).json({ error: 'Person not found' });
        }
        return res.status(404).send('<h1>404 - Person Not Found</h1>');
      }

      // Authenticated email unlock (never cached publicly)
      if (query.contact === 'email') {
        const user = await requireAuth(req, res);
        if (!user) return;

        if (!person.hasEmail) {
          res.setHeader('Cache-Control', 'private, no-store');
          return res.status(404).json({ error: 'No email on file' });
        }

        const method = String(req.method || 'GET').toUpperCase();

        if (method === 'POST') {
          const alreadyUnlocked = await isPersonEmailUnlocked(user.id, query.slug);
          if (!alreadyUnlocked) {
            const quota = await getUnlockQuota(user);
            if (!quota.allowed) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.setHeader('Cache-Control', 'private, no-store');
              return res.status(429).json({
                error: 'Daily unlock limit reached',
                code: 'daily_unlock_limit',
                limit: quota.limit,
                remaining: 0
              });
            }
            await recordPersonEmailUnlock(user.id, query.slug);
          }

          const contact = getPersonContact(query.slug);
          if (!contact) {
            res.setHeader('Cache-Control', 'private, no-store');
            return res.status(404).json({ error: 'No email on file' });
          }
          const quota = await getUnlockQuota(user);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'private, no-store');
          return res.status(200).json({
            unlocked: true,
            ...contact,
            quota: {
              limit: quota.limit,
              remaining: quota.unlimited ? null : quota.remaining,
              unlimited: quota.unlimited
            }
          });
        }

        if (method === 'GET') {
          const unlocked = await isPersonEmailUnlocked(user.id, query.slug);
          if (!unlocked) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'private, no-store');
            return res.status(200).json({ unlocked: false });
          }
          const contact = getPersonContact(query.slug);
          if (!contact) {
            res.setHeader('Cache-Control', 'private, no-store');
            return res.status(404).json({ error: 'No email on file' });
          }
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'private, no-store');
          return res.status(200).json({ unlocked: true, ...contact });
        }

        res.setHeader('Cache-Control', 'private, no-store');
        return res.status(405).json({ error: 'Method not allowed' });
      }

      // Public JSON for mweb client hydrate
      if (query.extras === '1' || query.extras === 'true') {
        if (person.companySlug) {
          await ensureInvestorDetailExtras(person.companySlug);
        }
        const investor = person.companySlug ? getInvestorBySlug(person.companySlug) : null;
        const payload = renderPersonExtrasHtml(person, investor);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
        res.setHeader('CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
        return res.status(200).json(payload);
      }

      // Always SSR firm activity/portfolio in first HTML (mweb + desktop)
      if (person.companySlug) {
        await ensureInvestorDetailExtras(person.companySlug);
      }

      const colleagues = getPeopleByCompanySlug(person.companySlug, person.slug).map(toCard);
      const investor = person.companySlug ? getInvestorBySlug(person.companySlug) : null;
      return renderPersonPage(person, colleagues, investor, res, {
        mwebFirstPaint: isMobileRequest(req)
      });
    } catch (error) {
      console.error('person detail error:', error);
      return res.status(500).send('<h1>500 - Internal Server Error</h1>');
    }
  }

  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const {
      q = '',
      companyType = '',
      role = '',
      stage = '',
      sector = '',
      thesis = '',
      cheque = '',
      limit = '100',
      offset = '0'
    } = query;
    const all = filterPeople({ q, companyType, role, stage, sector, thesis, cheque });
    const unlockMap = await getUserUnlockMap(user.id);
    const sorted = sortPeopleByUnlocks(all, unlockMap);
    const start = Math.max(0, parseInt(offset, 10) || 0);
    const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    const page = sorted.slice(start, start + take).map((person) => {
      if (!unlockMap.has(person.slug)) return toCard(person);
      const contact = getPersonContact(person.slug);
      return toCard(person, contact ? { email: contact.email } : {});
    });

    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).json({
      total: sorted.length,
      offset: start,
      limit: take,
      unlockedCount: unlockMap.size,
      filters: getFilters(),
      people: page
    });
  } catch (error) {
    console.error('people list error:', error);
    res.status(500).json({ error: error.message });
  }
};
