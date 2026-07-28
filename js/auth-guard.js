(function () {
  document.documentElement.classList.add('auth-pending');
  function reveal() {
    document.documentElement.classList.remove('auth-pending');
  }

  function isProductionHost() {
    var h = (location.hostname || '').toLowerCase();
    return h === 'vcdekho.com' || h === 'www.vcdekho.com';
  }

  // Preview / preprod: open the page without forcing login (avoids bouncing to production).
  if (!isProductionHost()) {
    reveal();
    if (window.VCAuth) window.VCAuth.wireLogout('#logout-link');
    return;
  }

  if (!window.VCAuth) {
    window.location.replace('/login?next=' + encodeURIComponent(location.pathname + location.search));
    return;
  }

  window.VCAuth.requireSession()
    .then(function (session) {
      if (!session) return;
      reveal();
      window.VCAuth.wireLogout('#logout-link');
    })
    .catch(function () {
      window.location.replace('/login?next=' + encodeURIComponent(location.pathname + location.search));
    });
})();
