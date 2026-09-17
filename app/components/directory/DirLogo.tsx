'use client';

import { useState } from 'react';

function initialsFor(name: string) {
  const parts = String(name || '')
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function DirLogo({
  src,
  name,
  round
}: {
  src?: string | null;
  name: string;
  round?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const initials = initialsFor(name);
  if (!src || broken) {
    return (
      <span className="inv-dir-logo-fallback is-visible" aria-hidden="true">
        {initials}
      </span>
    );
  }
  return (
    <>
      <img
        className="inv-dir-logo"
        src={src}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        decoding="async"
        style={round ? { borderRadius: '50%', objectFit: 'cover' } : undefined}
        onError={() => setBroken(true)}
      />
      <span className="inv-dir-logo-fallback" aria-hidden="true">
        {initials}
      </span>
    </>
  );
}
