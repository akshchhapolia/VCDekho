'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { applyDocumentClasses } from '../../lib/apply-document-classes';
import { isProfileRoute, isSoftNavRoute, normalizePath } from '../../lib/app-routes';

declare global {
  interface Window {
    VCNav?: { close?: () => void; boot?: () => void };
    VCDirectorySession?: { wireNavAuth?: () => void };
    VCProfilePage?: { boot?: () => void };
    VCPersonEmailUnlock?: { initEmailUnlock?: (root?: Element | Document | null) => void };
    VCProfileExtras?: { boot?: () => void };
    __vcClientReady?: boolean;
  }
}

export default function ClientRuntime() {
  const pathname = usePathname() || '/';
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    window.__vcClientReady = true;
    window.dispatchEvent(new Event('vc:client-ready'));
    const path = normalizePath(pathname);
    applyDocumentClasses(pathname, { keepNavOpen: false });
    if (window.VCProfilePage && typeof window.VCProfilePage.boot === 'function') {
      window.VCProfilePage.boot();
    }
    if (window.VCProfileExtras && typeof window.VCProfileExtras.boot === 'function') {
      window.VCProfileExtras.boot();
    }
    if (isProfileRoute(path)) window.scrollTo(0, 0);
    if (window.VCPersonEmailUnlock && typeof window.VCPersonEmailUnlock.initEmailUnlock === 'function') {
      window.VCPersonEmailUnlock.initEmailUnlock();
    }
    if (window.VCNav && typeof window.VCNav.boot === 'function') window.VCNav.boot();
    if (prevPath.current !== null && prevPath.current !== path && window.VCNav?.close) {
      window.VCNav.close();
    }
    prevPath.current = path;
    if (window.VCDirectorySession && window.VCDirectorySession.wireNavAuth) {
      window.VCDirectorySession.wireNavAuth();
    }
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const idle =
      typeof window.requestIdleCallback === 'function'
        ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 2500 })
        : (cb: () => void) => window.setTimeout(cb, 400);
    idle(() => {
      if (cancelled) return;
      if (!document.querySelector('script[src="/js/analytics.js?v=2"]')) {
        const analytics = document.createElement('script');
        analytics.src = '/js/analytics.js?v=2';
        analytics.async = true;
        document.body.appendChild(analytics);
      }
      if (!document.querySelector('script[src="/js/report.js?v=1"]')) {
        const report = document.createElement('script');
        report.src = '/js/report.js?v=1';
        report.async = true;
        document.body.appendChild(report);
      }
      if (!document.getElementById('vc-speculation')) {
        const spec = document.createElement('script');
        spec.id = 'vc-speculation';
        spec.type = 'speculationrules';
        spec.textContent = JSON.stringify({
          prefetch: [{ source: 'list', urls: ['/login'] }]
        });
        document.head.appendChild(spec);
      }
      fetch('/login', { credentials: 'same-origin' }).catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function warm(href: string) {
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const p = url.pathname + url.search;
      if (isSoftNavRoute(url.pathname)) return;
      fetch(p, { credentials: 'same-origin' }).catch(() => {});
    }
    function onPointerDown(e: PointerEvent) {
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) {
        return;
      }
      warm(href);
    }
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return null;
}
