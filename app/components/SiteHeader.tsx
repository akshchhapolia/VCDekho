'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isAppRoute } from '../../lib/app-routes';

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

export default function SiteHeader() {
  const pathname = usePathname() || '/';
  const isHome = pathname === '/';
  const investorsActive = pathname === '/investors' || pathname.startsWith('/investors/');
  const fundsActive = pathname === '/funds' || pathname.startsWith('/funds/');

  return (
    <header className="site-header">
      <NavHref
        href="/"
        className="logo-container"
        id={isHome ? 'logo-link' : undefined}
      >
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
      <button className="nav-toggle" id="menu-toggle" aria-label="Toggle navigation menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
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
        <a href="/login" className="nav-link" id="nav-auth-link">
          Log in
        </a>
      </nav>
    </header>
  );
}
