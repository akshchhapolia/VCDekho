import type { Metadata } from 'next';
import Script from 'next/script';
import ClientRuntime from './components/ClientRuntime';
import { inlineDirectoryFiltersScript } from '../lib/inline-directory-filters';

export const metadata: Metadata = {
  metadataBase: new URL('https://vcdekho.com'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png'
  },
  manifest: '/site.webmanifest'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=location.pathname.replace(/\\/$/, '')||'/';var html='scrollable-page';if(p==='/'){html='home-page has-announcement';document.documentElement.style.background='#000';}document.documentElement.className=html;})();`
          }}
        />
        <link
          rel="preload"
          href="/assets/fonts/plus-jakarta-sans-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/assets/fonts/instrument-serif-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href="/css/fonts.css?v=1" />
        <link rel="stylesheet" href="/css/base.css?v=147" />
        <link rel="stylesheet" href="/css/hero.css?v=97" />
        <link rel="stylesheet" href="/css/ambient.css?v=98" />
        <link rel="stylesheet" href="/css/announcement.css?v=145" />
        <Script src="/js/nav.js?v=104" strategy="beforeInteractive" />
        <Script src="/js/auth.js?v=4" strategy="beforeInteractive" />
        <Script src="/js/directory-session.js?v=4" strategy="beforeInteractive" />
        <Script src="/js/site-paths.js?v=1" strategy="beforeInteractive" />
        <Script src="/js/person-email-unlock.js?v=10" strategy="beforeInteractive" />
        <Script src="/js/profile-page-boot.js?v=2" strategy="beforeInteractive" />
        <Script src="/app.js?v=98" strategy="beforeInteractive" />
      </head>
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=location.pathname.replace(/\\/$/, '')||'/';var html='scrollable-page';var body='scrollable-page';if(p==='/'){html='home-page has-announcement';body='has-announcement home-page';document.documentElement.style.background='#000';}else if(p==='/investors'){body='scrollable-page inv-page inv-dir-page inv-people-dir';}else if(p==='/funds'){body='scrollable-page inv-page inv-dir-page';}else if(/^\\/investors\\/[^/]+$/.test(p)){body='scrollable-page inv-page inv-person-profile inv-profile-ready';}else if(/^\\/funds\\/[^/]+$/.test(p)&&p!=='/funds/stages'&&p!=='/funds/themes'&&p!=='/funds/sectors'){body='scrollable-page inv-page inv-investor-profile inv-profile-ready';}document.documentElement.className=html;document.body.className=body;})();`
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: inlineDirectoryFiltersScript() }} />
        <ClientRuntime />
        {children}
      </body>
    </html>
  );
}
