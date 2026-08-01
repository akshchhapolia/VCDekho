(function () {
  function initNav() {
    var menuToggle = document.getElementById('menu-toggle');
    var mainNav = document.getElementById('navigation-bar');
    if (!menuToggle || !mainNav) return;

    var header = menuToggle.closest('.site-header') || menuToggle.parentNode;
    var appContainer = document.querySelector('.app-container');
    var mobileHost = appContainer || document.body;
    var mobileMq = window.matchMedia('(max-width: 768px)');

    // Keep drawer + dimmer in the same stacking context as the page chrome.
    // A body-level backdrop paints above .app-container (z-index: 2) and
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

    function setOpen(open) {
      menuToggle.classList.toggle('active', open);
      mainNav.classList.toggle('active', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      backdrop.hidden = !open;
      backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.classList.toggle('nav-open', open);
    }

    function placeForViewport() {
      if (mobileMq.matches) {
        mobileHost.appendChild(backdrop);
        mobileHost.appendChild(mainNav);
      } else {
        setOpen(false);
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        if (header && mainNav.parentNode !== header) {
          header.appendChild(mainNav);
        }
      }
    }

    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-controls', 'navigation-bar');
    placeForViewport();

    if (typeof mobileMq.addEventListener === 'function') {
      mobileMq.addEventListener('change', placeForViewport);
    } else if (typeof mobileMq.addListener === 'function') {
      mobileMq.addListener(placeForViewport);
    }

    menuToggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!mobileMq.matches) return;
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
        if (!mobileMq.matches) return; // desktop: allow normal navigation
        // Force navigation on mobile so overlays cannot swallow the gesture.
        e.preventDefault();
        setOpen(false);
        // Free the 2.5MB hero download so login/next page can use the radio.
        if (window.VCHero && typeof window.VCHero.release === 'function') {
          window.VCHero.release();
        }
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
