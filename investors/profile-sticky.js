/**
 * Pin section tabs on investor / person profile pages.
 * CSS sticky breaks inside .hero-showcase { overflow-x: hidden }.
 *
 * Re-queries the host/nav every time so client route changes do not keep
 * a stale node (which pinned the bar over the logo).
 */
(function () {
  var mobileMq = window.matchMedia('(max-width: 768px)');
  var bound = false;

  function els() {
    return {
      host: document.getElementById('inv-profile-sticky-host'),
      nav: document.getElementById('inv-profile-sticky')
    };
  }

  function isProfileMweb() {
    return (
      mobileMq.matches &&
      (document.body.classList.contains('inv-investor-profile') ||
        document.body.classList.contains('inv-person-profile'))
    );
  }

  function unpin(host, nav) {
    if (nav) {
      nav.classList.remove('is-pinned');
      nav.style.left = '';
      nav.style.width = '';
    }
    if (host) host.style.minHeight = '';
  }

  function pinSectionNav() {
    var nodes = els();
    var host = nodes.host;
    var nav = nodes.nav;
    if (!nav || !host) return;

    var scrollY = window.scrollY || window.pageYOffset;
    var hostRect = host.getBoundingClientRect();
    var hostDocTop = hostRect.top + scrollY;
    var navH = nav.offsetHeight || 48;
    var mweb = isProfileMweb();

    // First paint / SPA swap: host sits in the header band until the hero lays out.
    if (hostDocTop < 80) {
      unpin(host, nav);
      return;
    }

    if (scrollY >= hostDocTop - 1) {
      if (!nav.classList.contains('is-pinned')) {
        nav.classList.add('is-pinned');
        host.style.minHeight = navH + 'px';
      } else if (!host.style.minHeight) {
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
      unpin(host, nav);
    }
  }

  function scrollActiveTabIntoView() {
    if (!isProfileMweb()) return;
    var nav = els().nav;
    if (!nav) return;
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

  function bind() {
    if (bound) return;
    bound = true;
    window.addEventListener('scroll', pinSectionNav, { passive: true });
    window.addEventListener('resize', pinSectionNav, { passive: true });
    window.addEventListener('orientationchange', pinSectionNav, { passive: true });
    window.addEventListener('load', function () {
      pinSectionNav();
      scrollActiveTabIntoView();
    });
    if (typeof mobileMq.addEventListener === 'function') {
      mobileMq.addEventListener('change', pinSectionNav);
    } else if (typeof mobileMq.addListener === 'function') {
      mobileMq.addListener(pinSectionNav);
    }
  }

  function boot() {
    bind();
    unpin(els().host, els().nav);
    pinSectionNav();
    scrollActiveTabIntoView();
  }

  window.VCProfileStickyPin = pinSectionNav;
  window.VCProfileStickyScrollActive = scrollActiveTabIntoView;
  window.VCProfileSticky = { boot: boot, pin: pinSectionNav };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
