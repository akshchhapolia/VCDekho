(function (global) {
  var COPY_ICON =
    '<svg class="inv-email-copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>' +
    '</svg>';

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getLabelEl(btn) {
    return btn.querySelector('.inv-email-unlock-label');
  }

  function setBtnLabel(btn, text) {
    var label = getLabelEl(btn);
    if (label) label.textContent = text;
    else btn.textContent = text;
  }

  function getBtnLabel(btn) {
    var label = getLabelEl(btn);
    return label ? label.textContent : btn.textContent;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  function wireCopyBtn(btn, email, slug) {
    if (btn.dataset.copyWired) return;
    btn.dataset.copyWired = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      copyToClipboard(email)
        .then(function () {
          btn.classList.add('is-copied');
          btn.setAttribute('aria-label', 'Copied');
          btn.setAttribute('title', 'Copied');
          setTimeout(function () {
            btn.classList.remove('is-copied');
            btn.setAttribute('aria-label', 'Copy email');
            btn.setAttribute('title', 'Copy email');
          }, 1600);
          if (global.VCAnalytics && global.VCAnalytics.track) {
            global.VCAnalytics.track('contact_copy', { kind: 'person', slug: slug });
          }
        })
        .catch(function () {});
    });
  }

  function createCopyBtn(email, slug, isProfile) {
    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'inv-email-copy-btn' + (isProfile ? ' inv-email-copy-btn--profile' : '');
    copyBtn.setAttribute('aria-label', 'Copy email');
    copyBtn.setAttribute('title', 'Copy email');
    copyBtn.innerHTML = COPY_ICON;
    wireCopyBtn(copyBtn, email, slug);
    return copyBtn;
  }

  function buildRevealedElement(email, slug, isProfile) {
    if (isProfile) {
      var wrap = document.createElement('span');
      wrap.className = 'inv-email-revealed inv-email-revealed--profile';
      wrap.setAttribute('data-person-slug', slug);

      var capsule = document.createElement('span');
      capsule.className = 'inv-profile-cta is-ghost inv-email-capsule';

      var link = document.createElement('a');
      link.className = 'inv-email-capsule-link';
      link.href = 'mailto:' + email;
      link.textContent = email;
      link.setAttribute('data-analytics-event', 'profile_cta_click');
      link.setAttribute('data-analytics-params', JSON.stringify({ cta: 'email', kind: 'person', slug: slug }));

      capsule.appendChild(link);
      capsule.appendChild(createCopyBtn(email, slug, true));
      wrap.appendChild(capsule);
      return wrap;
    }

    var wrap = document.createElement('span');
    wrap.className = 'inv-email-revealed';
    wrap.setAttribute('data-person-slug', slug);

    var link = document.createElement('a');
    link.className = 'inv-dir-inline-link';
    link.href = 'mailto:' + email;
    link.textContent = email;
    link.setAttribute('data-analytics-event', 'profile_cta_click');
    link.setAttribute('data-analytics-params', JSON.stringify({ cta: 'email', kind: 'person', slug: slug }));
    link.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    wrap.appendChild(link);
    wrap.appendChild(createCopyBtn(email, slug, false));
    return wrap;
  }

  function revealedEmailHtml(email, slug, isProfile) {
    if (isProfile) {
      var copyClass = 'inv-email-copy-btn inv-email-copy-btn--profile';
      return (
        '<span class="inv-email-revealed inv-email-revealed--profile" data-person-slug="' + escHtml(slug) + '">' +
        '<span class="inv-profile-cta is-ghost inv-email-capsule">' +
        '<a class="inv-email-capsule-link" href="mailto:' + escHtml(email) + '" data-analytics-event="profile_cta_click" data-analytics-params=\'' +
        escHtml(JSON.stringify({ cta: 'email', kind: 'person', slug: slug })) + '\'>' + escHtml(email) + '</a>' +
        '<button type="button" class="' + copyClass + '" aria-label="Copy email" title="Copy email">' + COPY_ICON + '</button>' +
        '</span></span>'
      );
    }

    var wrapClass = 'inv-email-revealed';
    var linkClass = 'inv-dir-inline-link';
    var copyClass = 'inv-email-copy-btn';
    return (
      '<span class="' + wrapClass + '" data-person-slug="' + escHtml(slug) + '">' +
      '<a class="' + linkClass + '" href="mailto:' + escHtml(email) + '" data-analytics-event="profile_cta_click" data-analytics-params=\'' +
      escHtml(JSON.stringify({ cta: 'email', kind: 'person', slug: slug })) + '\'>' + escHtml(email) + '</a>' +
      '<button type="button" class="' + copyClass + '" aria-label="Copy email" title="Copy email">' + COPY_ICON + '</button>' +
      '</span>'
    );
  }

  function replaceWithMailto(btn, email, slug) {
    var isProfile = btn.classList.contains('inv-profile-cta');
    btn.replaceWith(buildRevealedElement(email, slug, isProfile));
  }

  function wireRevealedEmails(root) {
    var scope = root || document;
    scope.querySelectorAll('.inv-email-revealed').forEach(function (wrap) {
      if (wrap.dataset.revealedWired) return;
      wrap.dataset.revealedWired = '1';
      var copyBtn = wrap.querySelector('.inv-email-copy-btn');
      var link = wrap.querySelector('a[href^="mailto:"]');
      if (!copyBtn || !link) return;
      var email = decodeURIComponent((link.getAttribute('href') || '').replace(/^mailto:/i, ''));
      var slug = wrap.getAttribute('data-person-slug') || '';
      wireCopyBtn(copyBtn, email, slug);
      if (!wrap.classList.contains('inv-email-revealed--profile')) {
        link.addEventListener('click', function (e) {
          e.stopPropagation();
        });
      }
    });
  }

  async function hydratePersistedEmail(btn) {
    var slug = btn.getAttribute('data-person-slug');
    if (!slug || !global.VCAuth) return;

    var session = await global.VCAuth.getSession();
    if (!session) return;

    try {
      var url = '/api/people?slug=' + encodeURIComponent(slug) + '&contact=email';
      var res = await global.VCAuth.authFetch(url);
      if (!res.ok) return;
      var data = await res.json();
      if (data && data.unlocked && data.email) {
        replaceWithMailto(btn, data.email, slug);
      }
    } catch (_) {}
  }

  function hydratePersistedEmails(root) {
    // Skip the SDK for anonymous visits. hasStoredSession() is true for the
    // 1h cookie OR a persisted refresh token — nav can say Log out after the
    // cookie expires, and those already-unlocked emails still need to paint.
    if (!global.VCAuth || !global.VCAuth.hasStoredSession || !global.VCAuth.hasStoredSession()) {
      return;
    }
    var scope = root || document;
    var buttons = scope.querySelectorAll('[data-unlock-email]');
    buttons.forEach(function (btn) {
      // Directory rows are filled by the list API (one request). N parallel
      // contact GETs were opening a DB connection each and hitting EMAXCONN.
      if (btn.closest && btn.closest('#ppl-results')) return;
      hydratePersistedEmail(btn);
    });
  }

  function showDailyLimitStrip() {
    var existing = document.getElementById('inv-email-limit-strip');
    if (existing) existing.remove();

    var strip = document.createElement('div');
    strip.id = 'inv-email-limit-strip';
    strip.className = 'inv-email-limit-strip';
    strip.setAttribute('role', 'status');
    strip.setAttribute('aria-live', 'polite');
    strip.textContent = 'Daily limit of 10 unlocks reached';

    document.body.appendChild(strip);
    requestAnimationFrame(function () {
      strip.classList.add('is-visible');
    });

    setTimeout(function () {
      strip.classList.remove('is-visible');
      setTimeout(function () {
        if (strip.parentNode) strip.parentNode.removeChild(strip);
      }, 280);
    }, 3000);
  }

  function hasAccessCookie() {
    return /(?:^|;\s*)vd_access_token=/.test(document.cookie || '');
  }

  function loginHref(slug) {
    return '/login#/investors/' + String(slug || '');
  }

  function goLogin(slug) {
    global.location.assign(loginHref(slug));
  }

  function isProbablySignedIn() {
    if (global.VCAuth && global.VCAuth.hasStoredSession) {
      return global.VCAuth.hasStoredSession();
    }
    return hasAccessCookie();
  }

  var unlockChain = Promise.resolve();
  var dailyLimitHit = false;

  async function unlockEmail(btn) {
    if (btn.dataset.unlockQueued === '1') return;
    btn.dataset.unlockQueued = '1';
    btn.setAttribute('aria-disabled', 'true');
    setBtnLabel(btn, 'Unlocking…');
    unlockChain = unlockChain.then(function () {
      return runUnlock(btn);
    }).catch(function () {});
  }

  async function runUnlock(btn) {
    var slug = btn.getAttribute('data-person-slug');
    if (!slug) return;

    if (dailyLimitHit) {
      btn.removeAttribute('aria-disabled');
      btn.dataset.unlockQueued = '';
      setBtnLabel(btn, 'Unlock email');
      showDailyLimitStrip();
      return;
    }

    if (!global.VCAuth) {
      goLogin(slug);
      return;
    }

    var session = await global.VCAuth.getSession();
    if (!session) {
      btn.removeAttribute('aria-disabled');
      btn.dataset.unlockQueued = '';
      setBtnLabel(btn, 'Unlock email');
      goLogin(slug);
      return;
    }

    try {
      var url = '/api/people?slug=' + encodeURIComponent(slug) + '&contact=email';
      var res = await global.VCAuth.authFetch(url, { method: 'POST' });
      if (res.status === 401) {
        goLogin(slug);
        return;
      }
      if (res.status === 429) {
        dailyLimitHit = true;
        btn.removeAttribute('aria-disabled');
        btn.dataset.unlockQueued = '';
        setBtnLabel(btn, 'Unlock email');
        showDailyLimitStrip();
        return;
      }
      var data = null;
      try {
        data = await res.json();
      } catch (_) {
        data = null;
      }
      if (!res.ok) throw new Error('unlock failed');
      if (!data || !data.email) throw new Error('no email');

      replaceWithMailto(btn, data.email, slug);

      if (global.VCAnalytics && global.VCAnalytics.track) {
        global.VCAnalytics.track('contact_unlock', { kind: 'person', slug: slug });
      }

      global.dispatchEvent(new CustomEvent('vc:person-email-unlocked', { detail: { slug: slug } }));
    } catch (err) {
      if (global.VCReport) {
        global.VCReport('unlock_failed', {
          slug: slug,
          status: typeof res !== 'undefined' && res ? res.status : null,
          message: err && err.message
        });
      }
      btn.removeAttribute('aria-disabled');
      btn.dataset.unlockQueued = '';
      setBtnLabel(btn, 'Try again');
    }
  }

  function onUnlockClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-unlock-email]') : null;
    if (!btn) return;
    if (isProbablySignedIn()) {
      e.preventDefault();
      e.stopPropagation();
      unlockEmail(btn);
      return;
    }
    // Signed out: let the <a href="/login#..."> navigate natively so a warmed
    // / prerendered login document can paint immediately. Do not stopPropagation
    // on document capture — that would cancel the link's default action.
  }

  function wireUnlockButtons(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-unlock-email]').forEach(function (btn) {
      var slug = btn.getAttribute('data-person-slug');
      if (slug && btn.tagName === 'A') {
        var fast = loginHref(slug);
        if (btn.getAttribute('href') !== fast) btn.setAttribute('href', fast);
      }
      if (btn.dataset.wired) return;
      btn.dataset.wired = '1';
    });
  }

  function initEmailUnlock(root) {
    wireUnlockButtons(root);
    wireRevealedEmails(root);
    hydratePersistedEmails(root);
  }

  global.VCPersonEmailUnlock = {
    unlockEmail: unlockEmail,
    wireUnlockButtons: wireUnlockButtons,
    wireRevealedEmails: wireRevealedEmails,
    hydratePersistedEmails: hydratePersistedEmails,
    revealedEmailHtml: revealedEmailHtml,
    initEmailUnlock: initEmailUnlock
  };

  function onReady() {
    if (!document.documentElement.dataset.vcUnlockClick) {
      document.documentElement.dataset.vcUnlockClick = '1';
      document.addEventListener('click', onUnlockClick, true);
    }
    initEmailUnlock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})(window);
