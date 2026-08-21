function extractTitle(html) {
  const m = String(html || '').match(/<title>([^<]*)<\/title>/i);
  return m ? m[1] : '';
}

function extractMetaContent(html, name) {
  const re = new RegExp(
    '<meta[^>]+name=["\']' + name + '["\'][^>]+content=["\']([^"\']*)["\']',
    'i'
  );
  const m = String(html || '').match(re);
  return m ? m[1] : '';
}

function extractCanonical(html) {
  const m = String(html || '').match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

function extractBodyClass(html) {
  const m = String(html || '').match(/<body[^>]*class=["']([^"']*)["']/i);
  return m ? m[1] : '';
}

/**
 * Drop document chrome that the Next layout already provides.
 * Keep <main> plus profile-only scripts that React will not re-run on client nav
 * (those are booted from ProfileBoot).
 */
function stripDocumentChrome(html) {
  const body = String(html || '').match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!body) return html;
  let inner = body[1];
  inner = inner.replace(/<header class="site-header">[\s\S]*?<\/header>/i, '');
  inner = inner.replace(/<script[^>]*src="\/js\/analytics\.js[^"]*"[^>]*><\/script>/gi, '');
  inner = inner.replace(/<script[^>]*src="\/js\/nav\.js[^"]*"[^>]*><\/script>/gi, '');
  inner = inner.replace(/<script[^>]*src="\/js\/auth\.js[^"]*"[^>]*><\/script>/gi, '');
  inner = inner.replace(/<script[^>]*src="\/js\/directory-session\.js[^"]*"[^>]*><\/script>/gi, '');
  inner = inner.replace(/<script[^>]*src="\/app\.js[^"]*"[^>]*><\/script>/gi, '');
  inner = inner.replace(/<script[^>]*src="\/js\/person-email-unlock\.js[^"]*"[^>]*><\/script>/gi, '');
  inner = inner.replace(/<script[^>]*src="\/investors\/lazy-portfolio-logos\.js[^"]*"[^>]*><\/script>/gi, '');
  inner = inner.replace(/<script[^>]*src="\/investors\/portfolio-section\.js[^"]*"[^>]*><\/script>/gi, '');
  inner = inner.replace(/<script[^>]*src="\/investors\/profile-sticky\.js[^"]*"[^>]*><\/script>/gi, '');
  inner = inner.replace(/<script>[\s\S]*?<\/script>/gi, '');
  return inner.trim();
}

function captureRenderHtml(renderFn) {
  let html = '';
  const res = {
    statusCode: 200,
    setHeader() {},
    status() {
      return this;
    },
    send(body) {
      html = typeof body === 'string' ? body : String(body);
      return this;
    }
  };
  renderFn(res);
  return html;
}

module.exports = {
  extractTitle,
  extractMetaContent,
  extractCanonical,
  extractBodyClass,
  stripDocumentChrome,
  captureRenderHtml
};
