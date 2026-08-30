import Script from 'next/script';
const { renderDirectoryCriticalCss } = require('../../../utils/static-page-assets');

export default function FundsDirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preload" href="/css/directory-profile.css?v=153" as="style" />
      <link rel="preload" href="/dir-index/funds.json" as="fetch" crossOrigin="anonymous" />
      <link rel="prefetch" href="/login" />
      <link rel="stylesheet" href="/css/ambient.css?v=98" />
      <link rel="stylesheet" href="/css/directory-list.css?v=149" />
      <style id="vc-directory-critical-css" dangerouslySetInnerHTML={{ __html: renderDirectoryCriticalCss() }} />
      <Script src="/js/auth.js?v=6" strategy="afterInteractive" />
      <Script src="/js/directory-session.js?v=5" strategy="afterInteractive" />
      {children}
    </>
  );
}
