import type { Metadata } from 'next';
import ClientRuntime from './components/ClientRuntime';

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
        <link rel="stylesheet" href="/css/base.css?v=146" />
      </head>
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=location.pathname.replace(/\\/$/, '')||'/';var html='scrollable-page';var body='scrollable-page';if(p==='/'){html='home-page';body='has-announcement home-page';document.documentElement.style.background='#000';}else if(p==='/investors'){body='scrollable-page inv-page inv-dir-page inv-people-dir';}else if(p==='/funds'){body='scrollable-page inv-page inv-dir-page';}else if(/^\\/investors\\/[^/]+$/.test(p)){body='scrollable-page inv-page inv-person-profile';}else if(/^\\/funds\\/[^/]+$/.test(p)&&p!=='/funds/stages'&&p!=='/funds/themes'&&p!=='/funds/sectors'){body='scrollable-page inv-page inv-investor-profile';}document.documentElement.className=html;document.body.className=body;})();`
          }}
        />
        <script src="/js/nav.js?v=102" defer />
        <script src="/js/auth.js?v=2" defer />
        <script src="/js/directory-session.js?v=4" defer />
        <script src="/js/site-paths.js?v=1" defer />
        <ClientRuntime />
        {children}
      </body>
    </html>
  );
}
