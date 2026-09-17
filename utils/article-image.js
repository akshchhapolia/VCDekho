/**
 * Resolve a hero image for news / digest / blog cards.
 * Prefer the source RSS or og:image; fall back to a curated Unsplash still.
 */
const UA = 'Mozilla/5.0 (compatible; VCDekhoBot/1.0; +https://vcdekho.com)';

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1573164713714-d95e436db8d1?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1600&auto=format&fit=crop'
];

function isUsableImageUrl(raw) {
  if (!raw || typeof raw !== 'string') return false;
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return false;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)\b/i.test(url)) return false;
  if (/\.(mp3|mp4|m4a|wav|aac|pdf|xml|json)(\?|$)/i.test(url)) return false;
  if (/doubleclick|googletagmanager|facebook\.com\/tr|pixel\.|1x1|spacer\.(gif|png)/i.test(url)) {
    return false;
  }
  return true;
}

function attr(obj, key) {
  if (!obj || typeof obj !== 'object') return '';
  if (obj[key]) return obj[key];
  if (obj.$ && obj.$[key]) return obj.$[key];
  return '';
}

function urlsFromCandidate(candidate, acc = []) {
  if (!candidate) return acc;
  if (Array.isArray(candidate)) {
    for (const item of candidate) urlsFromCandidate(item, acc);
    return acc;
  }
  if (typeof candidate === 'string') {
    acc.push(candidate.trim());
    return acc;
  }
  if (typeof candidate === 'object') {
    const type = String(attr(candidate, 'type') || attr(candidate, 'medium') || '').toLowerCase();
    if (type && !type.includes('image') && type !== 'photo' && type !== 'thumbnail') {
      return acc;
    }
    const url = attr(candidate, 'url') || attr(candidate, 'href') || candidate.url || candidate.href;
    if (url) acc.push(String(url).trim());
  }
  return acc;
}

function imageFromHtml(html) {
  const s = String(html || '');
  const og =
    s.match(/property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)/i) ||
    s.match(/content=["']([^"']+)["'][^>]*property=["']og:image(?::url)?["']/i);
  if (og && og[1]) return og[1].trim();
  const img = s.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img && img[1] ? img[1].trim() : null;
}

function imageFromRssItem(item) {
  if (!item || typeof item !== 'object') return null;
  const candidates = [];
  urlsFromCandidate(item.enclosure, candidates);
  urlsFromCandidate(item.itunes && item.itunes.image, candidates);
  urlsFromCandidate(item.image, candidates);
  urlsFromCandidate(item.mediaThumbnail, candidates);
  urlsFromCandidate(item.mediaContent, candidates);
  urlsFromCandidate(item['media:content'], candidates);
  urlsFromCandidate(item['media:thumbnail'], candidates);
  const htmlBits = [
    item.contentEncoded,
    item['content:encoded'],
    item.content,
    item.description
  ];
  for (const html of htmlBits) {
    const fromHtml = imageFromHtml(html);
    if (fromHtml) candidates.push(fromHtml);
  }
  for (const url of candidates) {
    if (isUsableImageUrl(url)) return url;
  }
  return null;
}

async function ogImageFromUrl(pageUrl) {
  if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) return null;
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(4500)
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 80000);
    const url = imageFromHtml(html);
    return isUsableImageUrl(url) ? url : null;
  } catch (_) {
    return null;
  }
}

function fallbackHeroImage(seed) {
  const s = String(seed || 'news');
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash + s.charCodeAt(i) * (i + 1)) % HERO_IMAGES.length;
  }
  return HERO_IMAGES[hash];
}

/**
 * RSS image → page og:image → Unsplash hero. Always returns a URL.
 */
async function resolveArticleImage({ rssImage, sourceUrl, seed } = {}) {
  if (isUsableImageUrl(rssImage)) return String(rssImage).trim();
  const fromOg = await ogImageFromUrl(sourceUrl);
  if (fromOg) return fromOg;
  return fallbackHeroImage(seed || sourceUrl || 'news');
}

module.exports = {
  HERO_IMAGES,
  isUsableImageUrl,
  imageFromHtml,
  imageFromRssItem,
  ogImageFromUrl,
  fallbackHeroImage,
  resolveArticleImage
};
