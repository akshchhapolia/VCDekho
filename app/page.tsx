import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from './components/SiteHeader';
import { HomeBoot } from './components/ClientRuntime';

export const metadata: Metadata = {
  title: "VC Dekho - Discover Investors from India behind India's Fastest Growing Startups.",
  description:
    "Discover active venture capital investors, funding trends, and insights behind India's fastest-growing startups. Built for founders, operators, analysts, and builders.",
  alternates: { canonical: 'https://vcdekho.com/' },
  openGraph: {
    title: "VC Dekho - Discover Investors from India behind India's Fastest Growing Startups.",
    description: 'Discover active venture capital investors, funding trends, and insights behind India',
    url: 'https://vcdekho.com/',
    type: 'website',
    images: ['https://vcdekho.com/assets/logoforvc.png']
  }
};

export const revalidate = 86400;

export default function HomePage() {
  return (
    <>
      <div className="ambient-bg-wrapper home-ambient" aria-hidden="true">
        <div className="waitlist-bg">
          <div className="glow-orb orb-1"></div>
          <div className="glow-orb orb-2"></div>
          <div className="glow-orb orb-3"></div>
        </div>
      </div>

      <div className="announcement-strip">
        <div className="announcement-wrapper">
          <span className="announcement-tag">NEW</span>
          <span className="announcement-text">Raising VC Funding in India: The Complete 2026 Guide</span>
          <a href="/guide/raising-vc-funding-india" className="announcement-cta">
            <span>Read Guide</span>
            <span className="announcement-arrow">→</span>
          </a>
        </div>
      </div>

      <div className="app-container">
        <SiteHeader pathname="/" />
        <main className="hero-showcase" id="main-viewport">
          <video
            loop
            muted
            playsInline
            className="hero-bg"
            id="hero-background-media"
            preload="none"
            poster="/assets/sand_bg.webp"
            style={{ backgroundColor: '#0b0b0d' }}
          >
            <source src="/assets/mainvideo.v2.mp4" type="video/mp4" />
          </video>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){var skip=window.matchMedia('(max-width:992px)').matches||window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(!skip)return;var v=document.getElementById('hero-background-media');if(!v)return;Array.prototype.forEach.call(v.querySelectorAll('source'),function(s){s.removeAttribute('src');s.remove();});v.removeAttribute('src');try{v.load();}catch(e){}})();`
            }}
          />
          <div className="hero-bg-fallback" id="hero-bg-fallback"></div>
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <div className="hero-headline-container">
              <h1 className="hero-title" id="primary-heading">
                Find Your
                <br className="mweb-title-break" />
                <span className="highlight-text">Next Investor</span>
              </h1>
              <p className="hero-tagline hero-sub-tagline" id="support-tagline">
                Discover venture capital firms, angel investors, and startup funds across India. Research
                portfolios, sectors, and funding activity.
              </p>
            </div>
            <div className="hero-tagline-container">
              <p className="hero-tagline" id="bottom-tagline">
                Built for founders, operators, analysts, and curious builders exploring India&apos;s startup
                ecosystem.
              </p>
            </div>
            <article className="trend-card" id="ai-trend-card">
              <h2 className="trend-card-title">1600+ Investors. One Search.</h2>
              <p className="trend-card-desc">
                Discover venture capital firms, angel investors, and startup funds investing across India.
              </p>
              <p className="trend-card-note">Free account - browse 1600+ investors</p>
              <Link className="trend-card-btn" id="explore-btn" href="/investors" prefetch>
                Start Exploring
              </Link>
            </article>
          </div>
        </main>
      </div>

      <Link href="/investors" prefetch className="mobile-sticky-cta" id="mobile-sticky-cta">
        Browse 1600+ investors <span aria-hidden="true">→</span>
      </Link>
      <HomeBoot />
    </>
  );
}
