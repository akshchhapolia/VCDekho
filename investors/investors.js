(function () {
  const PAGE_SIZE = 24;
  const state = {
    q: '',
    sector: '',
    stage: '',
    type: '',
    thesis: '',
    cheque: '',
    offset: 0,
    total: 0,
    filters: null
  };

  const els = {
    search: document.getElementById('inv-search'),
    clear: document.getElementById('inv-clear'),
    sector: document.getElementById('filter-sector'),
    stage: document.getElementById('filter-stage'),
    type: document.getElementById('filter-type'),
    thesis: document.getElementById('filter-thesis'),
    cheque: document.getElementById('filter-cheque'),
    count: document.getElementById('inv-count'),
    results: document.getElementById('inv-results'),
    prev: document.getElementById('inv-prev'),
    next: document.getElementById('inv-next'),
    pageLabel: document.getElementById('inv-page-label'),
    filtersToggle: document.getElementById('inv-filters-toggle'),
    filtersClose: document.getElementById('inv-filters-close'),
    sidebar: document.getElementById('inv-dir-sidebar'),
    backdrop: document.getElementById('inv-filters-backdrop')
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fillSelect(select, options, placeholder) {
    const current = select.value;
    select.innerHTML = `<option value="">${esc(placeholder)}</option>` +
      options.map(o => `<option value="${esc(o.id)}">${esc(o.label)}</option>`).join('');
    if ([...select.options].some(o => o.value === current)) select.value = current;
  }

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
  }

  function renderRows(investors) {
    if (!investors.length) {
      els.results.innerHTML = '<p class="inv-dir-empty">No investors match these filters.</p>';
      return;
    }

    els.results.innerHTML = investors.map(inv => {
      const sectors = joinList([...(inv.sectors || []), ...(inv.thesisThemes || [])], 4);
      const stages = joinList(inv.stages, 5);
      return `
      <a class="inv-dir-row" href="/investors/${esc(inv.slug)}">
        <div class="inv-dir-col inv-dir-col-fund">
          <span class="inv-dir-type">${esc(inv.type || 'Investor')}</span>
          <span class="inv-dir-name">${esc(inv.name)}</span>
        </div>
        <div class="inv-dir-col inv-dir-col-stages">
          <span class="inv-dir-mobile-label">Stages</span>
          <span class="inv-dir-cell">${esc(stages)}</span>
        </div>
        <div class="inv-dir-col inv-dir-col-sectors">
          <span class="inv-dir-mobile-label">Sectors</span>
          <span class="inv-dir-cell">${esc(sectors)}</span>
        </div>
        <div class="inv-dir-col inv-dir-col-ticket">
          <span class="inv-dir-mobile-label">Ticket</span>
          <span class="inv-dir-ticket">${esc(inv.chequeSize || 'Not listed')}</span>
        </div>
      </a>`;
    }).join('');
  }

  function updatePager() {
    const page = Math.floor(state.offset / PAGE_SIZE) + 1;
    const pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
    els.pageLabel.textContent = `Page ${page} of ${pages}`;
    els.prev.disabled = state.offset <= 0;
    els.next.disabled = state.offset + PAGE_SIZE >= state.total;
    els.count.textContent = `${state.total.toLocaleString('en-IN')} funds`;
  }

  async function load() {
    els.results.innerHTML = '<p class="inv-dir-empty">Loading…</p>';
    const params = new URLSearchParams({
      q: state.q,
      sector: state.sector,
      stage: state.stage,
      type: state.type,
      thesis: state.thesis,
      cheque: state.cheque,
      limit: String(PAGE_SIZE),
      offset: String(state.offset)
    });

    const res = await window.VCAuth.authFetch(`/api/investors/list?${params.toString()}`);
    if (res.status === 401) {
      window.location.replace(window.VCAuth.loginUrl());
      return;
    }
    if (!res.ok) throw new Error('Failed to load investors');
    const data = await res.json();

    if (!state.filters && data.filters) {
      state.filters = data.filters;
      fillSelect(els.sector, data.filters.sectors || [], 'All sectors');
      fillSelect(els.stage, data.filters.stages || [], 'All stages');
      fillSelect(els.type, data.filters.types || [], 'All types');
      fillSelect(els.thesis, data.filters.thesisThemes || [], 'All theses');
      fillSelect(els.cheque, data.filters.chequeRanges || [], 'Any ticket');
      if (state.sector) els.sector.value = state.sector;
      if (state.stage) els.stage.value = state.stage;
      if (state.type) els.type.value = state.type;
      if (state.thesis) els.thesis.value = state.thesis;
      if (state.cheque) els.cheque.value = state.cheque;
    }

    state.total = data.total || 0;
    renderRows(data.investors || []);
    updatePager();
  }

  function resetOffsetAndLoad() {
    state.offset = 0;
    load().catch(err => {
      console.error(err);
      els.results.innerHTML = '<p class="inv-dir-empty">Failed to load investors.</p>';
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

  els.sector.addEventListener('change', () => { state.sector = els.sector.value; resetOffsetAndLoad(); });
  els.stage.addEventListener('change', () => { state.stage = els.stage.value; resetOffsetAndLoad(); });
  els.type.addEventListener('change', () => { state.type = els.type.value; resetOffsetAndLoad(); });
  els.thesis.addEventListener('change', () => { state.thesis = els.thesis.value; resetOffsetAndLoad(); });
  els.cheque.addEventListener('change', () => { state.cheque = els.cheque.value; resetOffsetAndLoad(); });

  els.clear.addEventListener('click', () => {
    state.q = state.sector = state.stage = state.type = state.thesis = state.cheque = '';
    els.search.value = '';
    els.sector.value = els.stage.value = els.type.value = els.thesis.value = els.cheque.value = '';
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
    els.filtersToggle.addEventListener('click', () => setFiltersOpen(true));
  }
  if (els.filtersClose) {
    els.filtersClose.addEventListener('click', () => setFiltersOpen(false));
  }
  if (els.backdrop) {
    els.backdrop.addEventListener('click', () => setFiltersOpen(false));
  }

  const params0 = new URLSearchParams(window.location.search);
  if (params0.get('stage')) state.stage = params0.get('stage');
  if (params0.get('thesis')) state.thesis = params0.get('thesis');
  if (params0.get('sector')) state.sector = params0.get('sector');
  if (params0.get('type')) state.type = params0.get('type');
  if (params0.get('cheque')) state.cheque = params0.get('cheque');
  if (params0.get('q')) {
    state.q = params0.get('q');
    els.search.value = state.q;
  }

  resetOffsetAndLoad();
})();
