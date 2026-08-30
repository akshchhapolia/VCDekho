'use client';

import { useEffect, useState } from 'react';

export default function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    window.VCNav = {
      close: () => setOpen(false),
      boot: () => {}
    };
    document.body.classList.toggle('nav-open', open);
    const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('navigation-bar');
    if (toggle) {
      toggle.classList.toggle('active', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if (nav) nav.classList.toggle('active', open);
    return () => document.body.classList.remove('nav-open');
  }, [open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Element | null;
      if (!t || !t.closest) return;
      if (t.closest('a.nav-link')) setOpen(false);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

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
          setOpen((v) => !v);
        }}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      {children}
      <button
        type="button"
        id="nav-backdrop"
        className="nav-backdrop"
        hidden={!open}
        aria-label="Close menu"
        aria-hidden={open ? 'false' : 'true'}
        onClick={() => setOpen(false)}
      />
    </>
  );
}
