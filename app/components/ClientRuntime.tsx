'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { documentClasses, isAppRoute } from '../../lib/app-routes';

declare global {
  interface Window {
    VCNav?: { close?: () => void; boot?: () => void };
    VCDirectorySession?: { wireNavAuth?: () => void };
    VCHero?: { release?: () => void };
  }
}

export default function ClientRuntime() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const routerReady = useRef(false);

  useEffect(() => {
    routerReady.current = true;
    applyDocumentClasses(pathname);
    if (window.VCNav && typeof window.VCNav.close === 'function') window.VCNav.close();
    if (window.VCDirectorySession && window.VCDirectorySession.wireNavAuth) {
      window.VCDirectorySession.wireNavAuth();
    }
    const t = window.setTimeout(() => prefetchVisibleAppLinks(router), 50);
    return () => window.clearTimeout(t);
  }, [pathname, router]);

  useEffect(() => {
    let cancelled = false;
    const idle =
      typeof window.requestIdleCallback === 'function'
        ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 2500 })
        : (cb: () => void) => window.setTimeout(cb, 400);
    idle(() => {
      if (!cancelled) {
        const s = document.createElement('script');
        s.src = '/js/analytics.js?v=2';
        s.async = true;
        document.body.appendChild(s);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!routerReady.current) return;
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

function applyDocumentClasses(pathname: string) {
  const next = documentClasses(pathname);
  document.documentElement.className = next.html;
  document.body.className = next.body;
  document.documentElement.style.background = next.home ? '#000' : '';
}

function prefetchVisibleAppLinks(router: { prefetch: (href: string) => void }) {
  const seen: Record<string, boolean> = {};
  document.querySelectorAll('a[href^="/investors/"], a[href^="/funds/"], a[href="/investors"], a[href="/funds"]').forEach((node) => {
    const href = node.getAttribute('href');
    if (!href || seen[href] || !isAppRoute(href.split('?')[0])) return;
    seen[href] = true;
    try {
      router.prefetch(href);
    } catch {
      /* ignore */
    }
  });
}
