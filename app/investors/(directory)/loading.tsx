export default function InvestorsDirectoryLoading() {
  return (
    <div className="app-container">
      <main className="hero-showcase inv-list-main">
        <div className="inv-dir-wrap">
          <header className="inv-dir-header">
            <div className="inv-dir-header-text">
              <h1>Investors</h1>
              <p className="inv-dir-meta">
                <span id="ppl-count">Loading investors</span>
              </p>
            </div>
          </header>
        </div>
      </main>
    </div>
  );
}
