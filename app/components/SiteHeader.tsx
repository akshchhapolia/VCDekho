import Link from 'next/link';
import { isAppRoute, normalizePath } from '../../lib/app-routes';
import MobileNav from './MobileNav';

function NavHref({
  href,
  className,
  id,
  children,
  prefetch
}: {
  href: string;
  className?: string;
  id?: string;
  children: React.ReactNode;
  prefetch?: boolean;
}) {
  if (isAppRoute(href)) {
    return (
      <Link href={href} prefetch={prefetch !== false} className={className} id={id}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} id={id}>
      {children}
    </a>
  );
}

export default function SiteHeader({ pathname = '/' }: { pathname?: string }) {
  const path = normalizePath(pathname);
  const isHome = path === '/';
  const investorsActive = path === '/investors' || path.startsWith('/investors/');
  const fundsActive = path === '/funds' || path.startsWith('/funds/');

  return (
    <header className="site-header">
      <NavHref href="/" className="logo-container" id={isHome ? 'logo-link' : undefined}>
        <img
          src="/assets/logoforvc.png"
          alt={isHome ? '' : 'VC Dekho Logo'}
          className="logo-img"
          width={220}
          height={204}
          id={isHome ? 'logo-image' : undefined}
          fetchPriority="high"
        />
        {isHome ? (
          <span className="logo-wordmark" aria-hidden="true">
            VC Dekho
          </span>
        ) : null}
      </NavHref>
      <MobileNav>
        <nav className="main-nav" id="navigation-bar">
          {isHome ? null : (
            <NavHref href="/" className="nav-link">
              Home
            </NavHref>
          )}
          <NavHref href="/investors" className={'nav-link' + (investorsActive ? ' active' : '')}>
            Investors
          </NavHref>
          <NavHref href="/funds" className={'nav-link' + (fundsActive ? ' active' : '')}>
            Funds
          </NavHref>
          <a href="/buzz" className="nav-link">
            Founder Buzz
          </a>
          <a href="/blog" className="nav-link">
            Blog
          </a>
          <a href="/news" className="nav-link">
            News
          </a>
          <a
            href={'/login?next=' + encodeURIComponent(path === '/login' ? '/funds' : path)}
            className="nav-link"
            id="nav-auth-link"
          >
            Log in
          </a>
        </nav>
      </MobileNav>
    </header>
  );
}
