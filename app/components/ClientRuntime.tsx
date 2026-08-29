'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { documentClasses, isAppRoute, isSoftNavRoute, normalizePath } from '../../lib/app-routes';

declare global {
  interface Window {
    VCNav?: { close?: () => void; boot?: () => void };
    VCDirectorySession?: { wireNavAuth?: () => void };
    VCHero?: { release?: () => void };
    VCProfilePage?: { boot?: () => void };
    VCFundsDir?: { boot?: () => void; destroy?: () => void };
    VCPeopleDir?: { boot?: () => void; destroy?: () => void };
    VCPersonEmailUnlock?: { initEmailUnlock?: (root?: Element | Document | null) => void };
  }
}

export default function ClientRuntime() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const routerReady = useRef(false);
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    routerReady.current = true;
    applyDocumentClasses(pathname);
    if (window.VCProfilePage && typeof window.VCProfilePage.boot === 'function') {
      window.VCProfilePage.boot();
    }
    const path = normalizePath(pathname);
    if (path === '/funds' && window.VCFundsDir && typeof window.VCFundsDir.boot === 'function') {
      window.VCFundsDir.boot();
    }
    if (path === '/investors' && window.VCPeopleDir && typeof window.VCPeopleDir.boot === 'function') {
      window.VCPeopleDir.boot();
    }
    if (window.VCPersonEmailUnlock && typeof window.VCPersonEmailUnlock.initEmailUnlock === 'function') {
      window.VCPersonEmailUnlock.initEmailUnlock();
    }
    if (window.VCNav && typeof window.VCNav.boot === 'function') window.VCNav.boot();
    // Only close on a real route change. Calling close() on first hydration
    // slams shut a menu the user already opened.
    if (prevPath.current !== null && prevPath.current !== path && window.VCNav && typeof window.VCNav.close === 'function') {
      window.VCNav.close();
    }
    prevPath.current = path;
    if (window.VCDirectorySession && window.VCDirectorySession.wireNavAuth) {
      window.VCDirectorySession.wireNavAuth();
    }
    const t = window.setTimeout(() => prefetchVisibleLinks(router, path), 50);
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
      if (!isSoftNavRoute(url.pathname)) return;
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
  const navOpen = document.body.classList.contains('nav-open');
  document.documentElement.className = next.html;
  document.body.className = next.body;
  if (navOpen) document.body.classList.add('nav-open');
  document.documentElement.style.background = next.home ? '#000' : '';
}

function prefetchVisibleLinks(router: { prefetch: (href: string) => void }, currentPath: string) {
  const seen: Record<string, boolean> = {};
  const onDirectory = currentPath === '/investors' || currentPath === '/funds';

  if (
    document.querySelector('[data-unlock-email][href^="/login"]') &&
    !document.querySelector('link[data-vc-prefetch="/login"]')
  ) {
    const login = document.createElement('link');
    login.rel = 'prefetch';
    login.href = '/login';
    login.setAttribute('data-vc-prefetch', '/login');
    document.head.appendChild(login);
  }

  if (onDirectory && !document.querySelector('link[data-vc-prefetch="directory-profile.css"]')) {
    const css = document.createElement('link');
    css.rel = 'preload';
    css.as = 'style';
    css.href = '/css/directory-profile.css?v=148';
    css.setAttribute('data-vc-prefetch', 'directory-profile.css');
    document.head.appendChild(css);
  }

  document
    .querySelectorAll('a[href^="/investors/"], a[href^="/funds/"], a[href="/investors"], a[href="/funds"]')
    .forEach((node) => {
      const href = node.getAttribute('href');
      if (!href || seen[href]) return;
      const path = href.split('?')[0];
      if (!isAppRoute(path)) return;
      seen[href] = true;
      if (isSoftNavRoute(path)) {
        try {
          router.prefetch(href);
        } catch {
          /* ignore */
        }
        return;
      }
      if (!document.querySelector(`link[data-vc-prefetch="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        link.setAttribute('data-vc-prefetch', href);
        document.head.appendChild(link);
      }
    });
}
