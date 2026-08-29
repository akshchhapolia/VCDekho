import Script from 'next/script';
const { renderDirectoryCriticalCss } = require('../../../utils/static-page-assets');

export default function InvestorsDirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preload" href="/css/directory-profile.css?v=149" as="style" />
      <link rel="prefetch" href="/login" />
      <link rel="prefetch" href="/js/supabase.min.js?v=1" />
      <link rel="stylesheet" href="/css/directory-list.css?v=148" />
      <style id="vc-directory-critical-css" dangerouslySetInnerHTML={{ __html: renderDirectoryCriticalCss() }} />
      <Script src="/js/people.js?v=133" strategy="beforeInteractive" />
      {children}
    </>
  );
}
