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
    pageLabel: document.getElementById('inv-page-label')
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

  function hasActiveFilters() {
    return !!(state.q || state.sector || state.stage || state.type || state.thesis || state.cheque);
  }

  function syncClearButton() {
    els.clear.hidden = !hasActiveFilters();
  }

  function metaLine(inv) {
    const parts = [];
    if (inv.type) parts.push(esc(inv.type));
    const stages = (inv.stages || []).slice(0, 3).join(', ');
    if (stages) parts.push(esc(stages));
    const sectors = (inv.sectors || []).slice(0, 2).join(', ');
    if (sectors) parts.push(esc(sectors));
    return parts.join(' · ') || '—';
  }

  function renderCards(investors) {
    if (!investors.length) {
      els.results.innerHTML = '<p class="inv-dir-empty">No investors match these filters.</p>';
      return;
    }

    els.results.innerHTML = investors.map((inv, i) => `
      <a class="inv-dir-row" href="/investors/${esc(inv.slug)}" role="listitem" style="--i:${i}">
        <div class="inv-dir-row-main">
          <div class="inv-dir-row-top">
            <h2 class="inv-dir-name">${esc(inv.name)}</h2>
            <span class="inv-dir-ticket">${esc(inv.chequeSize || 'Ticket n/a')}</span>
          </div>
          <div class="inv-dir-meta-line">${metaLine(inv)}</div>
          <p class="inv-dir-thesis">${esc(inv.thesis || 'Open profile for thesis and focus areas.')}</p>
        </div>
        <span class="inv-dir-arrow" aria-hidden="true">→</span>
      </a>
    `).join('');
  }

  function updatePager() {
    const page = Math.floor(state.offset / PAGE_SIZE) + 1;
    const pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
    els.pageLabel.textContent = `${page} / ${pages}`;
    els.prev.disabled = state.offset <= 0;
    els.next.disabled = state.offset + PAGE_SIZE >= state.total;
    const start = state.total ? state.offset + 1 : 0;
    const end = Math.min(state.offset + PAGE_SIZE, state.total);
    els.count.textContent = state.total
      ? `Showing ${start.toLocaleString('en-IN')}–${end.toLocaleString('en-IN')} of ${state.total.toLocaleString('en-IN')}`
      : '0 investors';
    syncClearButton();
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
      fillSelect(els.sector, data.filters.sectors || [], 'Sector');
      fillSelect(els.stage, data.filters.stages || [], 'Stage');
      fillSelect(els.type, data.filters.types || [], 'Type');
      fillSelect(els.thesis, data.filters.thesisThemes || [], 'Thesis');
      fillSelect(els.cheque, data.filters.chequeRanges || [], 'Ticket size');
      if (state.sector) els.sector.value = state.sector;
      if (state.stage) els.stage.value = state.stage;
      if (state.type) els.type.value = state.type;
      if (state.thesis) els.thesis.value = state.thesis;
      if (state.cheque) els.cheque.value = state.cheque;
    }

    state.total = data.total || 0;
    renderCards(data.investors || []);
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
