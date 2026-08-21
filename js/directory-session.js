(function (global) {
  function setLoggedOut(link) {
    link.textContent = 'Log in';
    link.href =
      '/login?next=' + encodeURIComponent(window.location.pathname + window.location.search);
    link.removeAttribute('id');
    link.id = 'nav-auth-link';
  }

  function findAuthLink() {
    return (
      document.getElementById('nav-auth-link') ||
      document.getElementById('logout-link') ||
      document.querySelector('#navigation-bar a.nav-link[href^="/login"]')
    );
  }

  function wireNavAuth() {
    var link = findAuthLink();
    if (!link) return;

    if (!window.VCAuth) {
      setLoggedOut(link);
      return;
    }

    // getSession() pulls the Supabase SDK from a third-party CDN. That is a
    // wasted connection plus ~30KB on every public page view by a signed-out
    // visitor, purely to decide the wording of this one link.
    if (window.VCAuth.hasStoredSession && !window.VCAuth.hasStoredSession()) {
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

  global.VCDirectorySession = { wireNavAuth: wireNavAuth };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireNavAuth);
  } else {
    wireNavAuth();
  }
})(typeof window !== 'undefined' ? window : this);
