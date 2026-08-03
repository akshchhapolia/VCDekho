(function () {
  function setLoggedOut(link) {
    link.textContent = 'Log in';
    link.href =
      '/login?next=' + encodeURIComponent(window.location.pathname + window.location.search);
    link.removeAttribute('id');
    link.id = 'nav-auth-link';
  }

  function wireNavAuth() {
    var link = document.getElementById('nav-auth-link') || document.getElementById('logout-link');
    if (!link) return;

    if (!window.VCAuth) {
      setLoggedOut(link);
      return;
    }

    window.VCAuth.getSession()
      .then(function (session) {
        if (session) {
          link.textContent = 'Log out';
          link.href = '#';
          link.id = 'logout-link';
          window.VCAuth.wireLogout('#logout-link');
          if (window.VCAuth.pingSessionMeta) {
            window.VCAuth.pingSessionMeta();
          }
        } else {
          setLoggedOut(link);
        }
      })
      .catch(function () {
        setLoggedOut(link);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireNavAuth);
  } else {
    wireNavAuth();
  }
})();
