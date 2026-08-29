(function (global) {
  var last = {};

  function report(kind, extra) {
    try {
      var key = String(kind || 'unknown');
      var now = Date.now();
      if (last[key] && now - last[key] < 60000) return;
      last[key] = now;
      var payload = JSON.stringify({
        kind: key,
        href: global.location && global.location.href,
        extra: extra || {}
      });
      if (payload.length > 2000) payload = payload.slice(0, 2000);
      fetch('/api/ops?action=client-error', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: payload
      }).catch(function () {});
    } catch (_) {}
  }

  global.VCReport = report;
})(typeof window !== 'undefined' ? window : this);
