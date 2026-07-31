/**
 * Pin site header + section tabs on investor profile pages.
 * CSS sticky breaks inside .hero-showcase { overflow-x: hidden }.
 */
(function () {
  var header = document.querySelector('body.inv-investor-profile .site-header');
  var host = document.getElementById('inv-profile-sticky-host');
  var nav = document.getElementById('inv-profile-sticky');
  if (!nav || !host) return;

  function headerHeight() {
    return header ? header.getBoundingClientRect().height : 0;
  }

  function pinSectionNav() {
    var top = headerHeight();
    var scrollY = window.scrollY || window.pageYOffset;
    var hostRect = host.getBoundingClientRect();
    var hostDocTop = hostRect.top + scrollY;
    var navH = nav.offsetHeight;

    if (scrollY + top >= hostDocTop) {
      if (!nav.classList.contains('is-pinned')) {
        nav.classList.add('is-pinned');
        host.style.minHeight = navH + 'px';
      }
      nav.style.top = top + 'px';
      nav.style.left = hostRect.left + 'px';
      nav.style.width = hostRect.width + 'px';
    } else {
      nav.classList.remove('is-pinned');
      host.style.minHeight = '';
      nav.style.top = '';
      nav.style.left = '';
      nav.style.width = '';
    }
  }

  window.addEventListener('scroll', pinSectionNav, { passive: true });
  window.addEventListener('resize', pinSectionNav, { passive: true });
  window.addEventListener('load', pinSectionNav);
  pinSectionNav();
})();
