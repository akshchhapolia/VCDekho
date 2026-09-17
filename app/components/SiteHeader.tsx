import { normalizePath } from '../../lib/app-routes';
import MobileNav from './MobileNav';

export default function SiteHeader({ pathname = '/' }: { pathname?: string }) {
  const path = normalizePath(pathname);
  const isHome = path === '/';
  const investorsActive = path === '/investors' || path.startsWith('/investors/');
  const fundsActive = path === '/funds' || path.startsWith('/funds/');

  return (
    <header className="site-header">
      <a href="/" className="logo-container" id={isHome ? 'logo-link' : undefined}>
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
      </a>
      <MobileNav>
        <nav className="main-nav" id="navigation-bar">
          {isHome ? null : (
            <a href="/" className="nav-link">
              Home
            </a>
          )}
          <a href="/investors" className={'nav-link' + (investorsActive ? ' active' : '')}>
            Investors
          </a>
          <a href="/funds" className={'nav-link' + (fundsActive ? ' active' : '')}>
            Funds
          </a>
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
