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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=location.pathname.replace(/\\/$/, '')||'/';var home=p==='/';document.documentElement.className=home?'home-page':'scrollable-page';if(home){document.documentElement.style.background='#000';}})();`
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
        <link rel="stylesheet" href="/css/base.css?v=146" />
        <link rel="stylesheet" href="/css/hero.css?v=97" />
        <link rel="stylesheet" href="/css/ambient.css?v=98" />
        <link rel="stylesheet" href="/css/announcement.css?v=145" />
        <link rel="stylesheet" href="/css/directory-list.css?v=145" />
        <link rel="stylesheet" href="/css/directory-profile.css?v=145" />
      </head>
      <body suppressHydrationWarning>
        <ClientRuntime />
        {children}
      </body>
    </html>
  );
}
