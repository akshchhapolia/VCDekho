'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function DocumentClass({
  htmlClass,
  bodyClass
}: {
  htmlClass: string;
  bodyClass: string;
}) {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.className = htmlClass;
    document.body.className = bodyClass;
  }, [htmlClass, bodyClass, pathname]);
  return null;
}
