(function () {
  function initNav() {
    var menuToggle = document.getElementById('menu-toggle');
    var mainNav = document.getElementById('navigation-bar');
    if (!menuToggle || !mainNav) return;

    var appContainer = document.querySelector('.app-container');
    var host = appContainer || document.body;

    // Keep drawer + dimmer in the same stacking context as the header.
    // A body-level backdrop sits above .app-container (z-index: 2) and
    // intercepts every tap, so links only appear to "close the menu".
    var backdrop = document.getElementById('nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('button');
      backdrop.type = 'button';
      backdrop.id = 'nav-backdrop';
      backdrop.className = 'nav-backdrop';
      backdrop.hidden = true;
      backdrop.setAttribute('aria-label', 'Close menu');
      backdrop.setAttribute('aria-hidden', 'true');
    }
    host.appendChild(backdrop);
    host.appendChild(mainNav);

    function setOpen(open) {
      menuToggle.classList.toggle('active', open);
      mainNav.classList.toggle('active', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      backdrop.hidden = !open;
      backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.classList.toggle('nav-open', open);
    }

    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-controls', 'navigation-bar');

    menuToggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!mainNav.classList.contains('active'));
    });

    backdrop.addEventListener('click', function (e) {
      e.preventDefault();
      setOpen(false);
    });

    mainNav.querySelectorAll('a.nav-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (!href || href === '#') {
          setOpen(false);
          return;
        }
        // Force navigation — don't rely on default if an overlay steals the gesture.
        e.preventDefault();
        setOpen(false);
        window.location.assign(href);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });

    window.VCNav = { close: function () { setOpen(false); } };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
