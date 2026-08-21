const { renderDirectoryCriticalCss } = require('../../../utils/static-page-assets');

export default function InvestorsDirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style id="vc-critical-css" dangerouslySetInnerHTML={{ __html: renderDirectoryCriticalCss() }} />
      <link rel="stylesheet" href="/css/hero.css?v=97" />
      <link rel="stylesheet" href="/css/ambient.css?v=98" />
      <link rel="stylesheet" href="/css/announcement.css?v=145" />
      <link rel="stylesheet" href="/css/directory-list.css?v=145" />
      <script src="/js/person-email-unlock.js?v=8" defer />
      <script src="/js/people.js?v=124" defer />
      {children}
    </>
  );
}
