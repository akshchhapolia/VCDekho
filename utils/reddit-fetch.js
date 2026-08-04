/**
 * Fetch full Reddit post text for Founder Buzz.
 * Order: Arctic Shift → PullPush → reddit.com JSON
 */

const UA =
  'Mozilla/5.0 (compatible; VCDekhoBot/1.0; +https://vcdekho.com)';

function extractRedditPostId(sourceUrl) {
  const m = String(sourceUrl || '').match(/\/comments\/([a-z0-9]+)/i);
  return m ? m[1] : null;
}

function normalizeRedditJsonUrl(sourceUrl) {
  const clean = String(sourceUrl || '')
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '');
  if (!clean.includes('reddit.com')) return null;
  return `${clean}.json?raw_json=1`;
}

function decodeRedditText(raw) {
  return String(raw || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function toPostResult(post) {
  if (!post) return null;
  const selftext = decodeRedditText(post.selftext || '');
  if (!selftext) return null;
  return {
    selftext,
    title: decodeRedditText(post.title || ''),
    comment_count: post.num_comments || 0,
    subreddit: post.subreddit || null
  };
}

async function fetchFromArcticShift(postId) {
  const url = `https://arctic-shift.photon-reddit.com/api/posts/ids?ids=${encodeURIComponent(postId)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`ArcticShift ${res.status}`);
  const data = await res.json();
  const post = Array.isArray(data.data) ? data.data[0] : null;
  return toPostResult(post);
}

async function fetchFromPullPush(postId) {
  const url = `https://api.pullpush.io/reddit/search/submission/?ids=${encodeURIComponent(postId)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`PullPush ${res.status}`);
  const data = await res.json();
  const post = Array.isArray(data.data) ? data.data[0] : null;
  return toPostResult(post);
}

async function fetchFromRedditJson(sourceUrl) {
  const jsonUrl = normalizeRedditJsonUrl(sourceUrl);
  if (!jsonUrl) return null;
  const res = await fetch(jsonUrl, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`Reddit JSON ${res.status}`);
  const text = await res.text();
  if (!text.trim().startsWith('[')) throw new Error('Reddit JSON blocked');
  const data = JSON.parse(text);
  const post = data[0]?.data?.children?.[0]?.data;
  return toPostResult(post);
}

/**
 * @param {string} sourceUrl Reddit thread URL
 * @returns {Promise<{selftext:string,title:string,comment_count:number,subreddit:string|null}|null>}
 */
async function fetchRedditPost(sourceUrl) {
  const postId = extractRedditPostId(sourceUrl);
  if (!postId) return null;

  try {
    const hit = await fetchFromArcticShift(postId);
    if (hit) return hit;
  } catch (err) {
    console.warn('ArcticShift fetch failed:', err.message);
  }

  try {
    const hit = await fetchFromPullPush(postId);
    if (hit) return hit;
  } catch (err) {
    console.warn('PullPush fetch failed:', err.message);
  }

  try {
    return await fetchFromRedditJson(sourceUrl);
  } catch (err) {
    console.warn('Reddit JSON fetch failed:', err.message);
    return null;
  }
}

module.exports = { fetchRedditPost, extractRedditPostId, decodeRedditText };
