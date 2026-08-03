(function () {
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function sentimentLabel(s) {
    return (
      { positive: 'Positive', mixed: 'Mixed', negative: 'Negative', neutral: 'Neutral' }[s] ||
      'Neutral'
    );
  }

  function renderCard(item) {
    const quotes = Array.isArray(item.founder_quotes)
      ? item.founder_quotes
      : typeof item.founder_quotes === 'string'
        ? JSON.parse(item.founder_quotes || '[]')
        : [];
    const firstQuote = quotes[0];
    const topics = item.topics || [];
    const dateStr = formatDate(item.published_at || item.published_at_source);
    const sub = item.subreddit ? `r/${item.subreddit}` : 'Reddit';
    const fundLinks = (item.investor_slugs || [])
      .map((slug, i) => {
        const name = (item.investor_names && item.investor_names[i]) || slug;
        return `<a href="/funds/${encodeURIComponent(slug)}" class="buzz-fund-link" onclick="event.stopPropagation()">${esc(name)}</a>`;
      })
      .join('');

    return `
      <a href="/buzz/${esc(item.slug)}" class="buzz-card">
        <div class="buzz-card-head">
          <span class="buzz-source-badge buzz-source-reddit">Reddit</span>
          <span class="buzz-meta">${esc(sub)} · ${esc(dateStr)}</span>
        </div>
        <h2 class="buzz-card-title">${esc(item.title)}</h2>
        ${firstQuote ? `<blockquote class="buzz-quote-preview">${esc(firstQuote.text)}</blockquote>` : ''}
        ${
          item.ai_summary
            ? `<section class="buzz-summary-box">
            <h3 class="buzz-summary-label">AI Summary</h3>
            <p class="buzz-summary-text">${esc(item.ai_summary)}</p>
          </section>`
            : ''
        }
        ${
          topics.length
            ? `<section class="buzz-topics">
            <h3 class="buzz-topics-label">Topics</h3>
            <div class="buzz-topic-chips">${topics.map((t) => `<span class="buzz-topic-chip">${esc(t)}</span>`).join('')}</div>
          </section>`
            : ''
        }
        <div class="buzz-card-foot">
          <span class="buzz-sentiment buzz-sentiment--${esc(item.sentiment || 'neutral')}">Sentiment: ${sentimentLabel(item.sentiment)}</span>
          ${item.comment_count ? `<span class="buzz-comments">${item.comment_count} comments</span>` : ''}
          <span class="buzz-read-original" style="margin-left:auto;margin-top:0;border:none;">Read →</span>
        </div>
        ${
          fundLinks
            ? `<div class="buzz-linked-funds"><span class="buzz-linked-label">Linked</span>${fundLinks}</div>`
            : ''
        }
      </a>`;
  }

  async function loadBuzz() {
    const container = document.getElementById('buzz-container');
    if (!container) return;
    try {
      const res = await fetch('/api/buzz/list');
      const items = await res.json();
      if (!Array.isArray(items) || !items.length) {
        container.innerHTML =
          '<p class="buzz-empty">No discussions published yet. Check back soon — we are indexing founder conversations about Indian VCs.</p>';
        container.setAttribute('aria-busy', 'false');
        return;
      }
      container.innerHTML = items.map(renderCard).join('');
      container.setAttribute('aria-busy', 'false');
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p class="buzz-error">Failed to load Investor Buzz.</p>';
      container.setAttribute('aria-busy', 'false');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBuzz);
  } else {
    loadBuzz();
  }
})();
