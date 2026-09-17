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

function stripDocumentChrome(html) {
  const body = String(html || '').match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const inner = body ? body[1] : String(html || '');
  const main = inner.match(/<main[\s\S]*<\/main>/i);
  return (main ? main[0] : inner).trim();
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
