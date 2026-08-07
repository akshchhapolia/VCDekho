/** Client-side URL paths — keep in sync with utils/site-labels.js */
(function (global) {
  global.VCSitePaths = {
    funds: '/funds',
    investors: '/investors',
    fundsStages: '/funds/stages',
    fundsThemes: '/funds/themes',
    fundsSectors: '/funds/sectors',
    fund: function (slug) {
      return '/funds/' + encodeURIComponent(slug);
    },
    person: function (slug) {
      return '/investors/' + encodeURIComponent(slug);
    },
    fundStage: function (slug) {
      return '/funds/stages/' + encodeURIComponent(slug);
    },
    fundTheme: function (slug) {
      return '/funds/themes/' + encodeURIComponent(slug);
    },
    fundSector: function (slug) {
      return '/funds/sectors/' + encodeURIComponent(slug);
    }
  };
})(window);
