import SiteHeader from '../components/SiteHeader';

function jsonScript(obj: unknown) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

export default function FundsDirectoryView({
  total,
  rowsHtml,
  bootstrap
}: {
  total: number;
  rowsHtml: string;
  bootstrap: unknown;
}) {
  const pageSize = 15;
  const pageCount = Math.max(1, Math.ceil(Number(total) / pageSize) || 1);
  const nextDisabled = Number(total) <= pageSize;
  return (
    <>
      <div className="app-container">
        <SiteHeader pathname="/funds" />
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
                <h1>Funds</h1>
                <p className="inv-dir-meta">
                  <span id="inv-count">Fetching funds</span>
                  <span id="inv-guide-slot"></span>
                </p>
              </div>
              <button
                type="button"
                className="inv-dir-filters-toggle"
                id="inv-filters-toggle"
                aria-expanded="false"
                aria-controls="inv-dir-sidebar"
              >
                Filters
              </button>
            </header>
            <div className="inv-dir-layout">
              <aside className="inv-dir-sidebar" id="inv-dir-sidebar">
                <div className="inv-dir-sidebar-head">
                  <span>Filters</span>
                  <button type="button" className="inv-dir-sidebar-close" id="inv-filters-close" aria-label="Close filters">
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                  </button>
                </div>
                <label className="inv-dir-field">
                  <span>Search</span>
                  <input id="inv-search" type="search" placeholder="Fund, thesis, sector…" autoComplete="off" />
                </label>
                <div className="inv-dir-field">
                  <span>Sector</span>
                  <div className="inv-dd" id="filter-sector" data-placeholder="All sectors"></div>
                </div>
                <div className="inv-dir-field">
                  <span>Stage</span>
                  <div className="inv-dd" id="filter-stage" data-placeholder="All stages"></div>
                </div>
                <div className="inv-dir-field">
                  <span>Ticket size</span>
                  <div className="inv-dd" id="filter-cheque" data-placeholder="Any ticket"></div>
                </div>
                <div className="inv-dir-field">
                  <span>Company type</span>
                  <div className="inv-dd" id="filter-type" data-placeholder="All types"></div>
                </div>
                <div className="inv-dir-field">
                  <span>Investment thesis</span>
                  <div className="inv-dd" id="filter-thesis" data-placeholder="All theses"></div>
                </div>
                <label className="inv-dir-checkbox-field">
                  <input type="checkbox" id="filter-active" />
                  <span>Actively deploying only</span>
                </label>
                <button type="button" id="inv-clear" className="inv-dir-clear">
                  Clear filters
                </button>
              </aside>
              <div className="inv-dir-main">
                <div className="inv-dir-table-head" aria-hidden="true">
                  <span>Fund</span>
                  <span>Stages</span>
                  <span>Sectors / Thesis</span>
                  <span>Ticket</span>
                </div>
                <div
                  id="inv-results"
                  className="inv-dir-results"
                  aria-busy="false"
                  dangerouslySetInnerHTML={{ __html: rowsHtml }}
                />
                <div className="inv-dir-pager" role="navigation" aria-label="Directory pages">
                  <button type="button" className="inv-dir-pager-btn" id="inv-prev" disabled>
                    <span className="inv-dir-pager-arrow" aria-hidden="true">
                      ←
                    </span>
                    <span>Previous</span>
                  </button>
                  <p className="inv-dir-pager-status" id="inv-page-label" aria-live="polite">
                    <span className="inv-dir-pager-kicker">Page</span>
                    <span className="inv-dir-pager-current">1</span>
                    <span className="inv-dir-pager-sep" aria-hidden="true">
                      /
                    </span>
                    <span className="inv-dir-pager-total">{pageCount}</span>
                  </p>
                  <button type="button" className="inv-dir-pager-btn" id="inv-next" disabled={nextDisabled}>
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
      <div className="inv-dir-backdrop" id="inv-filters-backdrop" hidden></div>
      <script
        type="application/json"
        id="inv-prerender"
        dangerouslySetInnerHTML={{ __html: jsonScript(bootstrap) }}
      />
    </>
  );
}
