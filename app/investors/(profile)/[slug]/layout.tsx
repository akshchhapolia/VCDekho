import Script from 'next/script';
const { renderProfileCriticalCss } = require('../../../../utils/profile-page-assets');

export default function PersonProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style id="vc-critical-css" dangerouslySetInnerHTML={{ __html: renderProfileCriticalCss() }} />
      <link rel="prefetch" href="/login" />
      <link rel="stylesheet" href="/css/ambient.css?v=98" />
      <link rel="stylesheet" href="/css/directory-profile.css?v=154" />
      <Script src="/js/auth.js?v=6" strategy="afterInteractive" />
      <Script src="/js/directory-session.js?v=5" strategy="afterInteractive" />
      <Script src="/js/person-email-unlock.js?v=15" strategy="afterInteractive" />
      <Script src="/js/profile-page-boot.js?v=4" strategy="afterInteractive" />
      <script src="/investors/profile-extras.js?v=1" defer />
      <script src="/investors/lazy-portfolio-logos.js?v=1" defer />
      <script src="/investors/portfolio-section.js?v=4" defer />
      {children}
    </>
  );
}
