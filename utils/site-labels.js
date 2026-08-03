/**
 * Public directory naming (UI labels vs URL paths).
 * Funds at /funds; individual investors at /investors.
 */
const FUNDS_PATH = '/funds';
const INVESTORS_PATH = '/investors';
const FUNDS_STAGES_PATH = '/funds/stages';
const FUNDS_THEMES_PATH = '/funds/themes';
const FUNDS_SECTORS_PATH = '/funds/sectors';

function fundHref(slug) {
  return `${FUNDS_PATH}/${encodeURIComponent(slug)}`;
}

function personHref(slug) {
  return `${INVESTORS_PATH}/${encodeURIComponent(slug)}`;
}

function fundStageHref(slug) {
  return `${FUNDS_STAGES_PATH}/${encodeURIComponent(slug)}`;
}

function fundThemeHref(slug) {
  return `${FUNDS_THEMES_PATH}/${encodeURIComponent(slug)}`;
}

function fundSectorHref(slug) {
  return `${FUNDS_SECTORS_PATH}/${encodeURIComponent(slug)}`;
}

module.exports = {
  FUNDS_PATH,
  INVESTORS_PATH,
  FUNDS_STAGES_PATH,
  FUNDS_THEMES_PATH,
  FUNDS_SECTORS_PATH,
  FUNDS_LABEL: 'Funds',
  INVESTORS_LABEL: 'Investors',
  FUNDS_LIST_TITLE: 'Funds',
  INVESTORS_LIST_TITLE: 'Investors',
  FUNDS_LIST_DESC: 'VCs, family offices, angels and syndicates in India.',
  INVESTORS_LIST_DESC: 'Partners, principals and angels mapped to Indian funds.',
  fundHref,
  personHref,
  fundStageHref,
  fundThemeHref,
  fundSectorHref
};
