/**
 * Mweb profile pages: hydrate activity/portfolio after first paint
 * when SSR skipped the DB wait (#inv-profile-extras mount).
 */
(function () {
  var mount = document.getElementById('inv-profile-extras');
  if (!mount) return;

  var slug = mount.getAttribute('data-slug');
  var kind = mount.getAttribute('data-kind') || 'firm';
  if (!slug) return;

  var url =
    kind === 'person'
      ? '/api/people?slug=' + encodeURIComponent(slug) + '&extras=1'
      : '/api/investors/detail?slug=' + encodeURIComponent(slug) + '&extras=1';

  function insertNavLinks(activityHtml, portfolioHtml) {
    var nav = document.getElementById('inv-profile-sticky');
    if (!nav) return;

    function ensureLink(id, label, beforeId) {
      if (!id || nav.querySelector('a[data-section="' + id + '"]')) return;
      var a = document.createElement('a');
      a.href = '#' + id;
      a.setAttribute('data-section', id);
      a.textContent = label;
      var before = beforeId ? nav.querySelector('a[data-section="' + beforeId + '"]') : null;
      if (before) nav.insertBefore(a, before);
      else nav.appendChild(a);
    }

    if (activityHtml) {
      ensureLink(
        kind === 'person' ? 'firm-activity' : 'activity',
        'Activity',
        kind === 'person' ? 'colleagues' : 'focus'
      );
    }
    if (portfolioHtml) {
      ensureLink(
        kind === 'person' ? 'firm-portfolio' : 'portfolio',
        'Portfolio',
        kind === 'person' ? 'colleagues' : 'focus'
      );
    }
  }

  function reveal(root) {
    var nodes = root.querySelectorAll('.inv-profile-reveal:not(.is-visible)');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('is-visible');
  }

  fetch(url, { credentials: 'same-origin' })
    .then(function (res) {
      if (!res.ok) throw new Error('extras ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var activityHtml = String((data && data.activityHtml) || '');
      var portfolioHtml = String((data && data.portfolioHtml) || '');
      var html = activityHtml + portfolioHtml;
      if (!html) {
        mount.remove();
        return;
      }
      mount.outerHTML = html;
      insertNavLinks(activityHtml, portfolioHtml);
      var host = document.getElementById('inv-profile-sticky-host');
      var injected = host
        ? host.parentElement
        : document.querySelector('.inv-profile-wrap');
      if (injected) reveal(injected);
      if (typeof window.VCHydratePortfolioLogos === 'function') {
        window.VCHydratePortfolioLogos(document);
      }
      if (typeof window.VCProfileStickyScrollActive === 'function') {
        window.VCProfileStickyScrollActive();
      }
    })
    .catch(function (err) {
      console.error(err);
      mount.remove();
    });
})();
