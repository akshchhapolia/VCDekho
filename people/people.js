(function () {
  const PAGE_SIZE = 15;
  const LOCK_ICON =
    '<svg class="inv-email-unlock-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';
  const state = {
    q: '',
    role: '',
    companyType: '',
    stage: '',
    sector: '',
    thesis: '',
    cheque: '',
    offset: 0,
    total: 0,
    filters: null
  };

  const els = {
    search: document.getElementById('ppl-search'),
    clear: document.getElementById('ppl-clear'),
    count: document.getElementById('ppl-count'),
    results: document.getElementById('ppl-results'),
    prev: document.getElementById('ppl-prev'),
    next: document.getElementById('ppl-next'),
    pageLabel: document.getElementById('ppl-page-label'),
    filtersToggle: document.getElementById('ppl-filters-toggle'),
    filtersClose: document.getElementById('ppl-filters-close'),
    sidebar: document.getElementById('ppl-dir-sidebar'),
    backdrop: document.getElementById('ppl-filters-backdrop')
  };

  const dropdowns = {};

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function closeAllDropdowns(except) {
    Object.keys(dropdowns).forEach((key) => {
      if (dropdowns[key] !== except) dropdowns[key].close();
    });
  }

  function createDropdown(root, key) {
    const placeholder = root.getAttribute('data-placeholder') || 'All';
    root.innerHTML =
      '<button type="button" class="inv-dd-trigger" aria-haspopup="listbox" aria-expanded="false">' +
        '<span class="inv-dd-value">' + esc(placeholder) + '</span>' +
        '<span class="inv-dd-caret" aria-hidden="true"></span>' +
      '</button>' +
      '<ul class="inv-dd-menu" role="listbox" hidden></ul>';

    const trigger = root.querySelector('.inv-dd-trigger');
    const valueEl = root.querySelector('.inv-dd-value');
    const menu = root.querySelector('.inv-dd-menu');
    let options = [{ id: '', label: placeholder }];
    let value = '';
    let onChange = null;

    function renderMenu() {
      menu.innerHTML = options.map((o) => {
        const selected = o.id === value;
        return (
          '<li role="option" class="inv-dd-option' + (selected ? ' is-selected' : '') + '" data-value="' + esc(o.id) + '" aria-selected="' + (selected ? 'true' : 'false') + '">' +
            '<span class="inv-dd-check" aria-hidden="true"></span>' +
            '<span class="inv-dd-label">' + esc(o.label) + '</span>' +
          '</li>'
        );
      }).join('');
    }

    function syncLabel() {
      const match = options.find((o) => o.id === value);
      valueEl.textContent = match ? match.label : placeholder;
      root.classList.toggle('has-value', Boolean(value));
    }

    function open() {
      closeAllDropdowns(api);
      root.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      menu.hidden = false;
    }

    function close() {
      root.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
    }

    function setValue(next, silent) {
      value = next || '';
      syncLabel();
      renderMenu();
      if (!silent && onChange) onChange(value);
    }

    function setOptions(list, nextValue) {
      options = [{ id: '', label: placeholder }].concat(list || []);
      if (nextValue !== undefined) value = nextValue || '';
      if (!options.some((o) => o.id === value)) value = '';
      syncLabel();
      renderMenu();
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (root.classList.contains('is-open')) close();
      else open();
    });

    menu.addEventListener('click', (e) => {
      const option = e.target.closest('.inv-dd-option');
      if (!option) return;
      e.stopPropagation();
      setValue(option.getAttribute('data-value') || '');
      close();
    });

    const api = {
      get value() { return value; },
      set value(v) { setValue(v, true); },
      setOptions,
      setOnChange(fn) { onChange = fn; },
      open,
      close
    };

    dropdowns[key] = api;
    setOptions([]);
    return api;
  }

  dropdowns.role = createDropdown(document.getElementById('filter-role'), 'role');
  dropdowns.companyType = createDropdown(document.getElementById('filter-company-type'), 'companyType');
  dropdowns.stage = createDropdown(document.getElementById('filter-stage'), 'stage');
  dropdowns.sector = createDropdown(document.getElementById('filter-sector'), 'sector');
  dropdowns.thesis = createDropdown(document.getElementById('filter-thesis'), 'thesis');
  dropdowns.cheque = createDropdown(document.getElementById('filter-cheque'), 'cheque');

  // Mweb: portal drawer to <body> so it isn't trapped under .inv-dir-wrap / backdrop.
  const sidebarHome = els.sidebar ? els.sidebar.parentNode : null;
  const sidebarBefore = els.sidebar ? els.sidebar.nextSibling : null;

  function restoreFiltersSidebar() {
    if (!els.sidebar || !sidebarHome || els.sidebar.parentNode === sidebarHome) return;
    if (sidebarBefore && sidebarBefore.parentNode === sidebarHome) {
      sidebarHome.insertBefore(els.sidebar, sidebarBefore);
    } else {
      sidebarHome.insertBefore(els.sidebar, sidebarHome.firstChild);
    }
  }

  function setFiltersOpen(open) {
    if (!els.sidebar) return;
    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    els.sidebar.classList.toggle('is-open', open);
    if (els.backdrop) els.backdrop.hidden = !open;
    if (els.filtersToggle) els.filtersToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('inv-dir-filters-open', open);
    if (!open) closeAllDropdowns();

    if (isMobile && open) {
      if (els.backdrop) document.body.appendChild(els.backdrop);
      document.body.appendChild(els.sidebar);
    } else {
      restoreFiltersSidebar();
    }
  }

  function renderSkeleton(count) {
    const n = count || 8;
    els.results.innerHTML = Array.from({ length: n }, () => `
      <div class="inv-dir-row inv-dir-skel" aria-hidden="true">
        <div class="inv-dir-col inv-dir-col-fund">
          <span class="inv-skel inv-skel-type"></span>
          <span class="inv-skel inv-skel-name"></span>
        </div>
        <div class="inv-dir-col inv-dir-col-stages">
          <span class="inv-skel inv-skel-line"></span>
        </div>
        <div class="inv-dir-col inv-dir-col-sectors">
          <span class="inv-skel inv-skel-line inv-skel-wide"></span>
        </div>
        <div class="inv-dir-col inv-dir-col-ticket">
          <span class="inv-skel inv-skel-ticket"></span>
        </div>
      </div>
    `).join('');
  }

  function initialsFor(name) {
    const parts = String(name || '')
      .replace(/[()]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function logoHtml(p) {
    const src = p.photo || p.companyLogo;
    if (src) {
      const roundStyle = p.photo ? 'border-radius:50%;object-fit:cover;' : '';
      return (
        '<img class="inv-dir-logo" src="' + esc(src) +
        '" alt="" width="40" height="40" loading="lazy" decoding="async" style="' + roundStyle + '" onerror="this.classList.add(\'is-broken\');this.nextElementSibling&&this.nextElementSibling.classList.add(\'is-visible\');">' +
        '<span class="inv-dir-logo-fallback" aria-hidden="true">' + esc(initialsFor(p.name)) + '</span>'
      );
    }
    return '<span class="inv-dir-logo-fallback is-visible" aria-hidden="true">' + esc(initialsFor(p.name)) + '</span>';
  }

  function renderRows(people) {
    if (!people.length) {
      els.results.innerHTML =
        '<div class="inv-dir-empty-state">' +
          '<p class="inv-dir-empty-title">No matching investors</p>' +
          '<p class="inv-dir-empty-copy">Try clearing filters or searching a different name, role, or firm.</p>' +
          '<button type="button" class="inv-dir-empty-action" id="ppl-empty-clear">Clear filters</button>' +
        '</div>';
      const btn = document.getElementById('ppl-empty-clear');
      if (btn) btn.addEventListener('click', () => els.clear.click());
      return;
    }

    els.results.innerHTML = people.map((p) => {
      const href = '/people/' + esc(p.slug);
      const companyHtml = p.companySlug
        ? '<a class="inv-dir-inline-link" href="/investors/' + esc(p.companySlug) + '" onclick="event.stopPropagation()">' + esc(p.company) + '</a>'
        : esc(p.company || '—');
      const emailHtml = p.hasEmail
        ? '<button type="button" class="inv-email-unlock-btn" data-unlock-email data-person-slug="' + esc(p.slug) + '">' + LOCK_ICON + '<span class="inv-email-unlock-label">Unlock email</span></button>'
        : '<span class="inv-profile-empty">Not available</span>';
      const linksHtml = [
        p.linkedin ? '<a class="inv-dir-inline-link" href="' + esc(p.linkedin) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">LinkedIn</a>' : '',
        p.twitter ? '<a class="inv-dir-inline-link" href="' + esc(p.twitter) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Twitter</a>' : ''
      ].filter(Boolean).join(' · ') || '—';

      return `
      <article class="inv-dir-row">
        <a class="inv-dir-row-hit" href="${href}" aria-label="${esc(p.name)}" data-analytics-event="dir_result_click" data-analytics-params='{"directory":"people","slug":"${esc(p.slug)}"}'></a>
        <div class="inv-dir-col inv-dir-col-fund">
          <span class="inv-dir-fund-mark">${logoHtml(p)}</span>
          <span class="inv-dir-fund-text">
            <span class="inv-dir-type">${esc(p.title || 'Investor')}</span>
            <span class="inv-dir-name">${esc(p.name)}</span>
          </span>
        </div>
        <div class="inv-dir-col inv-dir-col-stages">
          <span class="inv-dir-mobile-label">Firm</span>
          <span class="inv-dir-cell">${companyHtml}</span>
        </div>
        <div class="inv-dir-col inv-dir-col-sectors">
          <span class="inv-dir-mobile-label">Email</span>
          <span class="inv-dir-cell">${emailHtml}</span>
        </div>
        <div class="inv-dir-col inv-dir-col-ticket">
          <span class="inv-dir-mobile-label">Links</span>
          <span class="inv-dir-ticket">${linksHtml}</span>
        </div>
      </article>`;
    }).join('');

    if (window.VCPersonEmailUnlock) window.VCPersonEmailUnlock.wireUnlockButtons(els.results);
  }

  function activeFilterCount() {
    var n = 0;
    if (state.q) n++;
    if (state.role) n++;
    if (state.companyType) n++;
    if (state.stage) n++;
    if (state.sector) n++;
    if (state.thesis) n++;
    if (state.cheque) n++;
    return n;
  }

  function updateMobileFiltersLabel() {
    if (!els.filtersToggle) return;
    var titleEl = document.querySelector('.inv-dir-header h1');
    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    var active = activeFilterCount();
    if (!isMobile) {
      els.filtersToggle.textContent = 'Filters';
      els.filtersToggle.classList.remove('has-active-filters');
      if (titleEl) titleEl.textContent = 'Investors';
      return;
    }
    // Mweb: count in title; orange dot on button when any filter is applied
    var total = state.total ? state.total.toLocaleString('en-IN') : '…';
    els.filtersToggle.textContent = 'Filters';
    els.filtersToggle.classList.toggle('has-active-filters', active > 0);
    if (titleEl) titleEl.textContent = 'Investors(' + total + ')';
  }

  function updatePager() {
    const page = Math.floor(state.offset / PAGE_SIZE) + 1;
    const pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
    els.pageLabel.innerHTML =
      '<span class="inv-dir-pager-kicker">Page</span>' +
      '<span class="inv-dir-pager-current">' + page + '</span>' +
      '<span class="inv-dir-pager-sep" aria-hidden="true">/</span>' +
      '<span class="inv-dir-pager-total">' + pages + '</span>';
    els.prev.disabled = state.offset <= 0;
    els.next.disabled = state.offset + PAGE_SIZE >= state.total;
    els.count.textContent = `${state.total.toLocaleString('en-IN')} investors`;
    updateMobileFiltersLabel();
  }

  async function load() {
    renderSkeleton(8);
    if (!state.total) els.count.textContent = 'Fetching investors';
    const params = new URLSearchParams({
      q: state.q,
      role: state.role,
      companyType: state.companyType,
      stage: state.stage,
      sector: state.sector,
      thesis: state.thesis,
      cheque: state.cheque,
      limit: String(PAGE_SIZE),
      offset: String(state.offset)
    });

    const res = await window.VCAuth.authFetch(`/api/people?${params.toString()}`);
    if (res.status === 401) {
      window.location.replace(window.VCAuth.loginUrl());
      return;
    }
    if (!res.ok) throw new Error('Failed to load investors');
    const data = await res.json();

    if (!state.filters && data.filters) {
      state.filters = data.filters;
      dropdowns.role.setOptions(data.filters.roles || [], state.role);
      dropdowns.companyType.setOptions(data.filters.companyTypes || [], state.companyType);
      dropdowns.stage.setOptions(data.filters.stages || [], state.stage);
      dropdowns.sector.setOptions(data.filters.sectors || [], state.sector);
      dropdowns.thesis.setOptions(data.filters.thesisThemes || [], state.thesis);
      dropdowns.cheque.setOptions(data.filters.chequeRanges || [], state.cheque);
    }

    state.total = data.total || 0;
    renderRows(data.people || []);
    updatePager();
  }

  function trackFilter(name, value) {
    if (window.VCAnalytics && value) {
      window.VCAnalytics.track('dir_filter_change', { directory: 'people', filter: name, value: value });
    }
  }

  function resetOffsetAndLoad() {
    state.offset = 0;
    load().catch((err) => {
      console.error(err);
      els.results.innerHTML =
        '<div class="inv-dir-empty-state">' +
          '<p class="inv-dir-empty-title">Couldn’t load investors</p>' +
          '<p class="inv-dir-empty-copy">Check your connection and try again.</p>' +
          '<button type="button" class="inv-dir-empty-action" id="ppl-empty-retry">Retry</button>' +
        '</div>';
      const btn = document.getElementById('ppl-empty-retry');
      if (btn) btn.addEventListener('click', () => resetOffsetAndLoad());
    });
  }

  let searchTimer = null;
  els.search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = els.search.value.trim();
      resetOffsetAndLoad();
    }, 250);
  });

  dropdowns.role.setOnChange((v) => { state.role = v; trackFilter('role', v); resetOffsetAndLoad(); });
  dropdowns.companyType.setOnChange((v) => { state.companyType = v; trackFilter('companyType', v); resetOffsetAndLoad(); });
  dropdowns.stage.setOnChange((v) => { state.stage = v; trackFilter('stage', v); resetOffsetAndLoad(); });
  dropdowns.sector.setOnChange((v) => { state.sector = v; trackFilter('sector', v); resetOffsetAndLoad(); });
  dropdowns.thesis.setOnChange((v) => { state.thesis = v; trackFilter('thesis', v); resetOffsetAndLoad(); });
  dropdowns.cheque.setOnChange((v) => { state.cheque = v; trackFilter('cheque', v); resetOffsetAndLoad(); });

  els.clear.addEventListener('click', () => {
    state.q = state.role = state.companyType = state.stage = state.sector = state.thesis = state.cheque = '';
    els.search.value = '';
    dropdowns.role.value = '';
    dropdowns.companyType.value = '';
    dropdowns.stage.value = '';
    dropdowns.sector.value = '';
    dropdowns.thesis.value = '';
    dropdowns.cheque.value = '';
    resetOffsetAndLoad();
  });

  els.prev.addEventListener('click', () => {
    state.offset = Math.max(0, state.offset - PAGE_SIZE);
    load().catch(console.error);
  });
  els.next.addEventListener('click', () => {
    state.offset = state.offset + PAGE_SIZE;
    load().catch(console.error);
  });

  if (els.filtersToggle) {
    els.filtersToggle.addEventListener('click', () => {
      if (window.VCNav) window.VCNav.close();
      setFiltersOpen(true);
    });
  }
  if (els.filtersClose) els.filtersClose.addEventListener('click', () => setFiltersOpen(false));
  if (els.backdrop) els.backdrop.addEventListener('click', () => setFiltersOpen(false));

  document.addEventListener('click', () => closeAllDropdowns());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllDropdowns();
      setFiltersOpen(false);
    }
  });

  window.addEventListener('resize', function () {
    updateMobileFiltersLabel();
    if (!window.matchMedia('(max-width: 768px)').matches) setFiltersOpen(false);
  });

  // Mweb: visible press state on Firm / Links tiles (iOS :active is unreliable)
  if (els.results) {
    var clearMetaPress = function () {
      els.results.querySelectorAll('.inv-dir-col-stages.is-pressed, .inv-dir-col-ticket.is-pressed')
        .forEach(function (el) { el.classList.remove('is-pressed'); });
    };
    els.results.addEventListener('touchstart', function (e) {
      if (!window.matchMedia('(max-width: 768px)').matches) return;
      var link = e.target.closest(
        '.inv-dir-col-stages .inv-dir-inline-link, .inv-dir-col-ticket .inv-dir-inline-link'
      );
      if (!link) return;
      clearMetaPress();
      var tile = link.closest('.inv-dir-col-stages, .inv-dir-col-ticket');
      if (tile) tile.classList.add('is-pressed');
    }, { passive: true });
    els.results.addEventListener('touchend', clearMetaPress, { passive: true });
    els.results.addEventListener('touchcancel', clearMetaPress, { passive: true });
  }

  const params0 = new URLSearchParams(window.location.search);
  if (params0.get('role')) state.role = params0.get('role');
  if (params0.get('companyType')) state.companyType = params0.get('companyType');
  if (params0.get('stage')) state.stage = params0.get('stage');
  if (params0.get('sector')) state.sector = params0.get('sector');
  if (params0.get('thesis')) state.thesis = params0.get('thesis');
  if (params0.get('cheque')) state.cheque = params0.get('cheque');
  if (params0.get('q')) {
    state.q = params0.get('q');
    els.search.value = state.q;
  }

  resetOffsetAndLoad();
})();
