window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}

var GA_ID = 'G-BJ23KLLWFM';

/** Common marketing / profile CTA selectors (no data-analytics-event required). */
var CTA_SELECTOR = [
  'a.inv-profile-cta',
  'a.blog-cta-btn',
  'a.stage-hero-cta',
  'a.inv-person-firm-panel-cta',
  'a.inv-person-dir-cta',
  'a.inv-profile-panel-link',
  'a.inv-explore-cta',
  'a.inv-dir-empty-action',
  'button.inv-dir-empty-action',
  'a.blog-cta-btn',
  '.hero-cta a',
  'a.cta-primary',
  'a.cta-secondary',
  'button.cta-primary',
  '#auth-submit-btn',
  '#google-btn',
  'a.inv-dir-filters-toggle',
  'button.inv-dir-filters-toggle'
].join(',');

function pageParams() {
  return {
    page_title: document.title || '',
    page_location: String(location.href || ''),
    page_path: String(location.pathname || '')
  };
}

function flushQueue() {
  if (!window.__vcAnalyticsQueue || !window.__vcAnalyticsQueue.length) return;
  window.__vcAnalyticsQueue.forEach(function (item) {
    gtag('event', item.name, item.params || {});
  });
  window.__vcAnalyticsQueue = [];
}

function loadAnalytics() {
  if (window.__vcAnalyticsLoaded) return;
  window.__vcAnalyticsLoaded = true;
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  script.onload = function () {
    gtag('js', new Date());
    // One explicit page_view (avoid default auto + manual double-count)
    gtag('config', GA_ID, { send_page_view: false });
    gtag('event', 'page_view', pageParams());
    window.__vcAnalyticsReady = true;
    flushQueue();
  };
  document.head.appendChild(script);
}

window.VCAnalytics = {
  track: function (name, params) {
    if (!name) return;
    var payload = params || {};
    if (window.__vcAnalyticsReady) {
      gtag('event', name, payload);
      return;
    }
    window.__vcAnalyticsQueue = window.__vcAnalyticsQueue || [];
    window.__vcAnalyticsQueue.push({ name: name, params: payload });
  },
  pageView: function () {
    window.VCAnalytics.track('page_view', pageParams());
  }
};

document.addEventListener(
  'click',
  function (e) {
    if (!e.target || !e.target.closest) return;

    // Explicit instrumentation wins
    var tagged = e.target.closest('[data-analytics-event]');
    if (tagged) {
      var name = tagged.getAttribute('data-analytics-event');
      if (!name) return;
      var params = {};
      var raw = tagged.getAttribute('data-analytics-params');
      if (raw) {
        try {
          params = JSON.parse(raw);
        } catch (_) {}
      }
      if (!params.label) {
        params.label = (tagged.textContent || '').trim().slice(0, 80);
      }
      if (!params.href && tagged.getAttribute('href')) {
        params.href = tagged.getAttribute('href');
      }
      params.page_path = location.pathname;
      window.VCAnalytics.track(name, params);
      // Also mirror as cta_click for funnel simplicity when it's a CTA-ish name
      if (/cta|click|submit/i.test(name) && name !== 'cta_click') {
        window.VCAnalytics.track('cta_click', {
          cta_event: name,
          label: params.label || '',
          href: params.href || '',
          page_path: location.pathname
        });
      }
      return;
    }

    var cta = e.target.closest(CTA_SELECTOR);
    if (!cta) return;
    // Ignore pure UI toggles that aren't navigation CTAs if they have no href and aren't submit
    var href = cta.getAttribute('href') || '';
    var isBtn = cta.tagName === 'BUTTON' || cta.getAttribute('type') === 'submit';
    if (!href && !isBtn && cta.id !== 'google-btn' && cta.id !== 'auth-submit-btn') return;

    window.VCAnalytics.track('cta_click', {
      label: (cta.textContent || '').trim().slice(0, 80),
      href: href,
      cta_id: cta.id || '',
      cta_class: (cta.className && String(cta.className).slice(0, 120)) || '',
      page_path: location.pathname
    });
  },
  true
);

if ('requestIdleCallback' in window) {
  requestIdleCallback(loadAnalytics, { timeout: 3000 });
} else {
  window.addEventListener('load', loadAnalytics);
}
