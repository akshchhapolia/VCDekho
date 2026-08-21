import SiteHeader from '../components/SiteHeader';
import { DirectoryCss } from '../components/PageCss';
import { DirectoryBoot } from '../components/ClientRuntime';

function jsonScript(obj: unknown) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

export default function PeopleDirectoryPage({
  total,
  rowsHtml,
  bootstrap
}: {
  total: number;
  rowsHtml: string;
  bootstrap: unknown;
}) {
  const countLabel = Number(total).toLocaleString('en-IN') + ' investors';
  return (
    <>
      <DirectoryCss />
      <div className="app-container">
        <SiteHeader pathname="/investors" />
        <main className="hero-showcase inv-list-main">
          <div className="ambient-bg-wrapper inv-dir-ambient" aria-hidden="true">
            <div className="waitlist-bg">
              <div className="glow-orb orb-1"></div>
              <div className="glow-orb orb-2"></div>
            </div>
          </div>
          <div className="inv-dir-wrap">
            <header className="inv-dir-header">
              <div className="inv-dir-header-text">
                <h1>Investors</h1>
                <p className="inv-dir-meta">
                  <span id="ppl-count">{countLabel}</span>
                </p>
              </div>
              <button
                type="button"
                className="inv-dir-filters-toggle"
                id="ppl-filters-toggle"
                aria-expanded="false"
                aria-controls="ppl-dir-sidebar"
              >
                Filters
              </button>
            </header>
            <div className="inv-dir-layout">
              <aside className="inv-dir-sidebar" id="ppl-dir-sidebar">
                <div className="inv-dir-sidebar-head">
                  <span>Filters</span>
                  <button type="button" className="inv-dir-sidebar-close" id="ppl-filters-close" aria-label="Close filters">
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                  </button>
                </div>
                <label className="inv-dir-field">
                  <span>Search</span>
                  <input id="ppl-search" type="search" placeholder="Name, title, firm…" autoComplete="off" />
                </label>
                <div className="inv-dir-field">
                  <span>Role</span>
                  <div className="inv-dd" id="filter-role" data-placeholder="All roles"></div>
                </div>
                <div className="inv-dir-field">
                  <span>Firm type</span>
                  <div className="inv-dd" id="filter-company-type" data-placeholder="All firm types"></div>
                </div>
                <div className="inv-dir-field">
                  <span>Stage</span>
                  <div className="inv-dd" id="filter-stage" data-placeholder="All stages"></div>
                </div>
                <div className="inv-dir-field">
                  <span>Sector</span>
                  <div className="inv-dd" id="filter-sector" data-placeholder="All sectors"></div>
                </div>
                <div className="inv-dir-field">
                  <span>Thesis</span>
                  <div className="inv-dd" id="filter-thesis" data-placeholder="All theses"></div>
                </div>
                <div className="inv-dir-field">
                  <span>Ticket size</span>
                  <div className="inv-dd" id="filter-cheque" data-placeholder="Any ticket"></div>
                </div>
                <button type="button" id="ppl-clear" className="inv-dir-clear">
                  Clear filters
                </button>
              </aside>
              <div className="inv-dir-main">
                <div className="inv-dir-table-head" aria-hidden="true">
                  <span>Person</span>
                  <span>Firm</span>
                  <span>Email</span>
                  <span>Links</span>
                </div>
                <div
                  id="ppl-results"
                  className="inv-dir-results"
                  aria-busy="false"
                  dangerouslySetInnerHTML={{ __html: rowsHtml }}
                />
                <div className="inv-dir-pager" role="navigation" aria-label="Directory pages">
                  <button type="button" className="inv-dir-pager-btn" id="ppl-prev" disabled>
                    <span className="inv-dir-pager-arrow" aria-hidden="true">
                      ←
                    </span>
                    <span>Previous</span>
                  </button>
                  <p className="inv-dir-pager-status" id="ppl-page-label" aria-live="polite"></p>
                  <button type="button" className="inv-dir-pager-btn" id="ppl-next" disabled>
                    <span>Next</span>
                    <span className="inv-dir-pager-arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <div className="inv-dir-backdrop" id="ppl-filters-backdrop" hidden></div>
      <script
        type="application/json"
        id="ppl-prerender"
        dangerouslySetInnerHTML={{ __html: jsonScript(bootstrap) }}
      />
      <DirectoryBoot kind="people" />
    </>
  );
}
