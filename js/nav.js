(function () {
  function initNav() {
    var menuToggle = document.getElementById('menu-toggle');
    var mainNav = document.getElementById('navigation-bar');
    if (!menuToggle || !mainNav) return;

    var header = menuToggle.closest('.site-header') || menuToggle.parentNode;
    var mobileMq = window.matchMedia('(max-width: 768px)');
    var togglePlaceholder = null;

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

    function makePlaceholder() {
      var el = document.createElement('span');
      el.className = 'nav-toggle-spacer';
      el.setAttribute('aria-hidden', 'true');
      return el;
    }

    function restoreToggleToHeader() {
      if (!header) return;
      if (togglePlaceholder && togglePlaceholder.parentNode) {
        togglePlaceholder.parentNode.replaceChild(menuToggle, togglePlaceholder);
        togglePlaceholder = null;
      } else if (menuToggle.parentNode !== header) {
        header.appendChild(menuToggle);
      }
      // Never leave a stray spacer beside the toggle (that shifts it left).
      header.querySelectorAll('.nav-toggle-spacer').forEach(function (node) {
        if (node.parentNode) node.parentNode.removeChild(node);
      });
    }

    function setOpen(open) {
      menuToggle.classList.toggle('active', open);
      mainNav.classList.toggle('active', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      backdrop.hidden = !open;
      backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.classList.toggle('nav-open', open);

      if (!mobileMq.matches) return;

      if (open) {
        // Swap toggle for a same-size spacer so the header layout doesn't jump,
        // then portal drawer + toggle to <body> above stacking contexts.
        if (menuToggle.parentNode === header) {
          togglePlaceholder = makePlaceholder();
          header.replaceChild(togglePlaceholder, menuToggle);
        } else if (!togglePlaceholder) {
          togglePlaceholder = makePlaceholder();
          header.appendChild(togglePlaceholder);
        }
        document.body.appendChild(backdrop);
        document.body.appendChild(mainNav);
        document.body.appendChild(menuToggle);
      } else {
        restoreToggleToHeader();
      }
    }

    function placeForViewport() {
      if (mobileMq.matches) {
        document.body.appendChild(backdrop);
        document.body.appendChild(mainNav);
        if (!menuToggle.classList.contains('active')) {
          restoreToggleToHeader();
        }
      } else {
        setOpen(false);
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        if (header && mainNav.parentNode !== header) header.appendChild(mainNav);
        restoreToggleToHeader();
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
        if (window.VCAnalytics) {
          window.VCAnalytics.track('nav_click', {
            href: href || '',
            label: (link.textContent || '').trim().slice(0, 40)
          });
        }
        if (!href || href === '#') {
          setOpen(false);
          return;
        }
        if (!mobileMq.matches) return;
        e.preventDefault();
        setOpen(false);
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
