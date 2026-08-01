/**
 * Pin section tabs on investor profile pages.
 * CSS sticky breaks inside .hero-showcase { overflow-x: hidden }.
 *
 * Mweb: pin full-bleed + keep the active tab in view without centering
 * (centering was pushing Snapshot to the right and hiding other tabs).
 */
(function () {
  var host = document.getElementById('inv-profile-sticky-host');
  var nav = document.getElementById('inv-profile-sticky');
  if (!nav || !host) return;

  var mobileMq = window.matchMedia('(max-width: 768px)');

  function isProfileMweb() {
    return (
      mobileMq.matches &&
      (document.body.classList.contains('inv-investor-profile') ||
        document.body.classList.contains('inv-person-profile'))
    );
  }

  function pinSectionNav() {
    var scrollY = window.scrollY || window.pageYOffset;
    var hostRect = host.getBoundingClientRect();
    var hostDocTop = hostRect.top + scrollY;
    var navH = nav.offsetHeight;
    var mweb = isProfileMweb();

    if (scrollY >= hostDocTop) {
      if (!nav.classList.contains('is-pinned')) {
        nav.classList.add('is-pinned');
        host.style.minHeight = navH + 'px';
      }
      if (mweb) {
        nav.style.left = '0';
        nav.style.width = '100%';
      } else {
        nav.style.left = hostRect.left + 'px';
        nav.style.width = hostRect.width + 'px';
      }
    } else {
      nav.classList.remove('is-pinned');
      host.style.minHeight = '';
      nav.style.left = '';
      nav.style.width = '';
    }
  }

  /**
   * Scroll active tab into view only if clipped — align to nearest edge, never center.
   */
  function scrollActiveTabIntoView() {
    if (!isProfileMweb()) return;
    var active = nav.querySelector('a.is-active');
    if (!active) return;

    var pad = 12;
    var navRect = nav.getBoundingClientRect();
    var linkRect = active.getBoundingClientRect();

    if (linkRect.left < navRect.left + pad) {
      nav.scrollBy({ left: linkRect.left - navRect.left - pad, behavior: 'auto' });
      return;
    }
    if (linkRect.right > navRect.right - pad) {
      nav.scrollBy({ left: linkRect.right - navRect.right + pad, behavior: 'auto' });
    }
  }

  window.VCProfileStickyScrollActive = scrollActiveTabIntoView;

  window.addEventListener('scroll', pinSectionNav, { passive: true });
  window.addEventListener('resize', pinSectionNav, { passive: true });
  window.addEventListener('load', function () {
    pinSectionNav();
    scrollActiveTabIntoView();
  });
  if (typeof mobileMq.addEventListener === 'function') {
    mobileMq.addEventListener('change', pinSectionNav);
  } else if (typeof mobileMq.addListener === 'function') {
    mobileMq.addListener(pinSectionNav);
  }
  pinSectionNav();
})();
