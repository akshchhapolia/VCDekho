/**
 * Founder Buzz ingestion sources — Reddit RSS search feeds + Searlo discovery queries.
 * Feeds/queries are rotated per cron run to stay under Reddit rate limits.
 */

const REDDIT_FEEDS = [
  // —— StartUpIndia (highest signal) ——
  {
    label: 'StartUpIndia-vc-review',
    subreddit: 'StartUpIndia',
    url:
      'https://www.reddit.com/r/StartUpIndia/search.rss?q=VC+experience+OR+investor+interview+OR+due+diligence+OR+term+sheet+OR+ghosted+OR+fundraising+journey&restrict_sr=1&sort=new&t=year'
  },
  {
    label: 'StartUpIndia-vc-scene',
    subreddit: 'StartUpIndia',
    url:
      'https://www.reddit.com/r/StartUpIndia/search.rss?q=indian+VC+OR+venture+capital+experience+OR+pitch+feedback&restrict_sr=1&sort=new&t=year'
  },
  {
    label: 'StartUpIndia-red-flags',
    subreddit: 'StartUpIndia',
    url:
      'https://www.reddit.com/r/StartUpIndia/search.rss?q=red+flag+VC+OR+avoid+investor+OR+%22shit+list%22+OR+toxic+VC&restrict_sr=1&sort=new&t=year'
  },
  {
    label: 'StartUpIndia-term-sheet',
    subreddit: 'StartUpIndia',
    url:
      'https://www.reddit.com/r/StartUpIndia/search.rss?q=%22term+sheet%22+OR+%22partner+call%22+OR+%22investment+committee%22&restrict_sr=1&sort=new&t=year'
  },
  {
    label: 'StartUpIndia-recent',
    subreddit: 'StartUpIndia',
    url:
      'https://www.reddit.com/r/StartUpIndia/search.rss?q=VC+OR+investor+OR+fundraising+OR+raised+from&restrict_sr=1&sort=new&t=month'
  },
  {
    label: 'StartUpIndia-reviews',
    subreddit: 'StartUpIndia',
    url:
      'https://www.reddit.com/r/StartUpIndia/search.rss?q=review+OR+experience+OR+rejected+by+OR+ghosted&restrict_sr=1&sort=new&t=year'
  },

  // —— indianstartups ——
  {
    label: 'indianstartups-vc',
    subreddit: 'indianstartups',
    url:
      'https://www.reddit.com/r/indianstartups/search.rss?q=VC+OR+investor+experience+OR+fundraising+experience+OR+raised+seed&restrict_sr=1&sort=new&t=year'
  },
  {
    label: 'indianstartups-rejected',
    subreddit: 'indianstartups',
    url:
      'https://www.reddit.com/r/indianstartups/search.rss?q=rejected+OR+ghosted+OR+worst+VC+OR+red+flag+OR+%22waste+of+time%22&restrict_sr=1&sort=new&t=year'
  },
  {
    label: 'indianstartups-recent',
    subreddit: 'indianstartups',
    url:
      'https://www.reddit.com/r/indianstartups/search.rss?q=VC+OR+investor+OR+fundraising+OR+term+sheet&restrict_sr=1&sort=new&t=month'
  },
  {
    label: 'indianstartups-funds',
    subreddit: 'indianstartups',
    url:
      'https://www.reddit.com/r/indianstartups/search.rss?q=blume+OR+%22peak+xv%22+OR+elevation+OR+matrix+OR+antler+experience&restrict_sr=1&sort=new&t=year'
  },

  // —— r/startups + r/venturecapital ——
  {
    label: 'startups-india-vc',
    subreddit: 'startups',
    url:
      'https://www.reddit.com/r/startups/search.rss?q=india+VC+OR+indian+investor+OR+peak+xv+OR+blume+experience&restrict_sr=1&sort=new&t=year'
  },
  {
    label: 'startups-india-recent',
    subreddit: 'startups',
    url:
      'https://www.reddit.com/r/startups/search.rss?q=%22indian+VC%22+OR+%22India+VC%22+OR+india+fundraising&restrict_sr=1&sort=new&t=month'
  },
  {
    label: 'venturecapital-india',
    subreddit: 'venturecapital',
    url:
      'https://www.reddit.com/r/venturecapital/search.rss?q=india+OR+indian+founder+OR+emerging+market&restrict_sr=1&sort=new&t=year'
  },
  {
    label: 'venturecapital-india-founder',
    subreddit: 'venturecapital',
    url:
      'https://www.reddit.com/r/venturecapital/search.rss?q=india+founder+OR+indian+startup+experience&restrict_sr=1&sort=new&t=year'
  },

  // —— Broader founder communities (India-filtered search) ——
  {
    label: 'Entrepreneur-india-vc',
    subreddit: 'Entrepreneur',
    url:
      'https://www.reddit.com/r/Entrepreneur/search.rss?q=india+VC+OR+indian+investor+experience+OR+fundraising+india&restrict_sr=1&sort=new&t=year'
  },
  {
    label: 'SaaS-india-vc',
    subreddit: 'SaaS',
    url:
      'https://www.reddit.com/r/SaaS/search.rss?q=india+OR+indian+VC+OR+fundraising+india&restrict_sr=1&sort=new&t=year'
  },
  {
    label: 'India-startup-vc',
    subreddit: 'india',
    url:
      'https://www.reddit.com/r/india/search.rss?q=startup+VC+OR+venture+capital+founder+experience&restrict_sr=1&sort=new&t=year'
  },
  {
    label: 'Bangalore-startup-vc',
    subreddit: 'bangalore',
    url:
      'https://www.reddit.com/r/bangalore/search.rss?q=startup+VC+OR+fundraising+OR+investor+experience&restrict_sr=1&sort=new&t=year'
  },
  {
    label: 'india_fintech-vc',
    subreddit: 'india_fintech',
    url:
      'https://www.reddit.com/r/india_fintech/search.rss?q=VC+OR+investor+OR+fundraising+OR+raised&restrict_sr=1&sort=new&t=year'
  },

  // —— Global Reddit search (no subreddit) ——
  {
    label: 'global-indian-vc',
    subreddit: null,
    url:
      'https://www.reddit.com/search.rss?q=indian+startup+VC+experience+OR+investor+interview+india&sort=new&t=year'
  },
  {
    label: 'global-indian-vc-recent',
    subreddit: null,
    url:
      'https://www.reddit.com/search.rss?q=indian+founder+VC+experience+OR+rejected+by+VC+india&sort=new&t=month'
  },
  {
    label: 'global-indian-fundraising',
    subreddit: null,
    url:
      'https://www.reddit.com/search.rss?q=%22my+experience%22+indian+VC+OR+fundraising+journey+india&sort=new&t=year'
  }
];

const DISCOVERY_QUERIES = [
  // Core subreddits
  'site:reddit.com/r/StartUpIndia VC experience OR fundraising journey OR investor interview OR due diligence',
  'site:reddit.com/r/StartUpIndia "term sheet" OR "partner meeting" OR "IC meeting" OR ghosted VC',
  'site:reddit.com/r/StartUpIndia blume OR "peak xv" OR sequoia OR accel OR elevation OR kalaari experience',
  'site:reddit.com/r/StartUpIndia rejected by VC OR "red flag" OR "worst VC" OR "shit list"',
  'site:reddit.com/r/StartUpIndia "raised from" OR "my experience" OR fundraising war story',
  'site:reddit.com/r/indianstartups venture capital experience OR raised seed OR term sheet',
  'site:reddit.com/r/indianstartups rejected by VC OR "waste of time" investor OR "due diligence"',
  'site:reddit.com/r/indianstartups "worst VC" OR "best VC" OR ghosted OR "red flag"',
  'site:reddit.com/r/indianstartups antler OR blume OR matrix OR elevation founder experience',
  'site:reddit.com/r/startups india VC OR indian investor interview OR peak xv experience',
  'site:reddit.com/r/startups "india" ("my experience" OR "fundraising process" OR "VC meeting")',
  'site:reddit.com/r/venturecapital india founder OR indian startup experience',
  'site:reddit.com/r/venturecapital "emerging market" india OR indian founder',

  // Broader communities
  'site:reddit.com/r/Entrepreneur india VC experience OR fundraising india',
  'site:reddit.com/r/SaaS india investor OR indian VC OR fundraising india',
  'site:reddit.com/r/bangalore startup VC OR fundraising experience',
  'site:reddit.com/r/india startup venture capital founder experience',
  'site:reddit.com/r/india_fintech VC OR investor meeting OR raised seed',

  // Global + fund-specific
  'site:reddit.com indian startup VC ghosted OR rejected OR "fundraising experience"',
  'site:reddit.com "indian VC" (review OR experience OR "red flag" OR "avoid" OR "raised from")',
  'site:reddit.com "my experience" indian VC OR "fundraising journey" india',
  'site:reddit.com indian founder "term sheet" experience OR diligence',
  'site:reddit.com antler india OR "wtf fund" OR nikhil kamath founder experience',
  'site:reddit.com "100x.vc" OR "3one4" OR stellaris OR "prime venture" founder experience',
  'site:reddit.com "iron pillar" OR waterbridge OR "java capital" OR growx founder experience',
  'site:reddit.com/r/StartUpIndia "partner call" OR "investment committee" OR cap table negotiation',
  'site:reddit.com/r/indianstartups "months to raise" OR "pitch feedback" OR "IC rejection"'
];

/** Pick a rotating slice so each cron run hits a different subset (avoids Reddit 429). */
function rotateSlice(items, batchSize, batchIndex) {
  if (!items.length) return [];
  const size = Math.max(1, Math.min(batchSize, items.length));
  const batches = Math.ceil(items.length / size);
  const idx = ((batchIndex % batches) + batches) % batches;
  const start = idx * size;
  return items.slice(start, start + size);
}

function feedBatchForRun(batchIndex) {
  return rotateSlice(REDDIT_FEEDS, 6, batchIndex);
}

function queryBatchForRun(batchIndex) {
  return rotateSlice(DISCOVERY_QUERIES, 8, batchIndex);
}

module.exports = {
  REDDIT_FEEDS,
  DISCOVERY_QUERIES,
  rotateSlice,
  feedBatchForRun,
  queryBatchForRun
};
