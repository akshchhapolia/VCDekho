(function (global) {
  var mobileMq = global.matchMedia('(max-width: 768px)');
  var bound = false;
  var togglePlaceholder = null;

  function els() {
    return {
      toggle: document.getElementById('menu-toggle'),
      nav: document.getElementById('navigation-bar'),
      header: document.querySelector('.site-header')
    };
  }

  function ensureBackdrop() {
    var backdrop = document.getElementById('nav-backdrop');
    if (backdrop) return backdrop;
    backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.id = 'nav-backdrop';
    backdrop.className = 'nav-backdrop';
    backdrop.hidden = true;
    backdrop.setAttribute('aria-label', 'Close menu');
    backdrop.setAttribute('aria-hidden', 'true');
    return backdrop;
  }

  function restoreToggle(toggle, header) {
    if (!toggle || !header) return;
    if (togglePlaceholder && togglePlaceholder.parentNode) {
      togglePlaceholder.parentNode.replaceChild(toggle, togglePlaceholder);
      togglePlaceholder = null;
    } else if (toggle.parentNode !== header) {
      header.appendChild(toggle);
    }
    header.querySelectorAll('.nav-toggle-spacer').forEach(function (node) {
      if (node.parentNode) node.parentNode.removeChild(node);
    });
  }

  function restoreNav(nav, header) {
    if (!nav || !header) return;
    if (nav.parentNode !== header) header.appendChild(nav);
  }

  function isOpen() {
    var nav = els().nav;
    return Boolean(nav && nav.classList.contains('active'));
  }

  function setOpen(open) {
    var nodes = els();
    var toggle = nodes.toggle;
    var nav = nodes.nav;
    var header = nodes.header;
    if (!toggle || !nav) return;

    toggle.classList.toggle('active', open);
    nav.classList.toggle('active', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('nav-open', open);

    var backdrop = ensureBackdrop();
    backdrop.hidden = !open;
    backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');

    if (!mobileMq.matches) {
      restoreNav(nav, header);
      restoreToggle(toggle, header);
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      return;
    }

    if (open) {
      if (header && toggle.parentNode === header) {
        togglePlaceholder = document.createElement('span');
        togglePlaceholder.className = 'nav-toggle-spacer';
        togglePlaceholder.setAttribute('aria-hidden', 'true');
        header.replaceChild(togglePlaceholder, toggle);
      }
      document.body.appendChild(backdrop);
      document.body.appendChild(nav);
      document.body.appendChild(toggle);
    } else {
      restoreNav(nav, header);
      restoreToggle(toggle, header);
    }
  }

  function onDocumentClick(e) {
    var target = e.target;
    if (!target || !target.closest) return;

    if (target.closest('#menu-toggle')) {
      e.preventDefault();
      e.stopPropagation();
      if (!mobileMq.matches) return;
      setOpen(!isOpen());
      return;
    }

    if (target.closest('#nav-backdrop')) {
      e.preventDefault();
      setOpen(false);
      return;
    }

    var link = target.closest('#navigation-bar a.nav-link');
    if (link) {
      if (!mobileMq.matches) return;
      setOpen(false);
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') setOpen(false);
  }

  function onViewportChange() {
    if (!mobileMq.matches) setOpen(false);
  }

  function boot() {
    var nodes = els();
    if (nodes.toggle) nodes.toggle.setAttribute('aria-controls', 'navigation-bar');
    if (!bound) {
      bound = true;
      document.addEventListener('click', onDocumentClick, true);
      document.addEventListener('keydown', onKeydown);
      if (typeof mobileMq.addEventListener === 'function') {
        mobileMq.addEventListener('change', onViewportChange);
      } else if (typeof mobileMq.addListener === 'function') {
        mobileMq.addListener(onViewportChange);
      }
    }
  }

  global.VCNav = {
    close: function () {
      setOpen(false);
    },
    boot: boot
  };

  boot();
})(window);
