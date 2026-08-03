(function (global) {
  function replaceWithMailto(btn, email, slug) {
    var link = document.createElement('a');
    var isProfile = btn.classList.contains('inv-profile-cta');
    link.className = isProfile ? 'inv-profile-cta is-ghost' : 'inv-dir-inline-link';
    link.href = 'mailto:' + email;
    link.textContent = email;
    link.setAttribute('data-analytics-event', 'profile_cta_click');
    link.setAttribute('data-analytics-params', JSON.stringify({ cta: 'email', kind: 'person', slug: slug }));
    if (!isProfile) {
      link.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }
    btn.replaceWith(link);
  }

  async function unlockEmail(btn) {
    var slug = btn.getAttribute('data-person-slug');
    if (!slug || btn.disabled) return;

    if (!global.VCAuth) {
      btn.textContent = 'Sign in required';
      return;
    }

    var session = await global.VCAuth.getSession();
    if (!session) {
      global.location.href = global.VCAuth.loginUrl(global.location.pathname + global.location.search);
      return;
    }

    btn.disabled = true;
    var prevText = btn.textContent;
    btn.textContent = 'Unlocking…';

    try {
      var url = '/api/people?slug=' + encodeURIComponent(slug) + '&contact=email';
      var res = await global.VCAuth.authFetch(url);
      if (res.status === 401) {
        global.location.href = global.VCAuth.loginUrl(global.location.pathname + global.location.search);
        return;
      }
      if (!res.ok) throw new Error('unlock failed');
      var data = await res.json();
      if (!data || !data.email) throw new Error('no email');

      replaceWithMailto(btn, data.email, slug);

      if (global.VCAnalytics && global.VCAnalytics.track) {
        global.VCAnalytics.track('contact_unlock', { kind: 'person', slug: slug });
      }
    } catch (_) {
      btn.disabled = false;
      btn.textContent = prevText === 'Unlocking…' ? 'Unlock email' : 'Try again';
    }
  }

  function wireUnlockButtons(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-unlock-email]').forEach(function (btn) {
      if (btn.dataset.wired) return;
      btn.dataset.wired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        unlockEmail(btn);
      });
    });
  }

  global.VCPersonEmailUnlock = {
    unlockEmail: unlockEmail,
    wireUnlockButtons: wireUnlockButtons
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wireUnlockButtons();
    });
  } else {
    wireUnlockButtons();
  }
})(window);
