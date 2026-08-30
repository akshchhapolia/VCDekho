'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    VCNav?: { close?: () => void; boot?: () => void };
  }
}

const HTML_PREFETCH = ['/news', '/blog', '/buzz', '/login'];

function closeNavDom() {
  document.body.classList.remove('nav-open');
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('navigation-bar');
  if (toggle) {
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
  }
  if (nav) nav.classList.remove('active');
}

export default function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function closeNow() {
    closeNavDom();
    setOpen(false);
  }

  useEffect(() => {
    window.VCNav = {
      close: closeNow,
      boot: () => {}
    };
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeNow();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
    const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('navigation-bar');
    if (toggle) {
      toggle.classList.toggle('active', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if (nav) nav.classList.toggle('active', open);
    if (open) {
      router.prefetch('/investors');
      router.prefetch('/funds');
      router.prefetch('/');
      HTML_PREFETCH.forEach((href) => {
        fetch(href, { credentials: 'same-origin' }).catch(() => {});
      });
    }
    return () => document.body.classList.remove('nav-open');
  }, [open, router]);

  return (
    <>
      <button
        type="button"
        className="nav-toggle"
        id="menu-toggle"
        aria-label="Toggle navigation menu"
        aria-controls="navigation-bar"
        aria-expanded={open ? 'true' : 'false'}
        onClick={() => {
          if (!window.matchMedia('(max-width: 768px)').matches) return;
          if (open) closeNow();
          else setOpen(true);
        }}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div
        onPointerDownCapture={(e) => {
          const t = e.target as Element | null;
          if (t && t.closest && t.closest('a.nav-link')) closeNow();
        }}
      >
        {children}
      </div>
      <button
        type="button"
        id="nav-backdrop"
        className="nav-backdrop"
        hidden={!open}
        aria-label="Close menu"
        aria-hidden={open ? 'false' : 'true'}
        onClick={() => closeNow()}
      />
    </>
  );
}
