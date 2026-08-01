/**
 * Client search + progressive reveal for large investor portfolio sections.
 */
(function () {
  var section = document.getElementById('portfolio');
  if (!section) return;

  var grid = document.getElementById('inv-portfolio-grid');
  var search = document.getElementById('inv-portfolio-search');
  var status = document.getElementById('inv-portfolio-status');
  var moreBtn = document.getElementById('inv-portfolio-more');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.inv-profile-portfolio-card'));
  if (!cards.length) return;

  var pageSize = moreBtn
    ? parseInt(moreBtn.getAttribute('data-page-size') || '12', 10) || 12
    : cards.length;
  var visibleCount = Math.min(pageSize, cards.length);
  var query = '';
  var debounceTimer = null;

  function isFiltering() {
    return query.length > 0;
  }

  function matches(card) {
    if (!query) return true;
    var name = card.getAttribute('data-name') || '';
    return name.indexOf(query) !== -1;
  }

  function updateStatus(showing, total) {
    if (!status) return;
    if (isFiltering()) {
      status.textContent =
        showing === 0
          ? 'No matches'
          : showing === 1
            ? '1 match'
            : showing + ' matches';
      return;
    }
    status.textContent = 'Showing ' + showing + ' of ' + total;
  }

  function syncMoreButton() {
    if (!moreBtn) return;
    var moreWrap = moreBtn.parentElement;
    if (isFiltering()) {
      moreBtn.hidden = true;
      if (moreWrap) moreWrap.hidden = true;
      return;
    }
    var remaining = cards.length - visibleCount;
    var hide = remaining <= 0;
    moreBtn.hidden = hide;
    if (moreWrap) moreWrap.hidden = hide;
  }

  function render() {
    var showing = 0;
    cards.forEach(function (card, index) {
      var show;
      if (isFiltering()) {
        show = matches(card);
      } else {
        show = index < visibleCount;
      }
      card.hidden = !show;
      if (show) showing += 1;
    });
    updateStatus(showing, cards.length);
    syncMoreButton();
    // Newly revealed cards may carry data-src logos — observe them
    if (typeof window.VCHydratePortfolioLogos === 'function') {
      window.VCHydratePortfolioLogos(grid);
    }
  }

  if (search) {
    search.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        query = String(search.value || '')
          .trim()
          .toLowerCase();
        render();
      }, 150);
    });
  }

  if (moreBtn) {
    moreBtn.addEventListener('click', function () {
      if (isFiltering()) return;
      visibleCount = Math.min(visibleCount + pageSize, cards.length);
      render();
    });
  }

  render();
})();
