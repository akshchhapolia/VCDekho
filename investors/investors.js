(function () {
  const PAGE_SIZE = 24;
  const STAGE_GUIDE_IDS = {
    'pre-seed': true,
    seed: true,
    'pre-series-a': true,
    'series-a': true,
    'series-b': true,
    'series-c': true
  };
  const state = {
    q: '',
    sector: '',
    stage: '',
    type: '',
    thesis: '',
    cheque: '',
    active: '',
    offset: 0,
    total: 0,
    filters: null
  };

  const els = {
    search: document.getElementById('inv-search'),
    active: document.getElementById('filter-active'),
    clear: document.getElementById('inv-clear'),
    count: document.getElementById('inv-count'),
    guideSlot: document.getElementById('inv-guide-slot'),
    results: document.getElementById('inv-results'),
    prev: document.getElementById('inv-prev'),
    next: document.getElementById('inv-next'),
    pageLabel: document.getElementById('inv-page-label'),
    filtersToggle: document.getElementById('inv-filters-toggle'),
    filtersClose: document.getElementById('inv-filters-close'),
    sidebar: document.getElementById('inv-dir-sidebar'),
    backdrop: document.getElementById('inv-filters-backdrop')
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
    Object.keys(dropdowns).forEach(key => {
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
      menu.innerHTML = options.map(o => {
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
      const match = options.find(o => o.id === value);
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
      if (!options.some(o => o.id === value)) value = '';
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

  dropdowns.sector = createDropdown(document.getElementById('filter-sector'), 'sector');
  dropdowns.stage = createDropdown(document.getElementById('filter-stage'), 'stage');
  dropdowns.type = createDropdown(document.getElementById('filter-type'), 'type');
  dropdowns.thesis = createDropdown(document.getElementById('filter-thesis'), 'thesis');
  dropdowns.cheque = createDropdown(document.getElementById('filter-cheque'), 'cheque');

  function joinList(list, limit) {
    const items = (list || []).filter(Boolean).slice(0, limit);
    if (!items.length) return '—';
    const text = items.join(', ');
    if ((list || []).length > limit) return text + '…';
    return text;
  }

  function setFiltersOpen(open) {
    if (!els.sidebar) return;
    els.sidebar.classList.toggle('is-open', open);
    if (els.backdrop) {
      els.backdrop.hidden = !open;
    }
    if (els.filtersToggle) {
      els.filtersToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    document.body.classList.toggle('inv-dir-filters-open', open);
    if (!open) closeAllDropdowns();
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

  function joinLinked(labels, ids, hrefForId, limit) {
    const items = (labels || []).slice(0, limit || 4);
    if (!items.length) return '—';
    const more = (labels || []).length > items.length;
    const parts = items.map((label, i) => {
      const id = (ids || [])[i];
      const href = id && hrefForId(id);
      if (href) {
        return '<a class="inv-dir-inline-link" href="' + esc(href) + '">' + esc(label) + '</a>';
      }
      return esc(label);
    });
    return parts.join(', ') + (more ? '…' : '');
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

  function logoHtml(inv) {
    if (inv.logo) {
      return (
        '<img class="inv-dir-logo" src="' +
        esc(inv.logo) +
        '" alt="" width="40" height="40" loading="lazy" decoding="async" onerror="this.classList.add(\'is-broken\');this.nextElementSibling&&this.nextElementSibling.classList.add(\'is-visible\');">' +
        '<span class="inv-dir-logo-fallback" aria-hidden="true">' +
        esc(initialsFor(inv.name)) +
        '</span>'
      );
    }
    return (
      '<span class="inv-dir-logo-fallback is-visible" aria-hidden="true">' +
      esc(initialsFor(inv.name)) +
      '</span>'
    );
  }

  function renderRows(investors) {
    if (!investors.length) {
      els.results.innerHTML =
        '<div class="inv-dir-empty-state">' +
          '<p class="inv-dir-empty-title">No matching funds</p>' +
          '<p class="inv-dir-empty-copy">Try clearing filters or searching a different fund, sector, or stage.</p>' +
          '<button type="button" class="inv-dir-empty-action" id="inv-empty-clear">Clear filters</button>' +
        '</div>';
      const btn = document.getElementById('inv-empty-clear');
      if (btn) {
        btn.addEventListener('click', () => els.clear.click());
      }
      return;
    }

    els.results.innerHTML = investors.map(inv => {
      const stagesHtml = joinLinked(
        inv.stages,
        inv.stageIds,
        id => (STAGE_GUIDE_IDS[id] ? '/investors/stages/' + id : null),
        4
      );
      const thesisHtml = joinLinked(
        inv.thesisThemes,
        inv.thesisThemeIds,
        id => (id && id !== 'general' ? '/investors/themes/' + id : null),
        3
      );
      const sectorsText = joinList(inv.sectors, 3);
      const sectorsThesis = [sectorsText !== '—' ? esc(sectorsText) : '', thesisHtml !== '—' ? thesisHtml : '']
        .filter(Boolean)
        .join(' · ') || '—';

      const href = '/investors/' + esc(inv.slug);
      return `
      <article class="inv-dir-row">
        <a class="inv-dir-row-hit" href="${href}" aria-label="${esc(inv.name)}"></a>
        <div class="inv-dir-col inv-dir-col-fund">
          <span class="inv-dir-fund-mark">${logoHtml(inv)}</span>
          <span class="inv-dir-fund-text">
            <span class="inv-dir-type">${esc(inv.type || 'Investor')}${inv.activelyDeploying ? ' <span class="inv-dir-active-dot" title="Actively deploying — linked to a funding round in the last 6 months" aria-label="Actively deploying"></span>' : ''}</span>
            <span class="inv-dir-name">${esc(inv.name)}</span>
          </span>
        </div>
        <div class="inv-dir-col inv-dir-col-stages">
          <span class="inv-dir-mobile-label">Stages</span>
          <span class="inv-dir-cell">${stagesHtml}</span>
        </div>
        <div class="inv-dir-col inv-dir-col-sectors">
          <span class="inv-dir-mobile-label">Sectors</span>
          <span class="inv-dir-cell">${sectorsThesis}</span>
        </div>
        <div class="inv-dir-col inv-dir-col-ticket">
          <span class="inv-dir-mobile-label">Ticket</span>
          <span class="inv-dir-ticket">${esc(inv.chequeSize || 'Not listed')}</span>
        </div>
      </article>`;
    }).join('');
  }

  function findFilterLabel(list, id) {
    const match = (list || []).find(o => o.id === id);
    return match ? match.label : id;
  }

  function updateGuideSlot() {
    if (!els.guideSlot) return;
    if (state.stage && STAGE_GUIDE_IDS[state.stage]) {
      const label = findFilterLabel(state.filters && state.filters.stages, state.stage) || state.stage;
      els.guideSlot.innerHTML =
        '<span class="inv-dir-dot" aria-hidden="true">·</span>' +
        '<a class="inv-dir-guide-link" href="/investors/stages/' + esc(state.stage) + '">Open ' + esc(label) + ' guide →</a>';
      return;
    }
    if (state.thesis && state.thesis !== 'general') {
      const label = findFilterLabel(state.filters && state.filters.thesisThemes, state.thesis) || state.thesis;
      els.guideSlot.innerHTML =
        '<span class="inv-dir-dot" aria-hidden="true">·</span>' +
        '<a class="inv-dir-guide-link" href="/investors/themes/' + esc(state.thesis) + '">Open ' + esc(label) + ' guide →</a>';
      return;
    }
    els.guideSlot.innerHTML = '';
  }

  function activeFilterCount() {
    var n = 0;
    if (state.q) n++;
    if (state.sector) n++;
    if (state.stage) n++;
    if (state.type) n++;
    if (state.thesis) n++;
    if (state.cheque) n++;
    if (state.active) n++;
    return n;
  }

  function updateMobileFiltersLabel() {
    if (!els.filtersToggle) return;
    var titleEl = document.querySelector('.inv-dir-header h1');
    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!isMobile) {
      els.filtersToggle.textContent = 'Filters';
      if (titleEl) titleEl.textContent = 'Funds';
      return;
    }
    // Mweb: count lives in the title; button stays a clean "Filters"
    var total = state.total ? state.total.toLocaleString('en-IN') : '…';
    els.filtersToggle.textContent = 'Filters';
    if (titleEl) titleEl.textContent = 'Funds(' + total + ')';
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
    els.count.textContent = `${state.total.toLocaleString('en-IN')} funds`;
    updateGuideSlot();
    updateMobileFiltersLabel();
  }

  async function load() {
    renderSkeleton(8);
    if (!state.total) {
      els.count.textContent = 'Fetching funds';
    }
    const params = new URLSearchParams({
      q: state.q,
      sector: state.sector,
      stage: state.stage,
      type: state.type,
      thesis: state.thesis,
      cheque: state.cheque,
      active: state.active,
      limit: String(PAGE_SIZE),
      offset: String(state.offset)
    });

    const res = await window.VCAuth.authFetch(`/api/investors/list?${params.toString()}`);
    if (res.status === 401) {
      window.location.replace(window.VCAuth.loginUrl());
      return;
    }
    if (!res.ok) throw new Error('Failed to load funds');
    const data = await res.json();

    if (!state.filters && data.filters) {
      state.filters = data.filters;
      dropdowns.sector.setOptions(data.filters.sectors || [], state.sector);
      dropdowns.stage.setOptions(data.filters.stages || [], state.stage);
      dropdowns.type.setOptions(data.filters.types || [], state.type);
      dropdowns.thesis.setOptions(data.filters.thesisThemes || [], state.thesis);
      dropdowns.cheque.setOptions(data.filters.chequeRanges || [], state.cheque);
    }

    state.total = data.total || 0;
    renderRows(data.investors || []);
    updatePager();
  }

  function resetOffsetAndLoad() {
    state.offset = 0;
    load().catch(err => {
      console.error(err);
      els.results.innerHTML =
        '<div class="inv-dir-empty-state">' +
          '<p class="inv-dir-empty-title">Couldn’t load funds</p>' +
          '<p class="inv-dir-empty-copy">Check your connection and try again.</p>' +
          '<button type="button" class="inv-dir-empty-action" id="inv-empty-retry">Retry</button>' +
        '</div>';
      const btn = document.getElementById('inv-empty-retry');
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

  dropdowns.sector.setOnChange(v => { state.sector = v; resetOffsetAndLoad(); });
  dropdowns.stage.setOnChange(v => { state.stage = v; resetOffsetAndLoad(); });
  dropdowns.type.setOnChange(v => { state.type = v; resetOffsetAndLoad(); });
  dropdowns.thesis.setOnChange(v => { state.thesis = v; resetOffsetAndLoad(); });
  dropdowns.cheque.setOnChange(v => { state.cheque = v; resetOffsetAndLoad(); });

  if (els.active) {
    els.active.addEventListener('change', () => {
      state.active = els.active.checked ? '1' : '';
      resetOffsetAndLoad();
    });
  }

  els.clear.addEventListener('click', () => {
    state.q = state.sector = state.stage = state.type = state.thesis = state.cheque = state.active = '';
    els.search.value = '';
    dropdowns.sector.value = '';
    dropdowns.stage.value = '';
    dropdowns.type.value = '';
    dropdowns.thesis.value = '';
    dropdowns.cheque.value = '';
    if (els.active) els.active.checked = false;
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
  if (els.filtersClose) {
    els.filtersClose.addEventListener('click', () => setFiltersOpen(false));
  }
  if (els.backdrop) {
    els.backdrop.addEventListener('click', () => setFiltersOpen(false));
  }

  document.addEventListener('click', () => closeAllDropdowns());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllDropdowns();
      setFiltersOpen(false);
    }
  });

  window.addEventListener('resize', updateMobileFiltersLabel);

  const params0 = new URLSearchParams(window.location.search);
  if (params0.get('stage')) state.stage = params0.get('stage');
  if (params0.get('thesis')) state.thesis = params0.get('thesis');
  if (params0.get('sector')) state.sector = params0.get('sector');
  if (params0.get('type')) state.type = params0.get('type');
  if (params0.get('cheque')) state.cheque = params0.get('cheque');
  if (params0.get('active') === '1') {
    state.active = '1';
    if (els.active) els.active.checked = true;
  }
  if (params0.get('q')) {
    state.q = params0.get('q');
    els.search.value = state.q;
  }

  resetOffsetAndLoad();
})();
