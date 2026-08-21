const { renderHomeCriticalCss } = require('../../utils/static-page-assets');

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style id="vc-critical-css" dangerouslySetInnerHTML={{ __html: renderHomeCriticalCss() }} />
      <link rel="preload" href="/assets/sand_bg.webp" as="image" />
      <link rel="stylesheet" href="/css/hero.css?v=97" />
      <link rel="stylesheet" href="/css/ambient.css?v=98" />
      <link rel="stylesheet" href="/css/announcement.css?v=145" />
      <script src="/app.js?v=98" defer />
      {children}
    </>
  );
}
