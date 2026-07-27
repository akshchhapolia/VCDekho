(function () {
  document.documentElement.classList.add('auth-pending');
  function reveal() {
    document.documentElement.classList.remove('auth-pending');
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
