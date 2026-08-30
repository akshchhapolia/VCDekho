'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import DirLogo from '../components/directory/DirLogo';
import InvDropdown from '../components/directory/InvDropdown';
import UnlockEmailButton from '../components/directory/UnlockEmailButton';
import { useDirectoryChrome } from '../components/directory/useDirectoryChrome';
import { useDirectoryIndex } from '../components/directory/useDirectoryIndex';
import { useInfiniteDirectory } from '../components/directory/useInfiniteDirectory';
import {
  PAGE_SIZE,
  chequeOverlaps,
  formatCount,
  type ChequeRange,
  type FilterOpt
} from '../components/directory/directory-shared';

export type PersonCard = {
  slug: string;
  name: string;
  title?: string;
  company?: string;
  companySlug?: string;
  companyType?: string;
  companyLogo?: string | null;
  photo?: string | null;
  hasEmail?: boolean;
  linkedin?: string;
  twitter?: string;
  role?: string;
  stageIds?: string[];
  sectorIds?: string[];
  thesisThemeIds?: string[];
  chequeMin?: number | null;
  chequeMax?: number | null;
};

export type PeopleFilters = {
  roles?: FilterOpt[];
  companyTypes?: FilterOpt[];
  stages?: FilterOpt[];
  sectors?: FilterOpt[];
  thesisThemes?: FilterOpt[];
  chequeRanges?: ChequeRange[];
};

function PersonRow({ person }: { person: PersonCard }) {
  const href = '/investors/' + encodeURIComponent(person.slug);
  const links = [
    person.linkedin ? (
      <a
        key="li"
        className="inv-dir-inline-link"
        href={person.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        LinkedIn
      </a>
    ) : null,
    person.twitter ? (
      <a
        key="tw"
        className="inv-dir-inline-link"
        href={person.twitter}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        Twitter
      </a>
    ) : null
  ].filter(Boolean);

  return (
    <article className="inv-dir-row">
      <a
        className="inv-dir-row-hit"
        href={href}
        aria-label={person.name}
        data-analytics-event="dir_result_click"
        data-analytics-params={'{"directory":"people","slug":"' + person.slug + '"}'}
      />
      <div className="inv-dir-col inv-dir-col-fund">
        <span className="inv-dir-fund-mark">
          <DirLogo src={person.photo || person.companyLogo} name={person.name} round={Boolean(person.photo)} />
        </span>
        <span className="inv-dir-fund-text">
          <span className="inv-dir-type">{person.title || 'Investor'}</span>
          <span className="inv-dir-name">{person.name}</span>
        </span>
      </div>
      <div className="inv-dir-col inv-dir-col-stages">
        <span className="inv-dir-mobile-label">Firm</span>
        <span className="inv-dir-cell">
          {person.companySlug ? (
            <a
              className="inv-dir-inline-link"
              href={'/funds/' + encodeURIComponent(person.companySlug)}
              onClick={(e) => e.stopPropagation()}
            >
              {person.company}
            </a>
          ) : (
            person.company || '—'
          )}
        </span>
      </div>
      <div className="inv-dir-col inv-dir-col-sectors inv-dir-col-email">
        <span className="inv-dir-mobile-label">Email</span>
        <span className="inv-dir-cell">
          {person.hasEmail ? <UnlockEmailButton slug={person.slug} /> : <span className="inv-profile-empty">Not available</span>}
        </span>
      </div>
      <div className="inv-dir-col inv-dir-col-ticket">
        <span className="inv-dir-mobile-label">Links</span>
        <span className="inv-dir-ticket">
          {links.length
            ? links.reduce<ReactNode[]>((acc, node, i) => {
                if (i) acc.push(' · ');
                acc.push(node);
                return acc;
              }, [])
            : '—'}
        </span>
      </div>
    </article>
  );
}

export default function PeopleDirectoryBrowser({
  people,
  filters,
  indexUrl
}: {
  people: PersonCard[];
  filters: PeopleFilters;
  indexUrl: string;
}) {
  const { items: allPeople } = useDirectoryIndex<PersonCard>(people, indexUrl, 'people');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [stage, setStage] = useState('');
  const [sector, setSector] = useState('');
  const [thesis, setThesis] = useState('');
  const [cheque, setCheque] = useState('');
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const { filtersOpen, openFilters, closeFilters, isNarrowTitle } = useDirectoryChrome('ppl');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const typeMatch = companyType
      ? (filters.companyTypes || []).find((t) => t.id === companyType)
      : null;
    const chequeRange = cheque ? (filters.chequeRanges || []).find((r) => r.id === cheque) : null;
    const needsFirm = Boolean(stage || sector || thesis || cheque);

    return allPeople.filter((p) => {
      if (q) {
        const hay = (p.name + ' ' + (p.title || '') + ' ' + (p.company || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (typeMatch && p.companyType !== typeMatch.label) return false;
      if (role && p.role !== role) return false;
      if (needsFirm) {
        if (stage && !(p.stageIds || []).includes(stage)) return false;
        if (sector && !(p.sectorIds || []).includes(sector)) return false;
        if (thesis && !(p.thesisThemeIds || []).includes(thesis)) return false;
        if (cheque) {
          if (!chequeRange || !chequeOverlaps(p, chequeRange)) return false;
        }
      }
      return true;
    });
  }, [allPeople, filters, query, role, companyType, stage, sector, thesis, cheque]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, pageCount);
  const resetKey = [query, role, companyType, stage, sector, thesis, cheque].join('|');
  const infinite = useInfiniteDirectory(filtered, resetKey, isMobile);
  const pageItems = isMobile
    ? infinite.visible
    : filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, role, companyType, stage, sector, thesis, cheque]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.VCPersonEmailUnlock?.initEmailUnlock) {
      window.VCPersonEmailUnlock.initEmailUnlock(document.getElementById('ppl-results'));
    }
  }, [pageItems]);

  const active =
    (query.trim() ? 1 : 0) +
    (role ? 1 : 0) +
    (companyType ? 1 : 0) +
    (stage ? 1 : 0) +
    (sector ? 1 : 0) +
    (thesis ? 1 : 0) +
    (cheque ? 1 : 0);

  function clearFilters() {
    setQuery('');
    setRole('');
    setCompanyType('');
    setStage('');
    setSector('');
    setThesis('');
    setCheque('');
    setPage(1);
  }

  function goTo(next: number) {
    const clamped = Math.max(1, Math.min(pageCount, next));
    setPage(clamped);
    document.querySelector('.inv-dir-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const countLabel = formatCount(filtered.length) + ' investors';
  const title = isNarrowTitle ? 'Investors(' + formatCount(filtered.length) + ')' : 'Investors';

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
              <span id="ppl-count">{countLabel}</span>
            </p>
          </div>
          <button
            type="button"
            className={'inv-dir-filters-toggle' + (active ? ' has-active-filters' : '')}
            id="ppl-filters-toggle"
            aria-expanded="false"
            aria-controls="ppl-dir-sidebar"
            onClick={openFilters}
          >
            Filters
          </button>
        </header>
        <div className="inv-dir-layout">
          <aside className="inv-dir-sidebar" id="ppl-dir-sidebar">
            <div className="inv-dir-sidebar-head">
              <span>Filters</span>
              <button
                type="button"
                className="inv-dir-sidebar-close"
                id="ppl-filters-close"
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
                id="ppl-search"
                type="search"
                placeholder="Name, title, firm…"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="inv-dir-field">
              <span>Role</span>
              <InvDropdown
                id="filter-role"
                placeholder="All roles"
                options={filters.roles || []}
                value={role}
                onChange={setRole}
              />
            </div>
            <div className="inv-dir-field">
              <span>Firm type</span>
              <InvDropdown
                id="filter-company-type"
                placeholder="All firm types"
                options={filters.companyTypes || []}
                value={companyType}
                onChange={setCompanyType}
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
              <span>Thesis</span>
              <InvDropdown
                id="filter-thesis"
                placeholder="All theses"
                options={filters.thesisThemes || []}
                value={thesis}
                onChange={setThesis}
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
            <button type="button" id="ppl-clear" className="inv-dir-clear" onClick={clearFilters}>
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
            <div id="ppl-results" className="inv-dir-results" aria-busy="false">
              {filtered.length === 0 ? (
                <div className="inv-dir-empty-state">
                  <p className="inv-dir-empty-title">No matching investors</p>
                  <p className="inv-dir-empty-copy">
                    Try clearing filters or searching a different name, role, or firm.
                  </p>
                  <button type="button" className="inv-dir-empty-action" id="ppl-empty-clear" onClick={clearFilters}>
                    Clear filters
                  </button>
                </div>
              ) : (
                pageItems.map((person) => <PersonRow key={person.slug} person={person} />)
              )}
            </div>
            {filtered.length > 0 && isMobile && infinite.hasMore ? (
              <div className="inv-dir-pager" ref={infinite.sentinelRef}>
                <button
                  type="button"
                  className="inv-dir-pager-btn"
                  id="ppl-next"
                  onClick={infinite.loadMore}
                >
                  <span>Load more</span>
                </button>
              </div>
            ) : null}
            {filtered.length > 0 && !isMobile ? (
              <div className="inv-dir-pager" role="navigation" aria-label="Directory pages">
                <button
                  type="button"
                  className="inv-dir-pager-btn"
                  id="ppl-prev"
                  disabled={safePage <= 1}
                  onClick={() => goTo(safePage - 1)}
                >
                  <span className="inv-dir-pager-arrow" aria-hidden="true">
                    ←
                  </span>
                  <span>Previous</span>
                </button>
                <p className="inv-dir-pager-status" id="ppl-page-label" aria-live="polite">
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
                  id="ppl-next"
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
        id="ppl-filters-backdrop"
        hidden={!filtersOpen}
        onClick={closeFilters}
      ></div>
    </main>
  );
}
