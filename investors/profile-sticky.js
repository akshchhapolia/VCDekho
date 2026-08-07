/**
 * Pin section tabs on investor / person profile pages.
 * CSS sticky breaks inside .hero-showcase { overflow-x: hidden }.
 *
 * Mweb: pin styles also live in critical CSS so the bar sticks before
 * async directory.css / late widgets finish loading.
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
    var navH = nav.offsetHeight || 48;
    var mweb = isProfileMweb();

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

  window.VCProfileStickyPin = pinSectionNav;
  window.VCProfileStickyScrollActive = scrollActiveTabIntoView;

  window.addEventListener('scroll', pinSectionNav, { passive: true });
  window.addEventListener('resize', pinSectionNav, { passive: true });
  window.addEventListener('orientationchange', pinSectionNav, { passive: true });
  window.addEventListener('load', function () {
    pinSectionNav();
    scrollActiveTabIntoView();
  });

  // Re-pin when async CSS arrives or late widgets change page height (mweb)
  if (isProfileMweb()) {
    if (typeof ResizeObserver === 'function') {
      try {
        var ro = new ResizeObserver(function () {
          pinSectionNav();
        });
        ro.observe(document.documentElement);
        if (document.body) ro.observe(document.body);
      } catch (e) { /* ignore */ }
    }

    Array.prototype.forEach.call(
      document.querySelectorAll('link[rel="stylesheet"]'),
      function (link) {
        link.addEventListener('load', pinSectionNav);
      }
    );

    // Stylesheets appended after this script (async critical-CSS loader)
    if (typeof MutationObserver === 'function') {
      var mo = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var nodes = mutations[i].addedNodes;
          for (var j = 0; j < nodes.length; j++) {
            var n = nodes[j];
            if (n && n.tagName === 'LINK' && n.rel === 'stylesheet') {
              n.addEventListener('load', pinSectionNav);
              pinSectionNav();
            }
            if (n && n.nodeType === 1 && (n.id === 'activity' || n.id === 'portfolio' || n.id === 'firm-activity' || n.id === 'firm-portfolio' || (n.querySelector && n.querySelector('#activity, #portfolio, #firm-activity, #firm-portfolio')))) {
              pinSectionNav();
            }
          }
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(function () {
        try { mo.disconnect(); } catch (e2) { /* ignore */ }
      }, 15000);
    }
  }

  if (typeof mobileMq.addEventListener === 'function') {
    mobileMq.addEventListener('change', pinSectionNav);
  } else if (typeof mobileMq.addListener === 'function') {
    mobileMq.addListener(pinSectionNav);
  }

  pinSectionNav();
})();
