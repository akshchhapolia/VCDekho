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
    var wrap = document.createElement('span');
    wrap.className = 'inv-email-revealed' + (isProfile ? ' inv-email-revealed--profile' : '');
    wrap.setAttribute('data-person-slug', slug);

    var link = document.createElement('a');
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

    wrap.appendChild(link);
    wrap.appendChild(createCopyBtn(email, slug, isProfile));
    return wrap;
  }

  function revealedEmailHtml(email, slug, isProfile) {
    var wrapClass = 'inv-email-revealed' + (isProfile ? ' inv-email-revealed--profile' : '');
    var linkClass = isProfile ? 'inv-profile-cta is-ghost' : 'inv-dir-inline-link';
    var copyClass = 'inv-email-copy-btn' + (isProfile ? ' inv-email-copy-btn--profile' : '');
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
    var scope = root || document;
    var buttons = scope.querySelectorAll('[data-unlock-email]');
    buttons.forEach(function (btn) {
      hydratePersistedEmail(btn);
    });
  }

  async function unlockEmail(btn) {
    var slug = btn.getAttribute('data-person-slug');
    if (!slug || btn.disabled) return;

    if (!global.VCAuth) {
      setBtnLabel(btn, 'Sign in required');
      return;
    }

    var session = await global.VCAuth.getSession();
    if (!session) {
      global.location.href = global.VCAuth.loginUrl(global.location.pathname + global.location.search);
      return;
    }

    btn.disabled = true;
    var prevText = getBtnLabel(btn);
    setBtnLabel(btn, 'Unlocking…');

    try {
      var url = '/api/people?slug=' + encodeURIComponent(slug) + '&contact=email';
      var res = await global.VCAuth.authFetch(url, { method: 'POST' });
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

      global.dispatchEvent(new CustomEvent('vc:person-email-unlocked', { detail: { slug: slug } }));
    } catch (_) {
      btn.disabled = false;
      setBtnLabel(btn, prevText === 'Unlocking…' ? 'Unlock email' : 'Try again');
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
    initEmailUnlock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})(window);
