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

// Chromium (incl. Android Chrome). Safari ignores this; NAV_WARM_SCRIPT covers it.
const NAV_SPECULATION_RULES = JSON.stringify({
  prefetch: [{ urls: ['/login'], eagerness: 'immediate' }],
  prerender: [
    { urls: ['/login'], eagerness: 'eager' },
    { where: { href_matches: '/investors/*' }, eagerness: 'moderate' },
    {
      where: {
        and: [
          { href_matches: '/funds/*' },
          { not: { href_matches: '/funds/stages' } },
          { not: { href_matches: '/funds/stages/*' } },
          { not: { href_matches: '/funds/themes' } },
          { not: { href_matches: '/funds/themes/*' } },
          { not: { href_matches: '/funds/sectors' } },
          { not: { href_matches: '/funds/sectors/*' } }
        ]
      },
      eagerness: 'moderate'
    }
  ]
});

const DOCUMENT_CLASSES_BOOT = `(function(){var p=location.pathname.replace(/\\/$/, '')||'/';var html='scrollable-page';var body='scrollable-page';if(p==='/'){html='home-page has-announcement';body='has-announcement home-page';document.documentElement.style.background='#000';}else if(p==='/investors'){body='scrollable-page inv-page inv-dir-page inv-people-dir';}else if(p==='/funds'){body='scrollable-page inv-page inv-dir-page';}else if(/^\\/investors\\/[^/]+$/.test(p)){body='scrollable-page inv-page inv-person-profile inv-profile-ready';}else if(/^\\/funds\\/[^/]+$/.test(p)&&p!=='/funds/stages'&&p!=='/funds/themes'&&p!=='/funds/sectors'){body='scrollable-page inv-page inv-investor-profile inv-profile-ready';}document.documentElement.className=html;document.body.className=body;})();`;

// pointerdown starts the HTML fetch before click; phones often ignore rel=prefetch.
const NAV_WARM_SCRIPT = `(function(){var warmed=Object.create(null);function dest(href){try{var u=new URL(href,location.origin);if(u.origin!==location.origin)return'';return u.pathname.replace(/\\/$/,'')||'/';}catch(e){return'';}}function isTarget(p){return p==='/login'||/^\\/investors\\/[^/]+$/.test(p)||(/^\\/funds\\/[^/]+$/.test(p)&&p!=='/funds/stages'&&p!=='/funds/themes'&&p!=='/funds/sectors');}function warm(href){var p=dest(href);if(!p||!isTarget(p)||warmed[p])return;warmed[p]=1;fetch(p,{credentials:'same-origin'}).catch(function(){});if(p==='/login'){fetch('/login.js?v=113',{credentials:'same-origin'}).catch(function(){});fetch('/js/supabase.min.js?v=1',{credentials:'same-origin'}).catch(function(){});}}function fromEvent(e){var t=e.target;if(!t||!t.closest)return;var a=t.closest('a[href]');if(!a||a.getAttribute('target')==='_blank'||a.hasAttribute('download'))return;var href=a.getAttribute('href');if(!href||href.charAt(0)==='#'||href.indexOf('mailto:')===0)return;warm(href);}document.addEventListener('pointerdown',fromEvent,true);document.addEventListener('touchstart',fromEvent,{capture:true,passive:true});function idleLogin(){if(document.querySelector('[data-unlock-email][href^="/login"]'))warm('/login');}if(typeof requestIdleCallback==='function')requestIdleCallback(idleLogin,{timeout:1800});else setTimeout(idleLogin,400);})();`;

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
        <script type="speculationrules" dangerouslySetInnerHTML={{ __html: NAV_SPECULATION_RULES }} />
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
        <link rel="stylesheet" href="/css/base.css?v=151" />
        <link rel="stylesheet" href="/css/hero.css?v=97" />
        <link rel="stylesheet" href="/css/ambient.css?v=98" />
        <link rel="stylesheet" href="/css/announcement.css?v=145" />
        <Script src="/js/nav.js?v=104" strategy="beforeInteractive" />
        <Script src="/js/auth.js?v=6" strategy="afterInteractive" />
        <Script src="/js/directory-session.js?v=5" strategy="afterInteractive" />
        <Script src="/js/site-paths.js?v=1" strategy="afterInteractive" />
        <Script src="/js/report.js?v=1" strategy="afterInteractive" />
        <Script src="/js/person-email-unlock.js?v=15" strategy="afterInteractive" />
        <Script src="/js/profile-page-boot.js?v=2" strategy="afterInteractive" />
        <Script src="/app.js?v=98" strategy="afterInteractive" />
      </head>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: DOCUMENT_CLASSES_BOOT }} />
        <script dangerouslySetInnerHTML={{ __html: NAV_WARM_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: inlineDirectoryFiltersScript() }} />
        <ClientRuntime />
        {children}
      </body>
    </html>
  );
}
