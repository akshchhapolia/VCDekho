'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    VCNav?: { close?: () => void };
  }
}

const DRAWER_MQ = '(max-width: 960px)';
const TITLE_MQ = '(max-width: 768px)';

export function useDirectoryChrome(prefix: 'ppl' | 'inv') {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isNarrowTitle, setIsNarrowTitle] = useState(false);

  useEffect(() => {
    const titleMq = window.matchMedia(TITLE_MQ);
    const syncTitle = () => setIsNarrowTitle(titleMq.matches);
    syncTitle();
    titleMq.addEventListener('change', syncTitle);
    if (document.body.classList.contains('inv-dir-filters-open')) {
      setFiltersOpen(true);
    }
    return () => titleMq.removeEventListener('change', syncTitle);
  }, []);

  useEffect(() => {
    const sidebar = document.getElementById(prefix + '-dir-sidebar');
    const backdrop = document.getElementById(prefix + '-filters-backdrop');
    const toggle = document.getElementById(prefix + '-filters-toggle');
    const layout = document.querySelector('.inv-dir-layout');
    if (!sidebar) return;

    const isMobile = window.matchMedia(DRAWER_MQ).matches;
    sidebar.classList.toggle('is-open', filtersOpen);
    if (toggle) toggle.setAttribute('aria-expanded', filtersOpen ? 'true' : 'false');
    document.body.classList.toggle('inv-dir-filters-open', filtersOpen);
    if (backdrop) {
      backdrop.hidden = !filtersOpen;
      if (filtersOpen && isMobile) document.body.appendChild(backdrop);
    }
    if (filtersOpen && isMobile) {
      document.body.appendChild(sidebar);
      return;
    }
    const main = layout && layout.querySelector('.inv-dir-main');
    if (layout && sidebar.parentNode !== layout) {
      if (main) layout.insertBefore(sidebar, main);
      else layout.insertBefore(sidebar, layout.firstChild);
    }
  }, [filtersOpen, prefix]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFiltersOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function openFilters() {
    if (typeof window !== 'undefined' && window.VCNav && typeof window.VCNav.close === 'function') {
      window.VCNav.close();
    }
    setFiltersOpen(true);
  }

  return { filtersOpen, setFiltersOpen, openFilters, closeFilters: () => setFiltersOpen(false), isNarrowTitle };
}
