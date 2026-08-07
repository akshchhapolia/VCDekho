const {
  FUNDS_PATH,
  INVESTORS_PATH,
  FUNDS_LABEL,
  INVESTORS_LABEL
} = require('./site-labels');

/**
 * @param {'funds'|'investors'|''} [active]
 * @param {{ trailing?: string|string[] }} [opts]
 * @returns {string[]}
 */
function renderSiteNavLinks(active, opts = {}) {
  const trailing = opts.trailing
    ? Array.isArray(opts.trailing)
      ? opts.trailing
      : [opts.trailing]
    : [];

  const includeAuth = opts.includeAuth !== false;

  return [
    '<a href="/" class="nav-link">Home</a>',
    '<a href="' +
      INVESTORS_PATH +
      '" class="nav-link' +
      (active === 'investors' ? ' active' : '') +
      '">' +
      INVESTORS_LABEL +
      '</a>',
    '<a href="' +
      FUNDS_PATH +
      '" class="nav-link' +
      (active === 'funds' ? ' active' : '') +
      '">' +
      FUNDS_LABEL +
      '</a>',
    '<a href="/buzz" class="nav-link' + (active === 'buzz' ? ' active' : '') + '">Founder Buzz</a>',
    '<a href="/blog" class="nav-link">Blog</a>',
    '<a href="/news" class="nav-link">News</a>',
    ...(includeAuth
      ? ['<a href="/login" class="nav-link" id="nav-auth-link">Log in</a>']
      : []),
    ...trailing
  ];
}

module.exports = { renderSiteNavLinks };
