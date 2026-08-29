const { renderProfileCriticalCss, profileMobileAsyncCssScript } = require('../../../../utils/profile-page-assets');

export default function FundProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style id="vc-critical-css" dangerouslySetInnerHTML={{ __html: renderProfileCriticalCss() }} />
      <link rel="stylesheet" href="/css/directory-profile.css?v=149" media="(min-width: 769px)" />
      <script dangerouslySetInnerHTML={{ __html: profileMobileAsyncCssScript() }} />
      <script src="/investors/lazy-portfolio-logos.js?v=1" defer />
      <script src="/investors/portfolio-section.js?v=4" defer />
      <script src="/investors/profile-sticky.js?v=6" defer />
      {children}
    </>
  );
}
