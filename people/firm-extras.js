/**
 * After person HTML paints, load firm activity/portfolio without blocking TTFB.
 */
(function () {
  var mount = document.getElementById('person-firm-dynamic');
  if (!mount) return;
  var firmSlug = mount.getAttribute('data-firm-slug');
  if (!firmSlug) return;

  var url = '/api/people?view=firmExtras&slug=' + encodeURIComponent(firmSlug);

  function reveal(root) {
    if (!root) return;
    var nodes = root.querySelectorAll('.inv-profile-reveal:not(.is-visible)');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('is-visible');
  }

  function hydrateLogos() {
    if (typeof window.VCHydratePortfolioLogos === 'function') {
      window.VCHydratePortfolioLogos(mount);
    }
  }

  fetch(url, { credentials: 'same-origin' })
    .then(function (res) {
      if (!res.ok) throw new Error('firm extras ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var html = String((data && data.html) || '').trim();
      if (!html) return;
      mount.innerHTML = html;
      mount.hidden = false;
      reveal(mount);
      hydrateLogos();
    })
    .catch(function (err) {
      console.error(err);
    });
})();
