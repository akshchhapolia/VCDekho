'use client';

import { useEffect, useRef, useState } from 'react';

export type InvOption = { id: string; label: string };

export default function InvDropdown({
  id,
  placeholder,
  options,
  value,
  onChange
}: {
  id?: string;
  placeholder: string;
  options: InvOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const items = [{ id: '', label: placeholder }, ...options];
  const match = items.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current || rootRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      className={'inv-dd' + (value ? ' has-value' : '') + (open ? ' is-open' : '')}
      id={id}
      data-placeholder={placeholder}
      ref={rootRef}
    >
      <button
        type="button"
        className="inv-dd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open ? 'true' : 'false'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inv-dd-value">{match ? match.label : placeholder}</span>
        <span className="inv-dd-caret" aria-hidden="true"></span>
      </button>
      <ul className="inv-dd-menu" role="listbox" hidden={!open}>
        {items.map((o) => {
          const selected = o.id === value;
          return (
            <li
              key={o.id || 'all'}
              role="option"
              className={'inv-dd-option' + (selected ? ' is-selected' : '')}
              data-value={o.id}
              aria-selected={selected ? 'true' : 'false'}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
            >
              <span className="inv-dd-check" aria-hidden="true"></span>
              <span className="inv-dd-label">{o.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
