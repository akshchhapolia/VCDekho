/**
 * Hydrate activity/portfolio after first paint when SSR skipped the DB wait.
 */
(function (global) {
  var inflight = '';

  function bootProfileExtras() {
    var mount = document.getElementById('inv-profile-extras');
    if (!mount) return;

    var slug = mount.getAttribute('data-slug');
    var kind = mount.getAttribute('data-kind') || 'firm';
    if (!slug || inflight === kind + ':' + slug) return;
    inflight = kind + ':' + slug;

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

    function forceVisible(html) {
      return String(html || '').replace(
        /class="([^"]*\binv-profile-reveal\b[^"]*)"/g,
        function (_, cls) {
          if (/\bis-visible\b/.test(cls)) return 'class="' + cls + '"';
          return 'class="' + cls + ' is-visible"';
        }
      );
    }

    fetch(url, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('extras ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var activityHtml = forceVisible((data && data.activityHtml) || '');
        var portfolioHtml = forceVisible((data && data.portfolioHtml) || '');
        var html = activityHtml + portfolioHtml;
        if (!html) {
          if (mount.parentNode) mount.parentNode.removeChild(mount);
          return;
        }

        var parent = mount.parentNode;
        var marker = document.createElement('div');
        marker.id = 'inv-profile-extras-done';
        marker.hidden = true;
        parent.insertBefore(marker, mount);
        mount.outerHTML = html;

        insertNavLinks(activityHtml, portfolioHtml);

        if (typeof global.VCInitPortfolioSection === 'function') {
          global.VCInitPortfolioSection();
        }
        if (typeof global.VCHydratePortfolioLogos === 'function') {
          global.VCHydratePortfolioLogos(document);
        }
        if (typeof global.VCProfileStickyPin === 'function') {
          global.VCProfileStickyPin();
        }
        if (typeof global.VCProfileStickyScrollActive === 'function') {
          global.VCProfileStickyScrollActive();
        }
      })
      .catch(function (err) {
        console.error(err);
        if (mount && mount.parentNode) mount.parentNode.removeChild(mount);
      })
      .then(function () {
        if (inflight === kind + ':' + slug) inflight = '';
      });
  }

  global.VCProfileExtras = { boot: bootProfileExtras };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootProfileExtras);
  } else {
    bootProfileExtras();
  }
})(typeof window !== 'undefined' ? window : this);
