window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}

function loadAnalytics() {
  if (window.__vcAnalyticsLoaded) return;
  window.__vcAnalyticsLoaded = true;
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-BJ23KLLWFM';
  script.onload = function () {
    gtag('js', new Date());
    gtag('config', 'G-BJ23KLLWFM');
    window.__vcAnalyticsReady = true;
    if (window.__vcAnalyticsQueue && window.__vcAnalyticsQueue.length) {
      window.__vcAnalyticsQueue.forEach(function (item) {
        gtag('event', item.name, item.params || {});
      });
      window.__vcAnalyticsQueue = [];
    }
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
  }
};

document.addEventListener(
  'click',
  function (e) {
    var el = e.target && e.target.closest
      ? e.target.closest('[data-analytics-event]')
      : null;
    if (!el) return;
    var name = el.getAttribute('data-analytics-event');
    if (!name) return;
    var params = {};
    var raw = el.getAttribute('data-analytics-params');
    if (raw) {
      try {
        params = JSON.parse(raw);
      } catch (_) {}
    }
    if (!params.label) {
      params.label = (el.textContent || '').trim().slice(0, 80);
    }
    if (!params.href && el.getAttribute('href')) {
      params.href = el.getAttribute('href');
    }
    window.VCAnalytics.track(name, params);
  },
  true
);

if ('requestIdleCallback' in window) {
  requestIdleCallback(loadAnalytics, { timeout: 3000 });
} else {
  window.addEventListener('load', loadAnalytics);
}
