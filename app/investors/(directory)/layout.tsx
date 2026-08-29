import Script from 'next/script';
const { renderDirectoryCriticalCss } = require('../../../utils/static-page-assets');

export default function InvestorsDirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preload" href="/css/directory-profile.css?v=145" as="style" />
      <link rel="stylesheet" href="/css/directory-list.css?v=145" />
      <style id="vc-directory-critical-css" dangerouslySetInnerHTML={{ __html: renderDirectoryCriticalCss() }} />
      <Script src="/js/people.js?v=126" strategy="beforeInteractive" />
      {children}
    </>
  );
}
