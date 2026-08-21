const { renderProfileCriticalCss } = require('../../../../utils/profile-page-assets');

export default function PersonProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style id="vc-critical-css" dangerouslySetInnerHTML={{ __html: renderProfileCriticalCss() }} />
      <link rel="stylesheet" href="/css/hero.css?v=97" />
      <link rel="stylesheet" href="/css/ambient.css?v=98" />
      <link rel="stylesheet" href="/css/announcement.css?v=145" />
      <link rel="stylesheet" href="/css/directory-list.css?v=145" />
      <link rel="stylesheet" href="/css/directory-profile.css?v=145" />
      <script src="/js/person-email-unlock.js?v=8" defer />
      <script src="/investors/lazy-portfolio-logos.js?v=1" defer />
      <script src="/investors/portfolio-section.js?v=4" defer />
      <script src="/investors/profile-sticky.js?v=6" defer />
      <script src="/js/profile-page-boot.js?v=1" defer />
      {children}
    </>
  );
}
