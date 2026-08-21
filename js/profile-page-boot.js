(function (global) {
  var listenersBound = false;
  var revealObserver = null;

  function isProfilePage() {
    return Boolean(
      document.querySelector('.inv-profile-wrap') || document.getElementById('inv-profile-sticky')
    );
  }

  function revealProfileContent() {
    document.body.classList.add('inv-profile-ready');
    var reveals = document.querySelectorAll('.inv-profile-reveal:not(.is-visible)');
    if (!reveals.length) return;
    if ('IntersectionObserver' in global) {
      if (!revealObserver) {
        revealObserver = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (e) {
              if (e.isIntersecting) {
                e.target.classList.add('is-visible');
                revealObserver.unobserve(e.target);
              }
            });
          },
          { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
        );
      }
      reveals.forEach(function (el) {
        revealObserver.observe(el);
      });
    } else {
      reveals.forEach(function (el) {
        el.classList.add('is-visible');
      });
    }
  }

  function bootProfilePage() {
    if (!isProfilePage()) return;

    document.body.classList.add('inv-profile-ready');
    revealProfileContent();

    var nav = document.getElementById('inv-profile-sticky');
    if (!nav) return;

    if (listenersBound) {
      if (typeof global.VCProfileStickyPin === 'function') global.VCProfileStickyPin();
      return;
    }
    listenersBound = true;

    var lastActive = '';

    function setActive(id) {
      if (!id) return;
      var links = Array.prototype.slice.call(nav.querySelectorAll('a[data-section]'));
      links.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('data-section') === id);
      });
      if (id !== lastActive) {
        lastActive = id;
        if (typeof global.VCProfileStickyScrollActive === 'function') {
          global.VCProfileStickyScrollActive();
        }
      }
    }

    function syncActiveFromScroll() {
      var links = Array.prototype.slice.call(nav.querySelectorAll('a[data-section]'));
      var sections = links
        .map(function (a) {
          return document.getElementById(a.getAttribute('data-section'));
        })
        .filter(Boolean);
      if (!sections.length) return;
      var offset = nav.getBoundingClientRect().bottom + 12;
      var active = sections[0].id;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top - offset <= 1) active = sections[i].id;
      }
      setActive(active);
    }

    nav.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[data-section]') : null;
      if (a) setActive(a.getAttribute('data-section'));
    });
    global.addEventListener('scroll', syncActiveFromScroll, { passive: true });
    global.addEventListener('hashchange', function () {
      var id = (location.hash || '').replace(/^#/, '');
      if (id) setActive(id);
    });
    if (location.hash) setActive(location.hash.replace(/^#/, ''));
    else syncActiveFromScroll();
    requestAnimationFrame(syncActiveFromScroll);
  }

  global.VCProfilePage = { boot: bootProfilePage };

  function scheduleBoot() {
    if (!isProfilePage()) return;
    bootProfilePage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleBoot);
  } else {
    scheduleBoot();
  }
})(window);
