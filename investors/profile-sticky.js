/**
 * Pin section tabs on investor profile pages.
 * CSS sticky breaks inside .hero-showcase { overflow-x: hidden }.
 *
 * Mweb firm profiles: pin full-bleed (edge-to-edge) so horizontal tab scroll works.
 * Desktop pinning stays tied to the content host width.
 */
(function () {
  var host = document.getElementById('inv-profile-sticky-host');
  var nav = document.getElementById('inv-profile-sticky');
  if (!nav || !host) return;

  var mobileMq = window.matchMedia('(max-width: 768px)');

  function isFirmMweb() {
    return (
      mobileMq.matches &&
      document.body.classList.contains('inv-investor-profile')
    );
  }

  function pinSectionNav() {
    var scrollY = window.scrollY || window.pageYOffset;
    var hostRect = host.getBoundingClientRect();
    var hostDocTop = hostRect.top + scrollY;
    var navH = nav.offsetHeight;
    var firmMweb = isFirmMweb();

    if (scrollY >= hostDocTop) {
      if (!nav.classList.contains('is-pinned')) {
        nav.classList.add('is-pinned');
        host.style.minHeight = navH + 'px';
      }
      if (firmMweb) {
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
   * Keep the active tab visible inside the horizontal scroller (mweb firm only).
   */
  function scrollActiveTabIntoView() {
    if (!isFirmMweb()) return;
    var active = nav.querySelector('a.is-active');
    if (!active) return;
    var navRect = nav.getBoundingClientRect();
    var linkRect = active.getBoundingClientRect();
    var delta =
      (linkRect.left + linkRect.right) / 2 - (navRect.left + navRect.right) / 2;
    if (Math.abs(delta) < 8) return;
    nav.scrollBy({ left: delta, behavior: 'smooth' });
  }

  window.VCProfileStickyScrollActive = scrollActiveTabIntoView;

  var scrollTick = false;
  function onScroll() {
    pinSectionNav();
    if (!isFirmMweb()) return;
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(function () {
      scrollTick = false;
      scrollActiveTabIntoView();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
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
