'use client';

import { useEffect, useRef, useState } from 'react';
import { PAGE_SIZE } from './directory-shared';

/** Mobile: append the next page as the list approaches the viewport end. */
export function useInfiniteDirectory<T>(items: T[], resetKey: string, enabled: boolean) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [resetKey]);

  const visible = enabled ? items.slice(0, limit) : items;
  const hasMore = enabled && limit < items.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLimit((n) => n + PAGE_SIZE);
        }
      },
      { rootMargin: '800px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visible.length]);

  function loadMore() {
    setLimit((n) => n + PAGE_SIZE);
  }

  return { visible, hasMore, sentinelRef, loadMore };
}
