import SiteHeader from './SiteHeader';

/** First paint while a profile HTML payload streams — never a blank header on black. */
export default function ProfileLoadingSkeleton({ pathname }: { pathname: string }) {
  return (
    <div className="app-container">
      <SiteHeader pathname={pathname} />
      <main className="hero-showcase inv-detail-main">
        <div className="inv-detail-wrap inv-profile-wrap">
          <div className="inv-profile-hero-row" id="overview">
            <section className="inv-profile-hero" aria-busy="true">
              <div className="inv-profile-hero-wash" aria-hidden="true"></div>
              <div className="inv-profile-hero-inner">
                <div className="inv-profile-hero-copy">
                  <span className="inv-profile-boot-bar inv-profile-boot-bar--title" />
                  <span className="inv-profile-boot-bar inv-profile-boot-bar--lead" />
                  <span className="inv-profile-boot-bar inv-profile-boot-bar--lead-short" />
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
