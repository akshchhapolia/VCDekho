(function () {
  const VOTER_KEY = 'vc_buzz_voter';
  const VOTES_KEY = 'vc_buzz_votes';
  const BODY_CLAMP = 320;

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function cleanTitle(title) {
    return String(title || '')
      .replace(/\s*:\s*r\/\w+\s*-\s*Reddit\s*$/i, '')
      .replace(/\s*-\s*Reddit\s*$/i, '')
      .trim();
  }

  function stripBody(raw) {
    return String(raw || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function normalizeSentiment(s) {
    const v = String(s || 'neutral').toLowerCase();
    if (v === 'positive') return 'positive';
    if (v === 'negative') return 'negative';
    return 'neutral';
  }

  function sentimentLabel(s) {
    const n = normalizeSentiment(s);
    return { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' }[n];
  }

  function getVoterKey() {
    try {
      let k = localStorage.getItem(VOTER_KEY);
      if (!k) {
        k =
          (crypto.randomUUID && crypto.randomUUID()) ||
          'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(VOTER_KEY, k);
      }
      return k;
    } catch (_) {
      return 'anon-' + Math.random().toString(36).slice(2);
    }
  }

  function getStoredVotes() {
    try {
      return JSON.parse(localStorage.getItem(VOTES_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function setStoredVote(slug, vote) {
    const map = getStoredVotes();
    if (vote === 0) delete map[slug];
    else map[slug] = vote;
    try {
      localStorage.setItem(VOTES_KEY, JSON.stringify(map));
    } catch (_) {}
  }

  function renderBodySection(body) {
    const text = stripBody(body);
    if (!text) {
      return '<p class="buzz-post-body buzz-post-body--empty">Original post text unavailable — open the Reddit thread for the full discussion.</p>';
    }
    const long = text.length > BODY_CLAMP;
    return `
      <section class="buzz-section">
        <h3 class="buzz-section-label">Post</h3>
        <div class="buzz-post-body${long ? ' is-clamped' : ''}" data-buzz-body>${esc(text)}</div>
        ${long ? '<button type="button" class="buzz-expand-btn" data-buzz-expand aria-expanded="false">Read full post</button>' : ''}
      </section>`;
  }

  function renderCard(item) {
    const topics = item.topics || [];
    const dateStr = formatDate(item.published_at || item.published_at_source);
    const sub = item.subreddit ? `r/${item.subreddit}` : 'Reddit';
    const title = cleanTitle(item.title);
    const sentiment = normalizeSentiment(item.sentiment);
    const storedVote = getStoredVotes()[item.slug] || 0;
    const slugs = item.investor_slugs || [];
    const names = item.investor_names || [];

    const fundBlock =
      slugs.length > 0
        ? `<section class="buzz-section">
            <h3 class="buzz-section-label">Fund in conversation</h3>
            <div class="buzz-fund-list">${slugs
              .map((slug, i) => {
                const label = names[i] || slug;
                return `<a href="/funds/${encodeURIComponent(slug)}" class="buzz-fund-pill">${esc(label)}</a>`;
              })
              .join('')}</div>
          </section>`
        : '';

    return `
      <article class="buzz-card" data-slug="${esc(item.slug)}" id="buzz-${esc(item.slug)}">
        <header class="buzz-post-header">
          <div class="buzz-card-head">
            <span class="buzz-source-badge buzz-source-reddit">Reddit</span>
            <span class="buzz-meta">${esc(sub)} · ${esc(dateStr)}</span>
          </div>
          <h2 class="buzz-card-title">${esc(title)}</h2>
        </header>

        ${renderBodySection(item.body_excerpt)}

        ${
          item.ai_summary
            ? `<section class="buzz-section buzz-summary-box">
            <h3 class="buzz-section-label">AI Summary</h3>
            <p class="buzz-summary-text">${esc(item.ai_summary)}</p>
          </section>`
            : ''
        }

        ${
          topics.length
            ? `<section class="buzz-section">
            <h3 class="buzz-section-label">Topics</h3>
            <div class="buzz-topic-chips">${topics.map((t) => `<span class="buzz-topic-chip">${esc(t)}</span>`).join('')}</div>
          </section>`
            : ''
        }

        ${fundBlock}

        <section class="buzz-section buzz-sentiment-row">
          <h3 class="buzz-section-label">Sentiment</h3>
          <span class="buzz-sentiment-badge buzz-sentiment--${sentiment}">${sentimentLabel(item.sentiment)}</span>
        </section>

        <footer class="buzz-card-footer">
          <a href="${esc(item.source_url)}" class="buzz-read-original" target="_blank" rel="noopener noreferrer">Read original on Reddit →</a>

          <div class="buzz-interest" data-interest-root>
            <span class="buzz-interest-label">Interested in this?</span>
            <div class="buzz-interest-actions">
              <button type="button" class="buzz-vote-btn buzz-vote-up${storedVote === 1 ? ' is-active' : ''}" data-vote="1" aria-label="Yes, interested">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v12H3V10h4zm2-8 8 9h5l-4.5 8H9V2z"/></svg>
                <span class="buzz-vote-count" data-count="up">${item.interest_up || 0}</span>
              </button>
              <button type="button" class="buzz-vote-btn buzz-vote-down${storedVote === -1 ? ' is-active' : ''}" data-vote="-1" aria-label="Not interested">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 14V2h4v12h-4zm-2 8-8-9H2l4.5-8H13v17z"/></svg>
                <span class="buzz-vote-count" data-count="down">${item.interest_down || 0}</span>
              </button>
            </div>
          </div>
        </footer>
      </article>`;
  }

  function initExpandables(root) {
    root.querySelectorAll('[data-buzz-expand]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const body = btn.previousElementSibling;
        if (!body) return;
        const expanded = !body.classList.contains('is-expanded');
        body.classList.toggle('is-expanded', expanded);
        body.classList.toggle('is-clamped', !expanded);
        btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        btn.textContent = expanded ? 'Show less' : 'Read full post';
      });
    });
  }

  async function submitVote(card, vote) {
    const slug = card.dataset.slug;
    if (!slug) return;

    const stored = getStoredVotes()[slug] || 0;
    const nextVote = stored === vote ? 0 : vote;

    try {
      const res = await fetch('/api/ops?action=buzz-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, voterKey: getVoterKey(), vote: nextVote })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Vote failed');

      setStoredVote(slug, data.user_vote || 0);
      card.querySelector('[data-count="up"]').textContent = data.interest_up || 0;
      card.querySelector('[data-count="down"]').textContent = data.interest_down || 0;
      card.querySelector('.buzz-vote-up').classList.toggle('is-active', data.user_vote === 1);
      card.querySelector('.buzz-vote-down').classList.toggle('is-active', data.user_vote === -1);
    } catch (err) {
      console.error(err);
    }
  }

  function initVotes(root) {
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.buzz-vote-btn');
      if (!btn) return;
      e.preventDefault();
      const card = btn.closest('.buzz-card');
      if (!card) return;
      submitVote(card, Number(btn.dataset.vote));
    });
  }

  async function loadBuzz() {
    const container = document.getElementById('buzz-container');
    if (!container || container.dataset.mode === 'detail') return;

    try {
      const res = await fetch('/api/news/list?feed=buzz');
      const items = await res.json();
      if (!Array.isArray(items) || !items.length) {
        container.innerHTML =
          '<p class="buzz-empty">No founder VC reviews published yet. We index Reddit threads where founders share fundraising experiences — check back soon.</p>';
        container.setAttribute('aria-busy', 'false');
        return;
      }
      container.innerHTML = items.map(renderCard).join('');
      container.setAttribute('aria-busy', 'false');
      initExpandables(container);
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p class="buzz-error">Failed to load Investor Buzz.</p>';
      container.setAttribute('aria-busy', 'false');
    }
  }

  function initBuzzPage() {
    const container = document.getElementById('buzz-container');
    if (container) initVotes(container);
    if (container && container.dataset.mode === 'detail') {
      initExpandables(container);
      container.setAttribute('aria-busy', 'false');
      return;
    }
    loadBuzz();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBuzzPage);
  } else {
    initBuzzPage();
  }

  window.VCBuzz = { renderCard, initExpandables, initVotes };
})();
