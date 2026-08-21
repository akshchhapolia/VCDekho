const { renderHomeCriticalCss } = require('../../utils/static-page-assets');

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style id="vc-critical-css" dangerouslySetInnerHTML={{ __html: renderHomeCriticalCss() }} />
      <link rel="preload" href="/assets/sand_bg.webp" as="image" />
      {children}
    </>
  );
}
