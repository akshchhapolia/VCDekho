const { renderDirectoryCriticalCss } = require('../../../utils/static-page-assets');

export default function InvestorsDirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/css/directory-list.css?v=145" />
      <style id="vc-directory-critical-css" dangerouslySetInnerHTML={{ __html: renderDirectoryCriticalCss() }} />
      {children}
    </>
  );
}
