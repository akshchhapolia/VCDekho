import Script from 'next/script';
const { renderDirectoryCriticalCss } = require('../../../utils/static-page-assets');

export default function FundsDirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preload" href="/css/directory-profile.css?v=149" as="style" />
      <link rel="stylesheet" href="/css/directory-list.css?v=145" />
      <style id="vc-directory-critical-css" dangerouslySetInnerHTML={{ __html: renderDirectoryCriticalCss() }} />
      <Script src="/investors/investors.js?v=118" strategy="beforeInteractive" />
      {children}
    </>
  );
}
