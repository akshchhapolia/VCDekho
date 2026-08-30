'use client';

import { useEffect, useState } from 'react';

export function useDirectoryIndex<T>(initial: T[], url: string, key: string) {
  const [items, setItems] = useState<T[]>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(url, { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!live || !data) return;
        const next = data[key];
        if (Array.isArray(next) && next.length) setItems(next as T[]);
      })
      .catch(() => {})
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [url, key]);

  return { items, ready };
}
