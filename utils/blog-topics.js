/**
 * Rotating topic pool for daily AI blog posts.
 * Topics stay India/VC/founder-focused and cycle so posts stay distinct.
 */
const BLOG_TOPICS = [
    {
        id: 'safe-vs-equity-india',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'SAFE vs Equity: Which Should Indian Founders Choose in 2026?',
        angle: 'Compare SAFE notes and equity rounds for Indian early-stage startups — legal practicality, dilution, investor preference, and when each makes sense.'
    },
    {
        id: 'how-to-write-pitch-deck',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'How to Write a Pitch Deck That Indian VCs Actually Read',
        angle: 'Slide-by-slide guidance for a 10–12 slide deck tailored to Indian early-stage VCs, with common mistakes that kill first meetings.'
    },
    {
        id: 'warm-intro-india',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'How to Get a Warm Intro to a VC in India (Without Being Awkward)',
        angle: 'Practical outreach playbook: who to ask, how to ask, LinkedIn tactics, and what to do when you have zero network.'
    },
    {
        id: 'cap-table-basics',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'Cap Table Basics for First-Time Founders in India',
        angle: 'Explain equity, ESOP pools, dilution across seed/Series A, and red flags that scare institutional investors.'
    },
    {
        id: 'pre-seed-checklist',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'The Pre-Seed Fundraising Checklist for Indian Startups',
        angle: 'What founders should prepare before raising a first institutional cheque — metrics, docs, narrative, and investor list hygiene.'
    },
    {
        id: 'term-sheet-red-flags',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'Term Sheet Red Flags Every Indian Founder Should Spot',
        angle: 'Break down liquidation preference, anti-dilution, board seats, and veto rights in plain English with India-context examples.'
    },
    {
        id: 'valuation-india-early',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'How Early-Stage Valuations Work in India (And How Not to Get Anchored)',
        angle: 'Explain valuation ranges, comparable rounds, and negotiation tactics without over-optimising for vanity numbers.'
    },
    {
        id: 'esop-pool-india',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'Building an ESOP Pool That Attracts Talent in India',
        angle: 'How much to reserve, vesting norms, tax basics at a high level, and how VCs evaluate founder generosity vs dilution.'
    },
    {
        id: 'bridge-round-guide',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'When a Bridge Round Makes Sense (And When It Is a Trap)',
        angle: 'Help founders decide if a bridge is runway insurance or a signal problem, with India-market patterns.'
    },
    {
        id: 'angel-to-institutional',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'From Angel Round to Institutional Seed: What Changes',
        angle: 'Contrast angel vs institutional diligence, data rooms, governance, and founder readiness for the jump.'
    },
    {
        id: 'sector-fintech-thesis',
        categoryLabel: 'VC Research',
        titleHint: 'What Fintech VCs in India Look For in 2026',
        angle: 'Map common fintech theses — compliance, distribution, unit economics — and how founders should position.'
    },
    {
        id: 'sector-saas-thesis',
        categoryLabel: 'VC Research',
        titleHint: 'How Indian SaaS Investors Evaluate Early Traction',
        angle: 'ARR, retention, CAC payback, and India-vs-global GTM — what moves a SaaS deal from curious to term sheet.'
    },
    {
        id: 'sector-climate-thesis',
        categoryLabel: 'VC Research',
        titleHint: 'Climate and Cleantech Investing in India: What Funds Want',
        angle: 'Explain policy tailwinds, hardware vs software bets, and how founders prove climate impact plus commercial path.'
    },
    {
        id: 'micro-vc-vs-tier1',
        categoryLabel: 'VC Research',
        titleHint: 'Micro VCs vs Tier-1 Funds: Who Should You Pitch First?',
        angle: 'Decision framework by stage, cheque size, speed, and signalling — not a generic “bigger is better” take.'
    },
    {
        id: 'corporate-vc-india',
        categoryLabel: 'VC Research',
        titleHint: 'Should You Take Money From a Corporate VC in India?',
        angle: 'Pros/cons of strategic capital — distribution, conflicts, follow-on risk — with practical diligence questions.'
    },
    {
        id: 'family-office-cheques',
        categoryLabel: 'VC Research',
        titleHint: 'Raising From Family Offices in India: What Founders Miss',
        angle: 'How family offices differ from VCs in decision speed, governance needs, and relationship management.'
    },
    {
        id: 'due-diligence-prep',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'How to Survive VC Due Diligence Without Panic',
        angle: 'Checklist for financial, legal, product, and reference diligence with timelines Indian founders typically see.'
    },
    {
        id: 'founder-updates',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'How to Write Investor Updates That Keep VCs Engaged',
        angle: 'Monthly update template: metrics, asks, risks — and why silence kills follow-on interest.'
    },
    {
        id: 'runway-math',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'Runway Math: How Much to Raise and When to Start',
        angle: 'Simple frameworks for months of runway, buffer for India fundraising cycles, and burn discipline signals.'
    },
    {
        id: 'geo-bengaluru-mumbai',
        categoryLabel: 'VC Research',
        titleHint: 'Bengaluru vs Mumbai vs Delhi NCR: Does Location Still Matter for Fundraising?',
        angle: 'Honest take on ecosystem density, investor access, and remote-first realities for Indian startups in 2026.'
    },
    {
        id: 'women-founders-funding',
        categoryLabel: 'VC Research',
        titleHint: 'Fundraising Realities for Women Founders in India — and Practical Levers',
        angle: 'Data-aware, practical guidance: networks, funds with gender theses, and how to navigate bias without fluff.'
    },
    {
        id: 'deeptech-raise',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'How Deeptech Startups Raise in India When Traction Is Slow',
        angle: 'Milestone-based storytelling, grant + equity stacks, and how to talk to VCs who fear long R&D cycles.'
    },
    {
        id: 'consumer-brand-vc',
        categoryLabel: 'VC Research',
        titleHint: 'Can D2C Brands Still Raise VC in India?',
        angle: 'Unit economics, brand moats, and which consumer theses still attract institutional capital.'
    },
    {
        id: 'secondaries-explained',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'Secondary Sales Explained for Indian Startup Founders',
        angle: 'When founder/employee secondaries happen, how they affect cap tables, and what VCs think about them.'
    },
    {
        id: 'board-meetings-101',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'Your First Board Meeting After Raising Institutional Capital',
        angle: 'Agenda, metrics pack, and how to manage board dynamics as a first-time CEO.'
    },
    {
        id: 'follow-on-strategy',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'Planning Your Series A While Closing Seed',
        angle: 'What seed investors expect for follow-on readiness and how to avoid dead-end rounds.'
    },
    {
        id: 'india-global-raise',
        categoryLabel: 'VC Research',
        titleHint: 'Raising From Global VCs as an India-First Startup',
        angle: 'When US/Europe funds care, how to position India market size, and structuring cross-border conversations.'
    },
    {
        id: 'metrics-investors-want',
        categoryLabel: 'Fundraising Fundamentals',
        titleHint: 'The Metrics Indian VCs Actually Ask For (By Stage)',
        angle: 'Pre-seed vs seed vs Series A metric expectations across SaaS, marketplace, and consumer — with examples.'
    }
];

/**
 * Pick the next topic that hasn't been used recently.
 * Falls back to day-of-year rotation if the pool is exhausted.
 */
function pickTopic(recentTopicIds = []) {
    const used = new Set(recentTopicIds.filter(Boolean));
    const unused = BLOG_TOPICS.filter(t => !used.has(t.id));
    const pool = unused.length > 0 ? unused : BLOG_TOPICS;

    const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return pool[dayOfYear % pool.length];
}

module.exports = { BLOG_TOPICS, pickTopic };
