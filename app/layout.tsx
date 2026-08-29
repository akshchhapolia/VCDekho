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
        <link rel="stylesheet" href="/css/base.css?v=149" />
        <link rel="stylesheet" href="/css/hero.css?v=97" />
        <link rel="stylesheet" href="/css/ambient.css?v=98" />
        <link rel="stylesheet" href="/css/announcement.css?v=145" />
        <Script src="/js/nav.js?v=104" strategy="beforeInteractive" />
        <Script src="/js/auth.js?v=6" strategy="beforeInteractive" />
        <Script src="/js/directory-session.js?v=5" strategy="beforeInteractive" />
        <Script src="/js/site-paths.js?v=1" strategy="beforeInteractive" />
        <Script src="/js/report.js?v=1" strategy="beforeInteractive" />
        <Script src="/js/person-email-unlock.js?v=14" strategy="beforeInteractive" />
        <Script src="/js/profile-page-boot.js?v=2" strategy="beforeInteractive" />
        <Script src="/app.js?v=98" strategy="beforeInteractive" />
      </head>
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=location.pathname.replace(/\\/$/, '')||'/';var html='scrollable-page';var body='scrollable-page';if(p==='/'){html='home-page has-announcement';body='has-announcement home-page';document.documentElement.style.background='#000';}else if(p==='/investors'){body='scrollable-page inv-page inv-dir-page inv-people-dir';}else if(p==='/funds'){body='scrollable-page inv-page inv-dir-page';}else if(/^\\/investors\\/[^/]+$/.test(p)){body='scrollable-page inv-page inv-person-profile inv-profile-ready';}else if(/^\\/funds\\/[^/]+$/.test(p)&&p!=='/funds/stages'&&p!=='/funds/themes'&&p!=='/funds/sectors'){body='scrollable-page inv-page inv-investor-profile inv-profile-ready';}document.documentElement.className=html;document.body.className=body;function isProfilePath(path){return /^\\/investors\\/[^/]+$/.test(path)||(/^\\/funds\\/[^/]+$/.test(path)&&path!=='/funds/stages'&&path!=='/funds/themes'&&path!=='/funds/sectors');}document.addEventListener('click',function(e){if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button)return;var t=e.target;if(!t||!t.closest)return;var a=t.closest('a');if(!a||a.getAttribute('target')==='_blank'||a.hasAttribute('download'))return;var href=a.getAttribute('href');if(!href||href.charAt(0)==='#'||href.indexOf('mailto:')===0)return;var u;try{u=new URL(href,location.origin);}catch(err){return;}if(u.origin!==location.origin)return;var next=u.pathname.replace(/\\/$/, '')||'/';if(isProfilePath(next)&&next!==p)document.documentElement.classList.add('vc-nav-pending');},true);window.addEventListener('pageshow',function(){document.documentElement.classList.remove('vc-nav-pending');});})();`
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: inlineDirectoryFiltersScript() }} />
        <ClientRuntime />
        {children}
      </body>
    </html>
  );
}
