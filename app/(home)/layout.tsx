import Script from 'next/script';
const { renderHomeCriticalCss } = require('../../utils/static-page-assets');

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style id="vc-critical-css" dangerouslySetInnerHTML={{ __html: renderHomeCriticalCss() }} />
      <link rel="preload" href="/assets/sand_bg.webp" as="image" />
      <Script src="/app.js?v=98" strategy="beforeInteractive" />
      {children}
    </>
  );
}
