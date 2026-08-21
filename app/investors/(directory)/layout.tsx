const { renderDirectoryCriticalCss } = require('../../../utils/static-page-assets');

export default function InvestorsDirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style id="vc-directory-critical-css" dangerouslySetInnerHTML={{ __html: renderDirectoryCriticalCss() }} />
      <link rel="stylesheet" href="/css/directory-list.css?v=145" />
      {children}
    </>
  );
}
