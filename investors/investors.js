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

  function chips(list, limit) {
    return (list || []).slice(0, limit).map(x => `<span class="inv-chip">${esc(x)}</span>`).join('');
  }

  function renderCards(investors) {
    if (!investors.length) {
      els.results.innerHTML = '<p class="inv-empty">No investors match these filters.</p>';
      return;
    }

    els.results.innerHTML = investors.map(inv => `
      <a class="inv-card" href="/investors/${esc(inv.slug)}">
        <div class="inv-card-main">
          <div class="inv-card-type">${esc(inv.type)}</div>
          <h2 class="inv-card-name">${esc(inv.name)}</h2>
          <p class="inv-card-thesis">${esc(inv.thesis || 'Investment thesis available on profile.')}</p>
        </div>
        <div class="inv-card-col">
          <div class="inv-card-col-label">Stages</div>
          <div class="inv-chip-row">${chips(inv.stages, 4) || '<span class="inv-chip muted">—</span>'}</div>
        </div>
        <div class="inv-card-col">
          <div class="inv-card-col-label">Sectors / Thesis</div>
          <div class="inv-chip-row">
            ${chips(inv.sectors, 3)}
            ${chips(inv.thesisThemes, 2)}
          </div>
        </div>
        <div class="inv-card-col inv-card-ticket">
          <div class="inv-card-col-label">Ticket size</div>
          <div class="inv-ticket">${esc(inv.chequeSize || 'Not listed')}</div>
        </div>
      </a>
    `).join('');
  }

  function updatePager() {
    const page = Math.floor(state.offset / PAGE_SIZE) + 1;
    const pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
    els.pageLabel.textContent = `Page ${page} of ${pages}`;
    els.prev.disabled = state.offset <= 0;
    els.next.disabled = state.offset + PAGE_SIZE >= state.total;
    els.count.textContent = `${state.total.toLocaleString('en-IN')} investors`;
  }

  async function load() {
    els.results.innerHTML = '<p class="inv-empty">Loading...</p>';
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

    const res = await fetch(`/api/investors/list?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load investors');
    const data = await res.json();

    if (!state.filters && data.filters) {
      state.filters = data.filters;
      fillSelect(els.sector, data.filters.sectors || [], 'All sectors');
      fillSelect(els.stage, data.filters.stages || [], 'All stages');
      fillSelect(els.type, data.filters.types || [], 'All types');
      fillSelect(els.thesis, data.filters.thesisThemes || [], 'All theses');
      fillSelect(els.cheque, data.filters.chequeRanges || [], 'Any ticket');
    }

    state.total = data.total || 0;
    renderCards(data.investors || []);
    updatePager();
  }

  function resetOffsetAndLoad() {
    state.offset = 0;
    load().catch(err => {
      console.error(err);
      els.results.innerHTML = '<p class="inv-empty">Failed to load investors.</p>';
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

  // Prefill filters from URL (?stage=&thesis=)
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

  resetOffsetAndLoad().then(() => {
    if (state.stage && els.stage) els.stage.value = state.stage;
    if (state.thesis && els.thesis) els.thesis.value = state.thesis;
    if (state.sector && els.sector) els.sector.value = state.sector;
    if (state.type && els.type) els.type.value = state.type;
    if (state.cheque && els.cheque) els.cheque.value = state.cheque;
  });
})();
