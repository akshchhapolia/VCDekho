'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAppRoute } from '../../lib/app-routes';

function loadScript(src: string) {
  const existing = document.querySelector('script[data-vc-src="' + src + '"]') as HTMLScriptElement | null;
  if (existing) {
    if (existing.getAttribute('data-loaded') === '1') return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(src)), { once: true });
    });
  }
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.setAttribute('data-vc-src', src);
    s.onload = () => {
      s.setAttribute('data-loaded', '1');
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.body.appendChild(s);
  });
}

declare global {
  interface Window {
    VCNav?: { close?: () => void; boot?: () => void };
    VCDirectorySession?: { wireNavAuth?: () => void };
    VCPeopleDir?: { boot?: () => void };
    VCFundsDir?: { boot?: () => void };
    VCPersonEmailUnlock?: { initEmailUnlock?: (root?: Document | HTMLElement) => void };
    VCApp?: { boot?: () => void };
    VCHero?: { release?: () => void };
    VCProfilePage?: { boot?: () => void };
  }
}

export default function ClientRuntime() {
  const pathname = usePathname() || '/';
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadScript('/js/analytics.js?v=2');
      await loadScript('/js/nav.js?v=102');
      await loadScript('/js/auth.js?v=2');
      await loadScript('/js/directory-session.js?v=4');
      await loadScript('/js/site-paths.js?v=1');
      if (cancelled) return;
      if (window.VCNav && typeof window.VCNav.boot === 'function') window.VCNav.boot();
      if (window.VCDirectorySession && window.VCDirectorySession.wireNavAuth) {
        window.VCDirectorySession.wireNavAuth();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      const target = e.target as Element | null;
      if (!target) return;
      const a = target.closest('a');
      if (!a) return;
      if (a.getAttribute('target') === '_blank' || a.hasAttribute('download')) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) {
        return;
      }
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (!isAppRoute(url.pathname)) return;
      e.preventDefault();
      if (window.VCNav && typeof window.VCNav.close === 'function') window.VCNav.close();
      if (window.VCHero && typeof window.VCHero.release === 'function') window.VCHero.release();
      router.push(url.pathname + url.search + url.hash);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [router]);

  return null;
}

export function DirectoryBoot({ kind }: { kind: 'people' | 'funds' }) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadScript('/js/auth.js?v=2');
      await loadScript('/js/site-paths.js?v=1');
      if (kind === 'people') {
        await loadScript('/js/person-email-unlock.js?v=8');
        await loadScript('/js/people.js?v=122');
        if (!cancelled) {
          window.VCPeopleDir && window.VCPeopleDir.boot && window.VCPeopleDir.boot();
          window.VCPersonEmailUnlock &&
            window.VCPersonEmailUnlock.initEmailUnlock &&
            window.VCPersonEmailUnlock.initEmailUnlock();
        }
      } else {
        await loadScript('/investors/investors.js?v=114');
        if (!cancelled) {
          window.VCFundsDir && window.VCFundsDir.boot && window.VCFundsDir.boot();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);
  return null;
}

export function HomeBoot() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadScript('/app.js?v=98');
      if (!cancelled && window.VCApp && window.VCApp.boot) window.VCApp.boot();
    })();
    return () => {
      cancelled = true;
      if (window.VCHero && window.VCHero.release) window.VCHero.release();
    };
  }, []);
  return null;
}

export function ProfileBoot() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadScript('/js/auth.js?v=2');
      await loadScript('/js/person-email-unlock.js?v=8');
      await loadScript('/investors/lazy-portfolio-logos.js?v=1');
      await loadScript('/investors/portfolio-section.js?v=4');
      await loadScript('/investors/profile-sticky.js?v=6');
      await loadScript('/js/profile-page-boot.js?v=1');
      if (cancelled) return;
      if (window.VCPersonEmailUnlock && window.VCPersonEmailUnlock.initEmailUnlock) {
        window.VCPersonEmailUnlock.initEmailUnlock();
      }
      if (window.VCProfilePage && window.VCProfilePage.boot) window.VCProfilePage.boot();
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
