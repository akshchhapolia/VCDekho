'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import DirLogo from '../components/directory/DirLogo';
import InvDropdown from '../components/directory/InvDropdown';
import { useDirectoryChrome } from '../components/directory/useDirectoryChrome';
import { useDirectoryIndex } from '../components/directory/useDirectoryIndex';
import {
  PAGE_SIZE,
  STAGE_GUIDE_IDS,
  chequeOverlaps,
  formatCount,
  joinList,
  type ChequeRange,
  type FilterOpt
} from '../components/directory/directory-shared';

export type FundCard = {
  slug: string;
  name: string;
  type?: string;
  typeId?: string;
  stages?: string[];
  stageIds?: string[];
  sectors?: string[];
  sectorIds?: string[];
  thesisThemes?: string[];
  thesisThemeIds?: string[];
  thesis?: string;
  chequeSize?: string;
  logo?: string | null;
  activelyDeploying?: boolean;
  chequeMin?: number | null;
  chequeMax?: number | null;
};

export type FundFilters = {
  sectors?: FilterOpt[];
  stages?: FilterOpt[];
  chequeRanges?: ChequeRange[];
  types?: FilterOpt[];
  thesisThemes?: FilterOpt[];
};

function LinkedLabels({
  labels,
  ids,
  hrefForId,
  limit
}: {
  labels?: string[];
  ids?: string[];
  hrefForId: (id: string) => string | null;
  limit: number;
}) {
  const items = (labels || []).slice(0, limit);
  if (!items.length) return '—';
  const more = (labels || []).length > items.length;
  const parts: ReactNode[] = items.map((label, i) => {
    const id = (ids || [])[i];
    const href = id ? hrefForId(id) : null;
    if (href) {
      return (
        <a
          key={id + label}
          className="inv-dir-inline-link"
          href={href}
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </a>
      );
    }
    return <span key={label + i}>{label}</span>;
  });
  const joined: ReactNode[] = [];
  parts.forEach((node, i) => {
    if (i) joined.push(', ');
    joined.push(node);
  });
  if (more) joined.push('…');
  return <>{joined}</>;
}

function FundRow({ inv, mobile }: { inv: FundCard; mobile: boolean }) {
  const href = '/funds/' + encodeURIComponent(inv.slug);
  const stages = (
    <LinkedLabels
      labels={inv.stages}
      ids={inv.stageIds}
      hrefForId={(id) => (STAGE_GUIDE_IDS[id] ? '/funds/stages/' + encodeURIComponent(id) : null)}
      limit={mobile ? 3 : 4}
    />
  );
  const thesis = (
    <LinkedLabels
      labels={inv.thesisThemes}
      ids={inv.thesisThemeIds}
      hrefForId={(id) => (id && id !== 'general' ? '/funds/themes/' + encodeURIComponent(id) : null)}
      limit={mobile ? 1 : 3}
    />
  );
  const sectorsText = joinList(inv.sectors, mobile ? 2 : 3);
  const sectorsThesis =
    [sectorsText || null, inv.thesisThemes && inv.thesisThemes.length ? thesis : null].filter(Boolean).length === 0 ? (
      '—'
    ) : (
      <>
        {sectorsText ? sectorsText : null}
        {sectorsText && inv.thesisThemes && inv.thesisThemes.length ? ' · ' : null}
        {inv.thesisThemes && inv.thesisThemes.length ? thesis : null}
      </>
    );

  return (
    <article className="inv-dir-row">
      <a
        className="inv-dir-row-hit"
        href={href}
        aria-label={inv.name}
        data-analytics-event="dir_result_click"
        data-analytics-params={'{"directory":"funds","slug":"' + inv.slug + '"}'}
      />
      <div className="inv-dir-col inv-dir-col-fund">
        <span className="inv-dir-fund-mark">
          <DirLogo src={inv.logo} name={inv.name} />
        </span>
        <span className="inv-dir-fund-text">
          <span className="inv-dir-type">
            {inv.type || 'Investor'}
            {inv.activelyDeploying ? (
              <span
                className="inv-dir-active-dot"
                title="Actively deploying — linked to a funding round in the last 6 months"
                aria-label="Actively deploying"
              ></span>
            ) : null}
          </span>
          <span className="inv-dir-name">{inv.name}</span>
        </span>
      </div>
      <div className="inv-dir-col inv-dir-col-stages">
        <span className="inv-dir-mobile-label">Stages</span>
        <span className="inv-dir-cell">{stages}</span>
      </div>
      <div className="inv-dir-col inv-dir-col-sectors">
        <span className="inv-dir-mobile-label">Sectors</span>
        <span className="inv-dir-cell">{sectorsThesis}</span>
      </div>
      <div className="inv-dir-col inv-dir-col-ticket">
        <span className="inv-dir-mobile-label">Ticket</span>
        <span className="inv-dir-ticket">{inv.chequeSize || 'Not listed'}</span>
      </div>
    </article>
  );
}

export default function FundsDirectoryBrowser({
  investors,
  filters,
  indexUrl
}: {
  investors: FundCard[];
  filters: FundFilters;
  indexUrl: string;
}) {
  const { items: allInvestors } = useDirectoryIndex<FundCard>(investors, indexUrl, 'investors');
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('');
  const [stage, setStage] = useState('');
  const [cheque, setCheque] = useState('');
  const [type, setType] = useState('');
  const [thesis, setThesis] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [mobile, setMobile] = useState(false);
  const { filtersOpen, openFilters, closeFilters, isNarrowTitle } = useDirectoryChrome('inv');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const chequeRange = cheque ? (filters.chequeRanges || []).find((r) => r.id === cheque) : null;
    return allInvestors.filter((i) => {
      if (activeOnly && !i.activelyDeploying) return false;
      if (q) {
        const hay = (i.name + ' ' + (i.thesis || '') + ' ' + (i.sectors || []).join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (sector && !(i.sectorIds || []).includes(sector)) return false;
      if (stage && !(i.stageIds || []).includes(stage)) return false;
      if (type && i.typeId !== type) return false;
      if (thesis && !(i.thesisThemeIds || []).includes(thesis)) return false;
      if (cheque) {
        if (!chequeRange || !chequeOverlaps(i, chequeRange)) return false;
      }
      return true;
    });
  }, [allInvestors, filters, query, sector, stage, cheque, type, thesis, activeOnly]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, sector, stage, cheque, type, thesis, activeOnly]);

  const active =
    (query.trim() ? 1 : 0) +
    (sector ? 1 : 0) +
    (stage ? 1 : 0) +
    (cheque ? 1 : 0) +
    (type ? 1 : 0) +
    (thesis ? 1 : 0) +
    (activeOnly ? 1 : 0);

  function clearFilters() {
    setQuery('');
    setSector('');
    setStage('');
    setCheque('');
    setType('');
    setThesis('');
    setActiveOnly(false);
    setPage(1);
  }

  function goTo(next: number) {
    const clamped = Math.max(1, Math.min(pageCount, next));
    setPage(clamped);
    document.querySelector('.inv-dir-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const countLabel = formatCount(filtered.length) + ' funds';
  const title = isNarrowTitle ? 'Funds(' + formatCount(filtered.length) + ')' : 'Funds';

  let guide: ReactNode = null;
  if (stage && STAGE_GUIDE_IDS[stage]) {
    const label = (filters.stages || []).find((s) => s.id === stage)?.label || stage;
    guide = (
      <>
        <span className="inv-dir-dot" aria-hidden="true">
          ·
        </span>
        <a className="inv-dir-guide-link" href={'/funds/stages/' + encodeURIComponent(stage)}>
          Open {label} guide →
        </a>
      </>
    );
  } else if (thesis && thesis !== 'general') {
    const label = (filters.thesisThemes || []).find((s) => s.id === thesis)?.label || thesis;
    guide = (
      <>
        <span className="inv-dir-dot" aria-hidden="true">
          ·
        </span>
        <a className="inv-dir-guide-link" href={'/funds/themes/' + encodeURIComponent(thesis)}>
          Open {label} guide →
        </a>
      </>
    );
  }

  return (
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
            <h1>{title}</h1>
            <p className="inv-dir-meta">
              <span id="inv-count">{countLabel}</span>
              <span id="inv-guide-slot">{guide}</span>
            </p>
          </div>
          <button
            type="button"
            className={'inv-dir-filters-toggle' + (active ? ' has-active-filters' : '')}
            id="inv-filters-toggle"
            aria-expanded="false"
            aria-controls="inv-dir-sidebar"
            onClick={openFilters}
          >
            Filters
          </button>
        </header>
        <div className="inv-dir-layout">
          <aside className="inv-dir-sidebar" id="inv-dir-sidebar">
            <div className="inv-dir-sidebar-head">
              <span>Filters</span>
              <button
                type="button"
                className="inv-dir-sidebar-close"
                id="inv-filters-close"
                aria-label="Close filters"
                onClick={closeFilters}
              >
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
              </button>
            </div>
            <label className="inv-dir-field">
              <span>Search</span>
              <input
                id="inv-search"
                type="search"
                placeholder="Fund, thesis, sector…"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="inv-dir-field">
              <span>Sector</span>
              <InvDropdown
                id="filter-sector"
                placeholder="All sectors"
                options={filters.sectors || []}
                value={sector}
                onChange={setSector}
              />
            </div>
            <div className="inv-dir-field">
              <span>Stage</span>
              <InvDropdown
                id="filter-stage"
                placeholder="All stages"
                options={filters.stages || []}
                value={stage}
                onChange={setStage}
              />
            </div>
            <div className="inv-dir-field">
              <span>Ticket size</span>
              <InvDropdown
                id="filter-cheque"
                placeholder="Any ticket"
                options={filters.chequeRanges || []}
                value={cheque}
                onChange={setCheque}
              />
            </div>
            <div className="inv-dir-field">
              <span>Company type</span>
              <InvDropdown
                id="filter-type"
                placeholder="All types"
                options={filters.types || []}
                value={type}
                onChange={setType}
              />
            </div>
            <div className="inv-dir-field">
              <span>Investment thesis</span>
              <InvDropdown
                id="filter-thesis"
                placeholder="All theses"
                options={filters.thesisThemes || []}
                value={thesis}
                onChange={setThesis}
              />
            </div>
            <label className="inv-dir-checkbox-field">
              <input
                type="checkbox"
                id="filter-active"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />
              <span>Actively deploying only</span>
            </label>
            <button type="button" id="inv-clear" className="inv-dir-clear" onClick={clearFilters}>
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
            <div id="inv-results" className="inv-dir-results" aria-busy="false">
              {filtered.length === 0 ? (
                <div className="inv-dir-empty-state">
                  <p className="inv-dir-empty-title">No matching funds</p>
                  <p className="inv-dir-empty-copy">
                    Try clearing filters or searching a different fund, sector, or stage.
                  </p>
                  <button type="button" className="inv-dir-empty-action" id="inv-empty-clear" onClick={clearFilters}>
                    Clear filters
                  </button>
                </div>
              ) : (
                pageItems.map((inv) => <FundRow key={inv.slug} inv={inv} mobile={mobile} />)
              )}
            </div>
            {filtered.length > 0 ? (
              <div className="inv-dir-pager" role="navigation" aria-label="Directory pages">
                <button
                  type="button"
                  className="inv-dir-pager-btn"
                  id="inv-prev"
                  disabled={safePage <= 1}
                  onClick={() => goTo(safePage - 1)}
                >
                  <span className="inv-dir-pager-arrow" aria-hidden="true">
                    ←
                  </span>
                  <span>Previous</span>
                </button>
                <p className="inv-dir-pager-status" id="inv-page-label" aria-live="polite">
                  <span className="inv-dir-pager-kicker">Page</span>
                  <span className="inv-dir-pager-current">{safePage}</span>
                  <span className="inv-dir-pager-sep" aria-hidden="true">
                    /
                  </span>
                  <span className="inv-dir-pager-total">{pageCount}</span>
                </p>
                <button
                  type="button"
                  className="inv-dir-pager-btn"
                  id="inv-next"
                  disabled={safePage >= pageCount}
                  onClick={() => goTo(safePage + 1)}
                >
                  <span>Next</span>
                  <span className="inv-dir-pager-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div
        className="inv-dir-backdrop"
        id="inv-filters-backdrop"
        hidden={!filtersOpen}
        onClick={closeFilters}
      ></div>
    </main>
  );
}
