import Script from 'next/script';
const { renderDirectoryCriticalCss } = require('../../../utils/static-page-assets');

export default function FundsDirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preload" href="/css/directory-profile.css?v=150" as="style" />
      <link rel="prefetch" href="/login" />
      <link rel="prefetch" href="/login.js?v=113" />
      <link rel="prefetch" href="/js/supabase.min.js?v=1" />
      <link rel="stylesheet" href="/css/directory-list.css?v=148" />
      <style id="vc-directory-critical-css" dangerouslySetInnerHTML={{ __html: renderDirectoryCriticalCss() }} />
      <Script src="/investors/investors.js?v=122" strategy="beforeInteractive" />
      {children}
    </>
  );
}
