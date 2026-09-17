import { documentClasses } from './app-routes';

/** Sync html/body classes before React paints the next route. */
export function applyDocumentClasses(
  pathname: string,
  options?: { keepNavOpen?: boolean }
) {
  if (typeof document === 'undefined') return;
  const next = documentClasses(pathname);
  const keepNav = options?.keepNavOpen === true;
  document.documentElement.className = next.html;
  document.body.className = next.body;
  if (keepNav) document.body.classList.add('nav-open');
  document.documentElement.style.background = next.home ? '#000' : '';
}
