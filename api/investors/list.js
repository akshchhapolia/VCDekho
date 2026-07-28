const { filterInvestors, getFilters, toCard } = require('../../utils/investors');
const { getAllThemes } = require('../../utils/thesis-themes');
const { getAllStages } = require('../../utils/investment-stages');
const { getAllSectorGuides } = require('../../utils/sectors');
const { requireAuth } = require('../../utils/require-auth');
const { getThesisThemeIconSvg } = require('../../utils/thesis-theme-icons');
const { getSectorIconSvg } = require('../../utils/sector-icons');

module.exports = async function handler(req, res) {
  try {
    const query = req.query || {};
    const isPublicView =
      query.view === 'themes' || query.view === 'stages' || query.view === 'sectors';

    if (!isPublicView) {
      const user = await requireAuth(req, res);
      if (!user) return;
    }

    if (query.view === 'themes') {
      const themes = getAllThemes().map(t => ({
        id: t.id,
        label: t.label,
        summary: t.summary,
        investorCount: t.investorCount,
        iconSvg: getThesisThemeIconSvg(t.id, 'theme-index-icon')
      }));
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
      return res.status(200).json({ total: themes.length, themes });
    }

    if (query.view === 'stages') {
      const stages = getAllStages().map(s => ({
        id: s.id,
        label: s.label,
        summary: s.summary,
        order: s.order,
        investorCount: s.investorCount,
        snapshot: s.snapshot
      }));
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
      return res.status(200).json({ total: stages.length, stages });
    }

    if (query.view === 'sectors') {
      const sectors = getAllSectorGuides().map(s => ({
        id: s.id,
        label: s.label,
        summary: s.summary,
        order: s.order,
        investorCount: s.investorCount,
        snapshot: s.snapshot || null,
        iconSvg: getSectorIconSvg(s.id, 'theme-index-icon')
      }));
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
      return res.status(200).json({ total: sectors.length, sectors });
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

    res.setHeader('Cache-Control', 'private, no-store');
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
