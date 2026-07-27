/**
 * Investment stage guide pages — deep founder-facing content for India fundraising.
 * IDs align with investors.json stageIds: pre-seed, seed, pre-series-a, series-a, series-b, series-c
 */
const INVESTMENT_STAGES = [
  {
    id: 'pre-seed',
    label: 'Pre-Seed',
    eyebrow: 'Investment stage',
    summary: 'The first institutional or angel cheque — when conviction, wedge, and team matter more than polished metrics.',
    order: 1,
    writeup: `Pre-seed in India is the stage where a company is still mostly a hypothesis: a sharp problem, an early product or prototype, and a founding team that can learn faster than the market moves. Capital here is usually the first meaningful external cheque — angels, micro-VCs, accelerators, or seed funds writing small tickets — meant to buy enough runway to find a wedge and early signal.

Investors at this stage underwrite founder-market fit, insight quality, and speed of iteration more than dashboards. They expect messy decks, evolving GTM, and honesty about what is unknown. In return, they move faster than later-stage funds and often help with hiring intros, customer conversations, and shaping the seed narrative.

For founders, the job of pre-seed is not to look like a Series A company. It is to prove you can turn capital into learning: ship, talk to users, tighten the wedge, and create the evidence that unlocks a real seed process.`,
    snapshot: {
      chequeRange: 'Often $25K–$500K (varies widely)',
      maturity: 'Idea → MVP / early users',
      roundPurpose: 'Build product + find wedge signal',
      diligence: 'Light–moderate',
      capitalTypes: 'Angels, micro-VCs, accelerators'
    },
    whoItFits: [
      'Founders raising a first cheque with a prototype, pilot, or early waitlist',
      'Teams with a clear wedge and founder-market fit story',
      'Companies that need believers before a crowded seed process'
    ],
    whoDoesntFit: [
      'Teams already at clear product-market fit seeking a large primary',
      'Founders without a crisp problem narrative or ownership of the insight',
      'Businesses that need heavy growth capital before any product exists'
    ],
    whatInvestorsLookFor: [
      'Why this team is uniquely positioned to win the problem',
      'A narrow wedge — not a 10-slide TAM fantasy',
      'Early signal: demos, pilots, letters of intent, or usage — even if small',
      'Speed of learning and honesty about unknowns',
      'A realistic 12–18 month use of funds'
    ],
    whatToPrepare: [
      'A short deck: problem, why now, wedge, product, team, ask',
      'One sharp demo or customer story',
      'Milestone plan this cheque must buy',
      'Cap table cleanliness and round structure (SAFE/equity high-level)'
    ],
    roundConstruction: [
      'Often a lead angel/micro-VC plus a syndicate fill',
      'Accelerators may provide structured capital + program support',
      'Keep room for a proper seed lead later — avoid over-optimizing ownership at day zero',
      'Warm intros still outperform cold outreach for most first cheques'
    ],
    commonMistakes: [
      'Pitching Series A metrics you do not have yet',
      'Raising too much without a learning plan (or too little to reach signal)',
      'Claiming a category without a wedge customer',
      'Ignoring follow-on reality — who helps you raise seed next?'
    ],
    relatedThesisIds: ['pre-seed-day-zero', 'micro-vc', 'angel-syndicates', 'accelerator-studio', 'early-stage-builders']
  },
  {
    id: 'seed',
    label: 'Seed',
    eyebrow: 'Investment stage',
    summary: 'First institutional building capital — turn early signal into a product, team, and path toward product-market fit.',
    order: 2,
    writeup: `Seed is where many Indian startups take their first true institutional round. The company usually has more than a slide: early users, pilots, revenue, or a product in market. Seed capital is meant to hire the core team, harden the product, and generate the evidence that makes Series A conversations serious.

Seed investors still underwrite founder quality heavily, but they want more proof than pre-seed: retention hints, pipeline quality, design partners, or early unit economics direction. Diligence is deeper, process is slower, and round construction matters — who leads, who follows, and whether the syndicate helps or clutters.

A strong seed round buys you the right to learn with intensity for 18–24 months. A weak seed round buys vanity runway without a milestone map. Founders should raise against a clear definition of “what good looks like” before the next round.`,
    snapshot: {
      chequeRange: 'Often $0.5M–$3M+ (fund-dependent)',
      maturity: 'Early traction / product in market',
      roundPurpose: 'Team + product + PMF evidence',
      diligence: 'Moderate',
      capitalTypes: 'Seed VCs, micro-VCs, angels, FO cheques'
    },
    whoItFits: [
      'Teams with early traction seeking a lead seed investor',
      'Founders ready to hire a core product/GTM team',
      'Companies that can articulate the next 18 months of proof points'
    ],
    whoDoesntFit: [
      'Idea-only companies with no wedge or learning plan (fit pre-seed first)',
      'Companies already at Series A metrics shopping a “seed” label for easier terms',
      'Founders unwilling to run a real process with a lead'
    ],
    whatInvestorsLookFor: [
      'Evidence of demand: usage, revenue, pilots, or strong design partners',
      'A credible wedge and ICP',
      'Early retention or engagement quality — not only acquisition spikes',
      'Team plan for the critical next hires',
      'Capital efficiency mindset and clarity on what seed must prove'
    ],
    whatToPrepare: [
      'Deck + data room basics (metrics, product, team bios)',
      'Pipeline or cohort snapshots if available',
      'Hiring plan and use of funds',
      'Target lead profile and round size rationale'
    ],
    roundConstruction: [
      'Prefer a clear lead who sets terms and owns the process',
      'Angels and micro-VCs often fill around a lead',
      'Avoid a large party round with no owner',
      'Align on follow-on expectations before you celebrate the close'
    ],
    commonMistakes: [
      'Optimizing valuation over lead quality',
      'Raising seed without defining Series A entry criteria',
      'Over-hiring before the wedge is sharp',
      'Treating every interested cheque as must-take capital'
    ],
    relatedThesisIds: ['early-stage-builders', 'seed-specialists', 'founder-led', 'micro-vc', 'series-a-pmf']
  },
  {
    id: 'pre-series-a',
    label: 'Pre-Series A',
    eyebrow: 'Investment stage',
    summary: 'The bridge between seed and Series A — sharpen PMF signals, extend runway, and de-risk the next primary.',
    order: 3,
    writeup: `Pre-Series A in India is often a bridge: you have more traction than a classic seed company, but you are not yet a clean Series A story. The round may extend runway, fund a critical hire, deepen a wedge market, or give you time to convert early signal into repeatable growth metrics.

Investors here can be existing backers doubling down, new seed/A funds writing an early cheque, or growth-curious seed investors. Diligence starts to look more like Series A — cohorts, funnel, contribution margins — even if the cheque is smaller.

Founders should treat pre-Series A as intentional, not accidental. Be explicit about what this capital buys and what Series A will require. A bridge without a plan becomes a soft down-round narrative later; a bridge with milestones can be the smartest capital you raise.`,
    snapshot: {
      chequeRange: 'Often bridge-sized; highly deal-specific',
      maturity: 'Traction present; PMF still hardening',
      roundPurpose: 'De-risk Series A / extend proof runway',
      diligence: 'Moderate–heavy',
      capitalTypes: 'Existing investors, seed/A funds, select FOs'
    },
    whoItFits: [
      'Seed-funded teams close to Series A but needing 6–12 more months of proof',
      'Companies with strong wedge traction that is not yet fully repeatable',
      'Founders who want to raise from believers before a full A process'
    ],
    whoDoesntFit: [
      'Companies with no seed traction using “pre-A” as branding',
      'Teams that actually need a full Series A primary and process',
      'Businesses where the gap to A is strategy, not runway'
    ],
    whatInvestorsLookFor: [
      'Clear gap analysis: what is missing for Series A',
      'Evidence that the wedge works and is expanding',
      'Cohort or funnel directionality',
      'Credible plan for the bridge period',
      'Existing investor support and clean governance'
    ],
    whatToPrepare: [
      'A one-pager: why bridge, milestones, ask',
      'Updated metrics pack vs last raise',
      'Series A target criteria you are aiming at',
      'Alignment note from current lead/backers if possible'
    ],
    roundConstruction: [
      'Often insider-led or insider-participated',
      'New capital should strengthen the A pathway, not confuse the story',
      'Keep terms sensible — bridges can haunt later rounds if structured poorly',
      'Be transparent with new investors about timeline to A'
    ],
    commonMistakes: [
      'Calling it pre-A without a Series A destination defined',
      'Using bridge capital to avoid hard product or GTM decisions',
      'Raising a mini-party round with no narrative owner',
      'Letting bridge terms create painful preferences later'
    ],
    relatedThesisIds: ['series-a-pmf', 'early-stage-builders', 'bootstrapped-profit', 'growth-scale']
  },
  {
    id: 'series-a',
    label: 'Series A',
    eyebrow: 'Investment stage',
    summary: 'Fund the jump from early traction to a repeatable growth engine and a serious category position.',
    order: 4,
    writeup: `Series A is the stage where investors ask whether the company can become a scaled business — not only whether the founder is impressive. In India, that usually means clearer ICP, repeatable acquisition or sales motion, improving retention or NRR, and a plan to turn capital into durable growth.

Diligence gets heavier: cohorts, unit economics, pipeline quality, competitive reality, and hiring plan. Process lengthens. Narrative still matters, but numbers carry more of the story. Founders who still pitch only vision get pushed; founders who can separate “proven” from “bet” do better.

A strong Series A buys the right to build a machine — product depth, GTM capacity, and leadership layers. It should leave you closer to category leadership, not only larger vanity metrics.`,
    snapshot: {
      chequeRange: 'Often multi-million; fund-dependent',
      maturity: 'PMF emerging → early scale motion',
      roundPurpose: 'Build repeatable growth engine',
      diligence: 'Heavy',
      capitalTypes: 'Institutional VCs (lead + syndicate)'
    },
    whoItFits: [
      'Companies with real traction and a path to repeatable growth',
      'Teams ready for institutional process and board expectations',
      'Founders who can staff GTM and product for the next phase'
    ],
    whoDoesntFit: [
      'Pre-PMF companies hoping branding upgrades the stage',
      'Teams unwilling to share clean metrics and cohorts',
      'Founders not ready for governance and hiring intensity'
    ],
    whatInvestorsLookFor: [
      'Retention, NRR, or engagement quality appropriate to the model',
      'Evidence of a repeatable sales or acquisition motion',
      'Unit economics direction and payback thinking',
      'Competitive moat thesis that survives scrutiny',
      'Leadership plan beyond the founding team'
    ],
    whatToPrepare: [
      'Full metrics pack and cohort views',
      'GTM playbook and pipeline reality',
      '18–24 month operating plan tied to use of funds',
      'Referenceable customers and honest churn narrative'
    ],
    roundConstruction: [
      'A strong lead is usually worth more than a slightly higher valuation',
      'Syndicate specialists (geo, sector, talent) can add real value',
      'Expect term-sheet negotiation and deeper legal process',
      'Board composition and information rights become real'
    ],
    commonMistakes: [
      'Raising A on acquisition spikes without retention',
      'Underestimating hiring and org complexity post-close',
      'Shopping 20 funds without a process narrative',
      'Ignoring competitive reality in the deck'
    ],
    relatedThesisIds: ['series-a-pmf', 'saas-b2b', 'fintech', 'growth-scale', 'bootstrapped-profit']
  },
  {
    id: 'series-b',
    label: 'Series B',
    eyebrow: 'Investment stage',
    summary: 'Scale what works — expand markets, products, and teams with institutional growth capital.',
    order: 5,
    writeup: `Series B is scale capital. The company should already work in a meaningful sense: a proven motion, clearer unit economics, and a category position worth defending. B capital typically funds geographic expansion, new products, enterprise motion, brand, or leadership depth.

Investors underwrite efficiency and durability more than romance. They ask how the next dollar creates enterprise value, where competition will pressure margins, and whether the org can absorb growth without breaking culture or quality. Diligence resembles a lighter growth-equity process: financials, cohorts, sales efficiency, and governance.

Founders raising B should sound like operators of a company, not only inventors of a product. The story shifts from “can this work?” to “how big and how cleanly?”`,
    snapshot: {
      chequeRange: 'Larger institutional cheques',
      maturity: 'Proven motion; scaling',
      roundPurpose: 'Expand market / product / org',
      diligence: 'Heavy',
      capitalTypes: 'Growth VCs, late-seed crossover, select PE growth'
    },
    whoItFits: [
      'Companies with proven PMF and scaling GTM',
      'Teams expanding into new segments, cities, or products',
      'Founders ready for deeper governance and operating cadence'
    ],
    whoDoesntFit: [
      'Companies still searching for a repeatable motion',
      'Teams with messy financials and no operating rhythm',
      'Businesses where growth is only paid acquisition without retention'
    ],
    whatInvestorsLookFor: [
      'Efficient growth metrics (burn multiple, payback, sales efficiency)',
      'Durable retention and expansion revenue where relevant',
      'Category position and competitive durability',
      'Org design and leadership bench',
      'A capital plan that compounds, not just inflates'
    ],
    whatToPrepare: [
      'Board-ready financials and cohort reporting',
      'Expansion thesis with evidence from the wedge market',
      'Hiring and leadership plan',
      'Clear view of risks: competition, regulation, concentration'
    ],
    roundConstruction: [
      'Leads are often growth-oriented funds with larger reserves',
      'Existing A investors may pro-rata meaningfully',
      'Secondary / partial liquidity conversations can appear — handle carefully',
      'Governance upgrades are normal and expected'
    ],
    commonMistakes: [
      'Scaling GTM before the wedge market is truly won',
      'Raising B to paper over weak unit economics',
      'Ignoring culture and quality while chasing growth',
      'Overbuilding org layers too early'
    ],
    relatedThesisIds: ['growth-scale', 'platform-marketplace', 'consumer-d2c', 'saas-b2b', 'india-first']
  },
  {
    id: 'series-c',
    label: 'Series C+ / Growth',
    eyebrow: 'Investment stage',
    summary: 'Late-stage and growth capital for category leaders expanding aggressively with institutional scrutiny.',
    order: 6,
    writeup: `Series C and later growth rounds fund companies that are already category-relevant — often multi-product, multi-market, or approaching meaningful scale. Capital may support international expansion, M&A, working-capital intensive growth, or a path toward profitability and eventual exit options.

Diligence is institutional: audited or audit-ready financials, deeper cohort analysis, competitive teardown, and governance maturity. Investors care about durability of growth, path to efficient scale, and downside protection. Narrative still matters, but the bar for proof is high.

Founders at this stage are building companies that can survive cycles. The best raises clarify the destination — market leadership, profitability path, or strategic options — and use capital as a tool, not a substitute for operating excellence.`,
    snapshot: {
      chequeRange: 'Large growth cheques / rounds',
      maturity: 'Scale-up / category leadership',
      roundPurpose: 'Expansion, durability, strategic options',
      diligence: 'Very heavy',
      capitalTypes: 'Growth equity, late-stage VC, crossover, PE'
    },
    whoItFits: [
      'Scaled companies with clear category position',
      'Teams expanding internationally or via new lines of business',
      'Founders preparing for long-term durability and institutional capital'
    ],
    whoDoesntFit: [
      'Early-stage companies using “growth” as aspiration branding',
      'Businesses without clean financial reporting',
      'Teams not ready for institutional governance expectations'
    ],
    whatInvestorsLookFor: [
      'Durable growth and quality of revenue',
      'Path to efficient scale / profitability narrative',
      'Competitive moat at scale',
      'Leadership depth and board maturity',
      'Capital allocation discipline'
    ],
    whatToPrepare: [
      'Institutional-grade data room',
      'Multi-year plan with scenarios',
      'Clear use of funds and KPI tree',
      'Governance, compliance, and risk disclosures'
    ],
    roundConstruction: [
      'Often led by growth specialists with large check capacity',
      'May include crossover or PE-style processes',
      'Secondary processes can be significant — align early',
      'Terms and governance reflect late-stage norms'
    ],
    commonMistakes: [
      'Raising growth capital without an operating system to deploy it',
      'Chasing vanity scale that destroys unit economics',
      'Under-investing in finance, compliance, and leadership bench',
      'Treating late-stage raises like seed storytelling'
    ],
    relatedThesisIds: ['growth-scale', 'family-offices', 'bootstrapped-profit', 'india-first']
  }
];

module.exports = { INVESTMENT_STAGES };
