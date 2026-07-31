(function () {
  function initNav() {
    var menuToggle = document.getElementById('menu-toggle');
    var mainNav = document.getElementById('navigation-bar');
    if (!menuToggle || !mainNav) return;

    var backdrop = document.getElementById('nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'nav-backdrop';
      backdrop.className = 'nav-backdrop';
      backdrop.hidden = true;
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
    }

    function setOpen(open) {
      menuToggle.classList.toggle('active', open);
      mainNav.classList.toggle('active', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      backdrop.hidden = !open;
      backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.classList.toggle('nav-open', open);
    }

    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-controls', 'navigation-bar');

    menuToggle.addEventListener('click', function () {
      setOpen(!mainNav.classList.contains('active'));
    });

    backdrop.addEventListener('click', function () {
      setOpen(false);
    });

    mainNav.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        setOpen(false);
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
