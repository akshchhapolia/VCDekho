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
  };
  document.head.appendChild(script);
}

if ('requestIdleCallback' in window) {
  requestIdleCallback(loadAnalytics, { timeout: 3000 });
} else {
  window.addEventListener('load', loadAnalytics);
}
