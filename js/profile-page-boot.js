(function (global) {
  function bootProfilePage() {
    var nav = document.getElementById('inv-profile-sticky');
    var links = nav ? Array.prototype.slice.call(nav.querySelectorAll('a[data-section]')) : [];
    var sections = links
      .map(function (a) {
        return document.getElementById(a.getAttribute('data-section'));
      })
      .filter(Boolean);
    var lastActive = '';

    function setActive(id) {
      if (!id) return;
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
      if (!sections.length) return;
      var offset = (nav ? nav.getBoundingClientRect().bottom : 0) + 12;
      var active = sections[0].id;
      for (var i = 0; i < sections.length; i++) {
        var top = sections[i].getBoundingClientRect().top;
        if (top - offset <= 1) active = sections[i].id;
      }
      setActive(active);
    }

    links.forEach(function (a) {
      a.addEventListener('click', function () {
        setActive(a.getAttribute('data-section'));
      });
    });
    global.addEventListener('scroll', syncActiveFromScroll, { passive: true });
    global.addEventListener('hashchange', function () {
      var id = (location.hash || '').replace(/^#/, '');
      if (id) setActive(id);
    });
    if (location.hash) setActive(location.hash.replace(/^#/, ''));
    else syncActiveFromScroll();
    requestAnimationFrame(syncActiveFromScroll);

    var reveals = document.querySelectorAll('.inv-profile-reveal:not(.is-visible)');
    if ('IntersectionObserver' in global) {
      var ro = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add('is-visible');
              ro.unobserve(e.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
      );
      reveals.forEach(function (el) {
        ro.observe(el);
      });
    } else {
      reveals.forEach(function (el) {
        el.classList.add('is-visible');
      });
    }

    var host = document.getElementById('inv-profile-sticky-host');
    function pin() {
      if (!host || !nav) return;
      var mweb = global.matchMedia('(max-width:768px)').matches;
      if (!mweb) return;
      var y = global.scrollY || global.pageYOffset;
      var top = host.getBoundingClientRect().top + y;
      if (y >= top - 1) {
        nav.classList.add('is-pinned');
        host.style.minHeight = (nav.offsetHeight || 48) + 'px';
        nav.style.left = '0';
        nav.style.width = '100%';
      } else {
        nav.classList.remove('is-pinned');
        host.style.minHeight = '';
        nav.style.left = '';
        nav.style.width = '';
      }
    }
    global.VCProfileStickyPin = pin;
    global.addEventListener('scroll', pin, { passive: true });
    pin();

    requestAnimationFrame(function () {
      document.body.classList.add('inv-profile-ready');
    });
  }

  global.VCProfilePage = { boot: bootProfilePage };
})(window);
