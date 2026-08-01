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

    function ensureTogglePlaceholder() {
      if (togglePlaceholder || !header) return;
      togglePlaceholder = document.createElement('span');
      togglePlaceholder.className = 'nav-toggle-spacer';
      togglePlaceholder.setAttribute('aria-hidden', 'true');
      header.appendChild(togglePlaceholder);
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
        // Escape page stacking contexts so dark drawer + X always paint on top.
        ensureTogglePlaceholder();
        document.body.appendChild(backdrop);
        document.body.appendChild(mainNav);
        document.body.appendChild(menuToggle);
      } else if (header) {
        if (togglePlaceholder && togglePlaceholder.parentNode === header) {
          header.insertBefore(menuToggle, togglePlaceholder);
        } else {
          header.appendChild(menuToggle);
        }
      }
    }

    function placeForViewport() {
      if (mobileMq.matches) {
        document.body.appendChild(backdrop);
        document.body.appendChild(mainNav);
        if (header && menuToggle.parentNode !== header && !menuToggle.classList.contains('active')) {
          if (togglePlaceholder && togglePlaceholder.parentNode === header) {
            header.insertBefore(menuToggle, togglePlaceholder);
          } else {
            header.appendChild(menuToggle);
          }
        }
      } else {
        setOpen(false);
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        if (header && mainNav.parentNode !== header) header.appendChild(mainNav);
        if (header && menuToggle.parentNode !== header) header.appendChild(menuToggle);
        if (togglePlaceholder && togglePlaceholder.parentNode) {
          togglePlaceholder.parentNode.removeChild(togglePlaceholder);
          togglePlaceholder = null;
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
