/**
 * Hydrate portfolio logos (data-src → src) when near the viewport.
 * Used on firm + person profile pages.
 */
(function () {
  var ATTR = 'data-src';
  var SELECTOR = 'img.inv-profile-portfolio-logo[' + ATTR + ']';

  function hydrate(img) {
    var src = img.getAttribute(ATTR);
    if (!src) return;
    img.setAttribute('src', src);
    img.removeAttribute(ATTR);
  }

  function watch(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var imgs = scope.querySelectorAll(SELECTOR);
    if (!imgs.length) return;

    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < imgs.length; i++) hydrate(imgs[i]);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          hydrate(entry.target);
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '180px 0px', threshold: 0.01 }
    );

    for (var j = 0; j < imgs.length; j++) io.observe(imgs[j]);
  }

  window.VCHydratePortfolioLogos = watch;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      watch(document);
    });
  } else {
    watch(document);
  }
})();
