/**
 * Sector guide pages — deep founder-facing content for India fundraising.
 * IDs align with SECTOR_CANON in scripts/build_investors_json.js.
 */
const SECTOR_GUIDES = [
  {
    id: 'fintech',
    label: 'Fintech',
    eyebrow: 'Sector guide',
    order: 1,
    summary:
      'Payments, lending, wealth, insurance, and embedded finance — how Indian fintech investors underwrite, and how founders should pitch.',
    writeup: `Fintech is still one of the densest venture categories in India. Capital spans UPI-native consumer products, B2B payments and collections, lending and credit infrastructure, wealth and insurance distribution, and embedded finance inside platforms that already own distribution. The common thread is money movement, risk, trust, and regulation — not just a slick app.

Investors in this sector underwrite three things together: (1) whether the product creates real pull at Indian price points, (2) whether unit economics survive without promotional burn, and (3) whether the team understands compliance, partnership banks, and operational risk. A growth curve that is mostly cashback or aggressive underwriting will get challenged quickly after seed.

India’s rails are a structural tailwind — UPI, Aadhaar-linked KYC patterns, account aggregators, and OCEN-style credit plumbing — but they are not a moat by themselves. Moats show up as distribution (merchant density, payroll, marketplace checkout), data that improves underwriting or fraud, switching costs in workflows, or licenses and partner relationships that are hard to replicate.

Fundraising in fintech is narrative plus metric pack. Lead with a crisp wedge (who pays, for what job, why now), then show retention, repayment quality, take rate, or contribution margin — whichever matches your model. Be explicit about licenses, bank partners, and what breaks if a partner changes terms. Warm intros help, but vague “India finance opportunity” decks do not.`,
    snapshot: {
      typicalCheque: 'Seed often $0.5–3M; Series A wider',
      buyer: 'Consumers, SMEs, banks, NBFCs, platforms',
      diligenceFocus: 'Unit economics + compliance + risk',
      indiaEdge: 'UPI, AA, credit rails, Bharat distribution',
      capitalTypes: 'Fintech VCs, multi-stage, FO, CVC banks'
    },
    subsectors: [
      { label: 'Payments & collections', blurb: 'UPI apps, merchant acquiring, payouts, reconciliation' },
      { label: 'Lending & credit infra', blurb: 'Consumer/SME credit, underwriting, collections tech' },
      { label: 'Wealth & insurance', blurb: 'Distribution, advisory tooling, embedded cover' },
      { label: 'Embedded finance', blurb: 'Finance inside commerce, payroll, SaaS, marketplaces' },
      { label: 'Banking / infra tooling', blurb: 'APIs, KYC, fraud, treasury, core-adjacent software' }
    ],
    metricsThatMatter: [
      { label: 'Retention / repeat usage', why: 'Shows pull beyond promotions' },
      { label: 'Take rate or NIM proxy', why: 'Proves you capture value, not only volume' },
      { label: 'CAC payback', why: 'Growth must not destroy contribution' },
      { label: 'Credit quality / NPA signal', why: 'For lending — survival metric' },
      { label: 'Fraud / loss rates', why: 'Operational maturity under scale' },
      { label: 'Partner concentration', why: 'Bank or platform dependency risk' }
    ],
    diligenceMap: [
      { area: 'Unit economics', weight: 92, detail: 'Contribution after variable cost and credit losses' },
      { area: 'Regulation & licenses', weight: 88, detail: 'What you need vs partner-bank model' },
      { area: 'Distribution edge', weight: 80, detail: 'Why users arrive without endless burn' },
      { area: 'Risk controls', weight: 78, detail: 'Fraud, underwriting, ops playbooks' },
      { area: 'Team & ops depth', weight: 70, detail: 'Can you run a regulated machine?' }
    ],
    whoItFits: [
      'Founders moving or intermediating money with a clear wedge',
      'Infra teams selling to banks, NBFCs, or platforms with design partners',
      'Embedded-finance products with owned or partnered distribution',
      'Teams that can discuss compliance and risk without hand-waving'
    ],
    whoDoesntFit: [
      'Pure “AI chatbot for finance” with no distribution or risk edge',
      'Growth stories that only work with unsustainable cashback',
      'Founders treating licenses as a footnote',
      'Horizontal wallets with no differentiated job-to-be-done'
    ],
    whatInvestorsLookFor: [
      'A sharp ICP and job-to-be-done — not “all India finance”',
      'Evidence of pull: retention, repeat pay, or merchant density',
      'Honest unit economics at Indian ticket sizes',
      'Clear regulatory posture and partner map',
      'Why your data or distribution compounds over time',
      'A capital plan that matches credit or growth intensity'
    ],
    whatToPrepare: [
      'Metric pack: cohorts, take rate, CAC, contribution, losses',
      'Compliance one-pager: licenses, partners, data flows',
      'Risk / fraud / underwriting overview (even if early)',
      'Competitive map vs banks, UPI apps, and niche players',
      'Use of funds tied to measurable milestones (not vanity GMV)'
    ],
    fundraisingPlaybook: [
      'Pick the sub-sector narrative first — payments ≠ lending ≠ wealth',
      'Build a 10-slide wedge deck + a separate diligence appendix',
      'Shortlist funds with recent fintech cheques in your sub-sector',
      'Lead with metrics that match your model (retention vs credit)',
      'Surface partner and license risks before they ask',
      'Close with a milestone map: what this round must prove'
    ],
    commonMistakes: [
      'Leading with TAM slides instead of wedge and unit economics',
      'Hiding promotional growth as organic demand',
      'Underestimating partner concentration (one bank, one platform)',
      'Pitching Series A credit books with seed-stage controls',
      'Ignoring collections, disputes, and ops until diligence day'
    ],
    relatedThesisIds: ['fintech', 'india-first', 'saas-b2b', 'platform-marketplace', 'series-a-pmf'],
    relatedStageIds: ['seed', 'series-a', 'pre-series-a']
  },
  {
    id: 'saas',
    label: 'SaaS / Enterprise',
    eyebrow: 'Sector guide',
    order: 2,
    summary:
      'B2B software and enterprise tools — India-for-India and India-for-global — what investors diligence and how to package the story.',
    writeup: `SaaS and enterprise investors underwrite software leverage: recurring revenue, expanding accounts, and a product that becomes harder to rip out. In India the category spans SMB tools for domestic businesses, mid-market vertical SaaS, and global product companies built from Indian engineering hubs selling to the world.

The best pitches separate “we built software” from “we own a workflow.” Investors want to know the buyer, the pain frequency, switching costs, and why you win against horizontal suites, Excels, or incumbent ERPs. Multi-product roadmaps impress less than a wedge that renews and expands.

Sales motion matters. Product-led growth needs activation and retention depth; enterprise sales needs champion maps, procurement realism, and implementation truth. India-for-India sellers should explain longer cycles and price sensitivity; India-for-global sellers should explain trust, support, and why customers buy from an India-based team without defaulting to “cheap engineering.”

Fundraising here is demo + metrics + ICP clarity. Show the aha moment fast. Bring retention or NRR if you have it; if early, bring usage intensity, design-partner letters, and a crisp path to paid. Capital plans should hire against GTM bottlenecks, not vanity feature lists.`,
    snapshot: {
      typicalCheque: 'Seed $0.5–3M; A often $5–15M+',
      buyer: 'SMB, mid-market, enterprise, developers',
      diligenceFocus: 'Retention, NRR, sales motion, wedge',
      indiaEdge: 'Eng talent + India GTM + global product',
      capitalTypes: 'SaaS specialists, multi-stage, micro-VCs'
    },
    subsectors: [
      { label: 'Horizontal productivity', blurb: 'Collab, ops, finance, HR tooling for businesses' },
      { label: 'Vertical SaaS', blurb: 'Industry-specific workflows with deep lock-in' },
      { label: 'Developer / infra', blurb: 'APIs, data, security, observability, AI infra' },
      { label: 'India SMB SaaS', blurb: 'Local compliance, vernacular, payment-native tools' },
      { label: 'Global from India', blurb: 'Product-led companies selling primarily overseas' }
    ],
    metricsThatMatter: [
      { label: 'Logo & revenue retention', why: 'Core SaaS health' },
      { label: 'NRR / expansion', why: 'Can accounts grow without new logos?' },
      { label: 'ACV & sales cycle', why: 'Matches GTM motion to raise size' },
      { label: 'Activation / time-to-value', why: 'PLG and onboarding quality' },
      { label: 'Magic number / CAC payback', why: 'Capital efficiency of GTM' },
      { label: 'Support & implementation load', why: 'True gross margin reality' }
    ],
    diligenceMap: [
      { area: 'Product wedge', weight: 90, detail: 'Job-to-be-done vs spreadsheet/incumbent' },
      { area: 'Retention quality', weight: 88, detail: 'Usage depth, renewals, churn reasons' },
      { area: 'GTM motion fit', weight: 82, detail: 'PLG vs sales-led realism' },
      { area: 'ICP clarity', weight: 78, detail: 'Who buys, who blocks, who champions' },
      { area: 'Technical defensibility', weight: 65, detail: 'Data, workflow, integrations' }
    ],
    whoItFits: [
      'B2B founders with a clear buyer and workflow',
      'Vertical SaaS with design partners renewing',
      'PLG products with expanding usage inside accounts',
      'Global product teams with early paid customers abroad'
    ],
    whoDoesntFit: [
      'Services shops pitching as product companies',
      'Feature factories with no wedge or ICP',
      'Enterprise roadmaps without a champion or pilot path',
      '“AI wrapper” tools with no workflow lock-in'
    ],
    whatInvestorsLookFor: [
      'A demo that shows value in minutes',
      'Proof of retention or expanding usage',
      'ICP discipline — who is not a customer',
      'Honest sales cycle and implementation effort',
      'Why you win vs the default tool',
      'A hiring plan tied to GTM bottlenecks'
    ],
    whatToPrepare: [
      'Live demo + short loom for async review',
      'Cohorts: retention, activation, expansion if available',
      'Pipeline snapshot and win/loss notes',
      'Competitive teardown vs 2–3 real alternatives',
      'Use of funds: product + GTM roles with milestones'
    ],
    fundraisingPlaybook: [
      'Write the wedge in one sentence before the deck',
      'Choose India-for-India vs global narrative — do not blur both',
      'Shortlist funds that have led SaaS at your stage recently',
      'Lead meetings with product, then metrics, then ask',
      'Document churn reasons honestly — it builds trust',
      'Raise against a clear Series A definition of “good”'
    ],
    commonMistakes: [
      'Pitching a platform before a wedge renews',
      'Vanity logos without usage or revenue quality',
      'Underpricing India SMB without a path to ACV growth',
      'Hiding services revenue inside “ARR”',
      'Over-hiring sales before activation works'
    ],
    relatedThesisIds: ['saas-b2b', 'tech-first', 'ai-ml', 'bootstrapped-profit', 'series-a-pmf'],
    relatedStageIds: ['seed', 'series-a', 'series-b']
  },
  {
    id: 'consumer',
    label: 'Consumer / D2C',
    eyebrow: 'Sector guide',
    order: 3,
    summary:
      'Brands, marketplaces, and consumer apps — distribution, habit, and unit economics that survive Indian price points.',
    writeup: `Consumer and D2C capital backs products that win on taste, habit, and distribution — ecommerce brands, marketplaces, consumer apps, and hybrid offline-online services. Investors care less about a clever category name and more about whether users return, whether contribution margins work after marketing, and whether growth can survive paid-channel fatigue.

India adds specific realities: Tier 2/3 density, vernacular discovery, trust and COD dynamics, kirana and quick-commerce adjacency, and brand building that often needs offline proof. Metro launch metrics alone rarely convince a seasoned consumer investor.

The fundraising bar is insight + economics. Show who the customer is, the job you own, proof of repeat behaviour, and a distribution thesis beyond performance ads. Category leaders usually look dense in a wedge city or cohort before they look national. Capital should buy brand and distribution compounding — not endless CAC arbitrage.`,
    snapshot: {
      typicalCheque: 'Seed varies widely; brand rounds differ',
      buyer: 'End consumers (and sometimes merchants)',
      diligenceFocus: 'Repeat, CM, CAC, brand, density',
      indiaEdge: 'Bharat scale, vernacular, hybrid retail',
      capitalTypes: 'Consumer VCs, FO brands, angels'
    },
    subsectors: [
      { label: 'D2C brands', blurb: 'Product brands with owned or hybrid retail' },
      { label: 'Marketplaces', blurb: 'Two-sided consumer or prosumer platforms' },
      { label: 'Consumer apps', blurb: 'Habit products: content, utility, community' },
      { label: 'Commerce enablement', blurb: 'Tools and services around discovery and delivery' },
      { label: 'Offline-online hybrids', blurb: 'Stores, dark stores, experience-led retail' }
    ],
    metricsThatMatter: [
      { label: 'Repeat purchase / retention', why: 'Habit beats one-off spikes' },
      { label: 'Contribution margin', why: 'After logistics and discounts' },
      { label: 'CAC payback', why: 'Paid channels saturate' },
      { label: 'AOV & frequency', why: 'Core commerce health' },
      { label: 'Cohort LTV proxy', why: 'Do early cohorts still buy?' },
      { label: 'City / cohort density', why: 'Wedge before national burn' }
    ],
    diligenceMap: [
      { area: 'Repeat behaviour', weight: 90, detail: 'Habit and repurchase quality' },
      { area: 'Unit economics', weight: 88, detail: 'CM after real discounts and logistics' },
      { area: 'Distribution edge', weight: 84, detail: 'Beyond Meta/Google dependency' },
      { area: 'Brand / insight', weight: 75, detail: 'Why customers care and talk' },
      { area: 'Category structure', weight: 68, detail: 'Room for a winner vs crowded shelf' }
    ],
    whoItFits: [
      'D2C founders with repeat and contribution clarity',
      'Consumer apps with engagement quality, not only downloads',
      'Marketplace builders with liquidity in a wedge geo',
      'Founders building for Bharat or vernacular audiences with proof'
    ],
    whoDoesntFit: [
      'Paid-growth machines with no organic or repeat engine',
      '“Lifestyle brand” decks without unit economics',
      'National expansion plans before local density',
      'Marketplace pitches with one side empty'
    ],
    whatInvestorsLookFor: [
      'A sharp customer insight and wedge cohort',
      'Repeat rates and contribution after real costs',
      'Distribution that is not only performance marketing',
      'Evidence of density in a city or segment',
      'Brand signals: NPS, UGC, organic demand',
      'A capital plan that compounds, not just spends'
    ],
    whatToPrepare: [
      'Cohort charts: repurchase, CM, CAC by channel',
      'Wedge market map (city / persona / category)',
      'Creative and brand narrative samples',
      'Supply / inventory / ops overview if relevant',
      'Competitive shelf and pricing reality'
    ],
    fundraisingPlaybook: [
      'Define the wedge customer before the national story',
      'Separate brand narrative slides from economics slides',
      'Shortlist consumer-specialist funds vs generalists deliberately',
      'Show channel mix honesty — organic vs paid',
      'Raise for the next density milestone, not vanity GMV',
      'Bring offline proof if that is part of the moat'
    ],
    commonMistakes: [
      'Leading with celebrity or influencer vanity',
      'Gross merchandise value without contribution',
      'Expanding cities before one city works',
      'Ignoring returns, COD, and logistics leakage',
      'Copying US consumer playbooks without India pricing'
    ],
    relatedThesisIds: ['consumer-d2c', 'india-first', 'platform-marketplace', 'category-creators', 'growth-scale'],
    relatedStageIds: ['seed', 'series-a', 'pre-seed']
  },
  {
    id: 'ai-ml',
    label: 'AI / ML',
    eyebrow: 'Sector guide',
    order: 4,
    summary:
      'Applied AI and ML products — how investors separate durable businesses from thin wrappers, and what founders must prove.',
    writeup: `AI / ML investors are hunting for leverage that survives model commoditization: proprietary data, evaluation excellence, workflow depth, distribution into a paying buyer, or systems that improve with use. India has deep engineering talent and a surge of AI products; the bar is rising fast on “why not just ChatGPT?”

Strong AI companies usually look vertical. A workflow with clear ROI, measurable accuracy, and switching costs beats a horizontal assistant with demos but no retention. Diligence goes deeper on technical method, eval harnesses, inference cost, and gross margins than a typical consumer pitch.

Founders should pitch the job, the baseline, and the lift. Show before/after for a named ICP, be honest about foundation-model dependency, and explain what becomes defensible over 18 months. Capital often funds data acquisition, GTM into enterprises, and product hardening — not only more GPUs for a vague platform vision.`,
    snapshot: {
      typicalCheque: 'Seed–A vary; infra rounds larger',
      buyer: 'Enterprises, developers, prosumers',
      diligenceFocus: 'Eval lift, data moat, margins, workflow',
      indiaEdge: 'Eng depth + enterprise process complexity',
      capitalTypes: 'AI specialists, deep-tech, SaaS funds'
    },
    subsectors: [
      { label: 'Vertical AI apps', blurb: 'Domain workflows with measurable ROI' },
      { label: 'AI infra / tooling', blurb: 'Eval, observability, orchestration, data' },
      { label: 'Enterprise copilots', blurb: 'Embedded in existing systems of record' },
      { label: 'Speech / vision / docs', blurb: 'India-language and document-heavy use cases' },
      { label: 'Applied research products', blurb: 'Model + product teams with clear buyers' }
    ],
    metricsThatMatter: [
      { label: 'Task accuracy / lift vs baseline', why: 'Core product truth' },
      { label: 'Inference cost per task', why: 'Gross margin reality' },
      { label: 'Weekly active workflows', why: 'Usage beyond novelty' },
      { label: 'Time saved / $ saved', why: 'Enterprise ROI language' },
      { label: 'Data flywheel proof', why: 'Does usage improve the model?' },
      { label: 'Sales cycle & ACV', why: 'If enterprise GTM' }
    ],
    diligenceMap: [
      { area: 'Workflow lock-in', weight: 92, detail: 'Embedded in a real job, not a chat box' },
      { area: 'Evaluation rigor', weight: 88, detail: 'Baselines, harnesses, failure modes' },
      { area: 'Data advantage', weight: 84, detail: 'Proprietary or compounding data' },
      { area: 'Unit economics', weight: 80, detail: 'Inference + human-in-loop costs' },
      { area: 'Model dependency risk', weight: 72, detail: 'What breaks if providers change' }
    ],
    whoItFits: [
      'Applied AI founders with a named ICP and workflow',
      'Vertical tools with measurable lift vs baseline',
      'Infra teams with developer or platform pull',
      'Teams that can discuss evals and failure cases openly'
    ],
    whoDoesntFit: [
      'Thin wrappers on public models with no distribution',
      '“Platform” pitches without a first wedge use case',
      'Demo-ware without retention or ROI proof',
      'Research projects without a buyer path'
    ],
    whatInvestorsLookFor: [
      'Clear job-to-be-done and baseline comparison',
      'Evidence of lift, reliability, and failure handling',
      'A path to defensibility beyond the prompt',
      'Honest cost structure and margin trajectory',
      'Design partners who would be sad if you disappeared',
      'Team depth across product and ML'
    ],
    whatToPrepare: [
      'Eval summary: dataset, baseline, lift, error taxonomy',
      'Architecture one-pager including model providers',
      'Cost model per task / per seat',
      'Pilot case studies with named outcomes',
      'Roadmap from wedge → expansion workflows'
    ],
    fundraisingPlaybook: [
      'Kill the horizontal vision slide until the wedge works',
      'Lead with ROI and evals, then architecture',
      'Shortlist AI-aware funds that understand margins',
      'Bring a technical diligence owner to partner meetings',
      'Separate research risk from product risk in the narrative',
      'Raise for data + GTM milestones, not vague “scale GPUs”'
    ],
    commonMistakes: [
      'Pitching AGI vibes instead of a workflow',
      'Hiding human-in-the-loop costs',
      'No baseline — so “90% accuracy” is meaningless',
      'Enterprise logos that only ran a weekend pilot',
      'Ignoring data rights and privacy early'
    ],
    relatedThesisIds: ['ai-ml', 'tech-first', 'saas-b2b', 'deep-science', 'early-stage-builders'],
    relatedStageIds: ['pre-seed', 'seed', 'series-a']
  },
  {
    id: 'health',
    label: 'Healthcare / Medtech',
    eyebrow: 'Sector guide',
    order: 5,
    summary:
      'Healthtech, care delivery, diagnostics, medtech, and wellness — longer cycles, proof bars, and how to raise credibly in India.',
    writeup: `Healthcare investors in India span digital health, care delivery networks, diagnostics, medtech devices, pharma-adjacent software, and consumer wellness. Timelines are often longer than pure software. Clinical validation, provider adoption, trust, and regulation sit beside product and growth.

Investors ask who pays (patient, employer, insurer, hospital), whether outcomes or cost savings are real, and how you acquire providers or patients without unsustainable subsidies. Device and deep-science stories need stronger evidence packages; consumer wellness needs retention and brand clarity that survives fads.

A credible raise matches capital to milestones: clinical, regulatory, distribution, or unit-economics proofs. Do not hide the long cycle — show why this team can navigate hospitals, doctors, and compliance, and what this round specifically de-risks.`,
    snapshot: {
      typicalCheque: 'Varies; clinical paths need runway',
      buyer: 'Patients, providers, employers, payors',
      diligenceFocus: 'Outcomes, adoption, who pays, regulation',
      indiaEdge: 'Access gaps + digital public rails',
      capitalTypes: 'Health VCs, impact, FO, strategics'
    },
    subsectors: [
      { label: 'Digital health / tele', blurb: 'Access, chronic care, triage, care navigation' },
      { label: 'Care delivery', blurb: 'Clinics, specialty chains, home care' },
      { label: 'Diagnostics', blurb: 'Labs, imaging, at-home testing workflows' },
      { label: 'Medtech / devices', blurb: 'Hardware + software with clinical proof' },
      { label: 'Wellness & consumer health', blurb: 'Retention-led products with real outcomes' }
    ],
    metricsThatMatter: [
      { label: 'Clinical / outcome signal', why: 'Core healthcare truth' },
      { label: 'Provider or patient retention', why: 'Adoption quality' },
      { label: 'Cost to serve', why: 'Unit economics of care' },
      { label: 'Who pays & collection', why: 'Revenue reality' },
      { label: 'Utilization / adherence', why: 'Engagement beyond signup' },
      { label: 'Regulatory milestone progress', why: 'De-risk path' }
    ],
    diligenceMap: [
      { area: 'Clinical credibility', weight: 93, detail: 'Evidence, advisors, protocol quality' },
      { area: 'Go-to-market to providers', weight: 85, detail: 'Sales cycle into hospitals/clinics' },
      { area: 'Payment model', weight: 82, detail: 'Cash, insurance, employer, B2B' },
      { area: 'Regulatory path', weight: 80, detail: 'What must be true to scale' },
      { area: 'Ops excellence', weight: 74, detail: 'Quality, safety, staffing' }
    ],
    whoItFits: [
      'Digital health teams with provider or patient proof',
      'Medtech founders with validation milestones mapped',
      'Care delivery operators with unit economics visibility',
      'Wellness products with retention and outcome claims that hold'
    ],
    whoDoesntFit: [
      'Apps with downloads but no care pathway or outcomes',
      'Device ideas without clinical or manufacturing plan',
      'Founders allergic to regulation and hospital reality',
      '“AI diagnosis” claims without clinical governance'
    ],
    whatInvestorsLookFor: [
      'Clear clinical or operational problem ownership',
      'Evidence of outcomes or cost reduction',
      'A realistic adoption path through providers or employers',
      'Payment and collection honesty',
      'Regulatory and safety awareness',
      'Team mix: clinical + product + ops'
    ],
    whatToPrepare: [
      'Evidence pack: pilots, studies, advisor letters',
      'Care pathway diagram and who pays at each step',
      'Regulatory milestone map tied to the raise',
      'Unit economics of delivery / acquisition',
      'Risk register: clinical, legal, ops'
    ],
    fundraisingPlaybook: [
      'State the clinical claim carefully — precision builds trust',
      'Match investor type to risk (device ≠ consumer wellness)',
      'Raise against milestones, not open-ended R&D',
      'Bring a clinician into key diligence calls when relevant',
      'Separate science risk from distribution risk in the deck',
      'Show why India is the right first market'
    ],
    commonMistakes: [
      'Overclaiming clinical efficacy early',
      'Ignoring who pays until the last slide',
      'Underestimating hospital sales cycles',
      'Consumer growth tactics that break trust in care',
      'Raising too little for a regulatory-heavy path'
    ],
    relatedThesisIds: ['healthtech', 'impact-inclusion', 'deep-science', 'india-first', 'series-a-pmf'],
    relatedStageIds: ['seed', 'series-a', 'pre-series-a']
  },
  {
    id: 'deeptech',
    label: 'Deep Tech',
    eyebrow: 'Sector guide',
    order: 6,
    summary:
      'Hard tech, deep science, semiconductors, robotics, space — patient capital, milestone maps, and India-specific paths to proof.',
    writeup: `Deep tech investors underwrite science and engineering risk: semiconductors, robotics, space, advanced materials, climate hardware, and research-heavy software where the hard part is physics, silicon, or novel systems — not only growth marketing.

Cheque sizes and timelines often differ from classic SaaS. Many Indian deep-tech paths combine venture with incubators, government programs, corporate pilots, and strategic partners. Diligence is evidence-heavy: IP position, technical milestones, manufacturing or deployment path, and the first commercial beachhead.

Founders should lead with the technical wedge and the first customer path. Show why India is an advantage (talent, cost, testbeds, demand) and what milestone this round funds. Vague “platform for everything” deep tech rarely works; a beachhead with a buyer who feels the pain does.`,
    snapshot: {
      typicalCheque: 'Milestone-based; often longer runway',
      buyer: 'Enterprises, gov, defense, industrials',
      diligenceFocus: 'IP, milestones, manufacturability, beachhead',
      indiaEdge: 'Talent, cost, testbeds, policy programs',
      capitalTypes: 'Deep-tech VCs, CVCs, grants, strategics'
    },
    subsectors: [
      { label: 'Semiconductors & electronics', blurb: 'Design, materials, tooling, systems' },
      { label: 'Robotics & autonomy', blurb: 'Industrial, warehouse, specialty robots' },
      { label: 'Space & dual-use', blurb: 'Launch-adjacent, sats, sensing' },
      { label: 'Advanced materials / chem', blurb: 'Lab-to-plant stories' },
      { label: 'Scientific software / bio tools', blurb: 'Hard R&D with product packaging' }
    ],
    metricsThatMatter: [
      { label: 'Technical milestone hit rate', why: 'Execution against physics risk' },
      { label: 'Prototype → pilot conversion', why: 'Commercial reality' },
      { label: 'Gross margin path', why: 'Hardware/software mix honesty' },
      { label: 'IP strength', why: 'Freedom to operate + defensibility' },
      { label: 'Cost per unit trajectory', why: 'Manufacturing learning curve' },
      { label: 'Strategic partner depth', why: 'De-risk distribution' }
    ],
    diligenceMap: [
      { area: 'Technical feasibility', weight: 95, detail: 'Physics, IP, residual risk' },
      { area: 'Milestone plan', weight: 90, detail: 'What this capital buys' },
      { area: 'First beachhead customer', weight: 82, detail: 'Who pays for v1' },
      { area: 'Manufacturing / ops path', weight: 78, detail: 'Scale beyond the lab' },
      { area: 'Team depth', weight: 75, detail: 'Science + product + ops mix' }
    ],
    whoItFits: [
      'Hard-tech teams with prototypes or lab validation',
      'Founders who can map capital to technical milestones',
      'Companies with a first commercial beachhead in sight',
      'Teams open to grants, CVCs, and strategic partnerships'
    ],
    whoDoesntFit: [
      'Slideware science without experimental evidence',
      'SaaS companies using “deep tech” as branding',
      'Founders unwilling to discuss residual technical risk',
      'Raise plans with no manufacturing or deployment path'
    ],
    whatInvestorsLookFor: [
      'A crisp technical wedge and residual risk statement',
      'IP and freedom-to-operate awareness',
      'Milestone map tied to the raise size',
      'First customer or pilot path',
      'Why India is the right build/test market',
      'Team that has shipped hard things before'
    ],
    whatToPrepare: [
      'Technical diligence memo + risk register',
      'IP summary and competitive technology map',
      'Prototype demos / test data package',
      'Manufacturing or deployment plan',
      'Capital stack: equity + grants + strategics'
    ],
    fundraisingPlaybook: [
      'Write residual risks explicitly — sophisticated investors respect it',
      'Raise for the next proof, not the full vision',
      'Blend venture with non-dilutive capital when it shortens proof',
      'Target deep-tech specialists before generalist growth funds',
      'Use corporate pilots as diligence accelerators',
      'Keep a SaaS-simple commercial narrative alongside the science'
    ],
    commonMistakes: [
      'Fundraising like a consumer app with science buried in appendix',
      'No beachhead — only a 10-year TAM',
      'Ignoring manufacturing cost and yield',
      'Over-diluting before technical de-risking',
      'Treating grants as strategy instead of bridge to proof'
    ],
    relatedThesisIds: ['deep-science', 'climate', 'ai-ml', 'tech-first', 'mobility-ev'],
    relatedStageIds: ['pre-seed', 'seed', 'series-a']
  },
  {
    id: 'climate',
    label: 'Climate / Sustainability',
    eyebrow: 'Sector guide',
    order: 7,
    summary:
      'Climate, cleantech, energy transition, and sustainability — impact plus ROI, and how Indian climate investors diligence.',
    writeup: `Climate and sustainability investors back energy transition, cleantech hardware and software, carbon and circularity, sustainable mobility, industrial efficiency, and climate adaptation. In India the opportunity often sits inside manufacturing, logistics, agriculture, buildings, and power — not only consumer “green” brands.

The bar is dual: measurable impact and a real business. Investors want customer payback, policy awareness, and a scale path that does not depend forever on subsidies. Hardware-heavy stories need manufacturing and project-finance literacy; software climate tools need clear enterprise ROI.

Pitch with the tonne, efficiency, or adaptation metric — and the buyer’s payback period. Be precise about additionality. Capital should buy proof of economics at scale, not only awareness campaigns.`,
    snapshot: {
      typicalCheque: 'Wide range; hardware needs more runway',
      buyer: 'Industrials, utilities, fleets, enterprises',
      diligenceFocus: 'Payback, impact MRV, scale path',
      indiaEdge: 'Industrial demand + energy transition',
      capitalTypes: 'Climate VCs, DFIs, FO, strategics'
    },
    subsectors: [
      { label: 'Clean energy & storage', blurb: 'Generation, storage, grid software' },
      { label: 'Industrial decarbonization', blurb: 'Efficiency, process, materials' },
      { label: 'Mobility & fleets', blurb: 'EV, charging, logistics efficiency' },
      { label: 'Circularity & waste', blurb: 'Materials recovery, reuse systems' },
      { label: 'MRV / carbon software', blurb: 'Measurement, reporting, markets tooling' }
    ],
    metricsThatMatter: [
      { label: 'Customer payback period', why: 'Adoption truth' },
      { label: 'tCO2e or efficiency lift', why: 'Impact credibility' },
      { label: 'Gross margin path', why: 'Hardware/software mix' },
      { label: 'Pipeline of paid pilots', why: 'Demand beyond grants' },
      { label: 'Capex intensity', why: 'Financing model fit' },
      { label: 'Policy sensitivity', why: 'Subsidy dependence risk' }
    ],
    diligenceMap: [
      { area: 'Customer ROI', weight: 92, detail: 'Payback without heroic assumptions' },
      { area: 'Impact measurement', weight: 85, detail: 'MRV quality and additionality' },
      { area: 'Scale / manufacturing', weight: 80, detail: 'Path beyond pilots' },
      { area: 'Policy & offtake', weight: 72, detail: 'Regulatory and buyer risk' },
      { area: 'Team execution', weight: 70, detail: 'Industrial + climate fluency' }
    ],
    whoItFits: [
      'Cleantech founders with buyer payback math',
      'Industrial efficiency businesses with pilots converting',
      'Climate software with enterprise ROI',
      'Teams that quantify impact without theatre'
    ],
    whoDoesntFit: [
      'Green branding with no measurable impact or ROI',
      'Subsidy-only models with no unsubsidized path',
      'Hardware with no manufacturing plan',
      'Carbon stories that cannot explain additionality'
    ],
    whatInvestorsLookFor: [
      'Clear buyer and payback period',
      'Credible impact metric and measurement method',
      'Pilot → paid conversion evidence',
      'Scale path: manufacturing, distribution, or sales',
      'Policy awareness without dependency denial',
      'Team that can sell to industrials'
    ],
    whatToPrepare: [
      'Payback model with sensitivity cases',
      'Impact methodology one-pager',
      'Pilot case studies with offtake or payment proof',
      'Manufacturing / deployment roadmap if hardware',
      'Competitive map including incumbents and diesel/status quo'
    ],
    fundraisingPlaybook: [
      'Lead with ROI, support with impact — not the reverse',
      'Choose climate-specialist vs generalist capital deliberately',
      'Use DFI / strategic capital when it unlocks offtake',
      'Raise for the next commercial proof, not a science fair',
      'Show unsubsidized economics trajectory',
      'Bring an industrial buyer reference when possible'
    ],
    commonMistakes: [
      'Impact theatre without customer willingness to pay',
      'Ignoring project finance realities for hardware',
      'Overstating carbon claims',
      'Pilots that never convert to contracts',
      'Treating policy as permanent margin'
    ],
    relatedThesisIds: ['climate', 'impact-inclusion', 'deep-science', 'mobility-ev', 'agri-food'],
    relatedStageIds: ['seed', 'series-a', 'series-b']
  },
  {
    id: 'impact',
    label: 'Social Impact',
    eyebrow: 'Sector guide',
    order: 8,
    summary:
      'Impact and inclusion capital in India — outcomes plus unit economics, and how to raise without sounding like a grant pitch.',
    writeup: `Social impact investors look for businesses that expand access — financial inclusion, livelihoods, education for underserved segments, healthcare access, climate-adjacent inclusion — while building durable economics. In India this capital sits across thesis-driven VCs, development finance, family offices, and specialized AIFs.

The bar is not charity. Investors still want growth, retention, and a path to returns, but they weight outcomes for underserved users more heavily. Founders should expect questions on who is served, how impact is measured, and whether the model works without perpetual grants.

Pitch both narratives with equal seriousness. Show density in a cohort that matters, honest unit economics, and how capital unlocks reach or product depth. The winning posture is ambitious and precise: commercial clarity with measured inclusion — not either/or.`,
    snapshot: {
      typicalCheque: 'Varies; blended capital common',
      buyer: 'Underserved users, institutions, gov',
      diligenceFocus: 'Outcomes + unit economics + reach',
      indiaEdge: 'Bharat access gaps at massive scale',
      capitalTypes: 'Impact VCs, DFIs, FO, hybrid AIFs'
    },
    subsectors: [
      { label: 'Financial inclusion', blurb: 'Credit, savings, insurance for underserved' },
      { label: 'Livelihoods & work', blurb: 'Income tools, skilling-to-jobs, MSME enablement' },
      { label: 'Education access', blurb: 'Learning for segments the market underserves' },
      { label: 'Health access', blurb: 'Affordable care pathways and last-mile delivery' },
      { label: 'Climate inclusion', blurb: 'Adaptation and green livelihoods' }
    ],
    metricsThatMatter: [
      { label: 'Beneficiary outcomes', why: 'Impact credibility' },
      { label: 'Unit economics', why: 'Path beyond grants' },
      { label: 'Reach & depth', why: 'Who is served and how intensely' },
      { label: 'Retention / repeat', why: 'Real product value' },
      { label: 'Cost to serve', why: 'Scalability of inclusion' },
      { label: 'Blended capital mix', why: 'Sustainable financing' }
    ],
    diligenceMap: [
      { area: 'Outcome measurement', weight: 90, detail: 'What changes for whom' },
      { area: 'Commercial model', weight: 88, detail: 'Willingness to pay / who pays' },
      { area: 'Community reach', weight: 80, detail: 'Distribution into underserved segments' },
      { area: 'Ethics & risk', weight: 78, detail: 'Do-no-harm, over-indebtedness, privacy' },
      { area: 'Team credibility', weight: 72, detail: 'Lived context + operator skill' }
    ],
    whoItFits: [
      'Founders serving underserved or Bharat-first users with proof',
      'Inclusion fintech/edtech/health models with economics visibility',
      'Teams comfortable measuring outcomes alongside revenue',
      'Companies that can use blended capital intelligently'
    ],
    whoDoesntFit: [
      'Grant-dependent models with no commercial path',
      'Impact claims without measurement',
      'Extractive models dressed as inclusion',
      'Founders unwilling to discuss tradeoffs honestly'
    ],
    whatInvestorsLookFor: [
      'Clear beneficiary definition and outcome metrics',
      'Unit economics that can scale beyond grants',
      'Evidence of trust and repeat usage in the community',
      'Ethical risk awareness (credit, data, labor)',
      'Why this team reaches the segment better',
      'A capital plan that matches impact + growth milestones'
    ],
    whatToPrepare: [
      'Impact framework: indicators, data source, cadence',
      'Unit economics and cost-to-serve cohorts',
      'Community distribution map and partners',
      'Risk & ethics one-pager',
      'Capital stack options (equity, DFI, grants)'
    ],
    fundraisingPlaybook: [
      'Lead with the customer and outcome, then the business model',
      'Choose impact-native capital for early conviction rounds',
      'Do not apologize for wanting returns — be precise about both jobs',
      'Use field evidence and beneficiary stories with data, not instead of data',
      'Raise against reach + economics milestones together',
      'Be ready for deeper diligence on harm scenarios'
    ],
    commonMistakes: [
      'Sounding like an NGO deck to VCs (or a pure VC deck to DFIs)',
      'Vanity reach without outcome depth',
      'Ignoring over-indebtedness or unintended harm',
      'Treating grants as the business model',
      'No plan for what happens when subsidies fade'
    ],
    relatedThesisIds: ['impact-inclusion', 'india-first', 'fintech', 'edtech', 'agri-food'],
    relatedStageIds: ['seed', 'pre-seed', 'series-a']
  },
  {
    id: 'cyber-security',
    label: 'Cyber Security',
    eyebrow: 'Sector guide',
    order: 9,
    summary:
      'Enterprise security, cloud security, threat detection, and compliance — how Indian cybersecurity investors diligence and what founders should show at seed.',
    writeup: `Cybersecurity investors underwrite trust at scale: can your product reduce breach risk, pass enterprise procurement, and survive in a market where buyers are skeptical and cycles are long. In India the category spans cloud and application security, identity and access, threat intelligence, GRC/compliance automation, and security for SaaS stacks selling globally.

The wedge matters. Horizontal “we secure everything” stories struggle unless backed by a clear ICP — developers, mid-market IT, regulated enterprises, or a vertical like fintech or healthcare. Investors want to see why you win vs global incumbents and why India-built teams can sell into US/EU buyers without being a cost-only vendor.

Fundraising is proof-heavy: design partners, pilot conversions, retention in security teams, and honest talk about sales cycles. Lead with the attack surface you own, the buyer persona, and early metrics — not fear-based TAM slides.`,
    snapshot: {
      typicalCheque: 'Seed $0.5–3M; enterprise cycles longer',
      buyer: 'CISO, IT, DevSecOps, compliance',
      diligenceFocus: 'Product depth, GTM, trust, cycles',
      indiaEdge: 'Global SaaS security talent + US GTM',
      capitalTypes: 'B2B VCs, cyber specialists, CVCs'
    },
    subsectors: [
      { label: 'Cloud & app security', blurb: 'CNAPP, WAF, API security, posture management' },
      { label: 'Identity & access', blurb: 'IAM, PAM, zero-trust tooling' },
      { label: 'Threat intel & detection', blurb: 'SOC automation, XDR, brand monitoring' },
      { label: 'Compliance / GRC', blurb: 'SOC 2, ISO, audit automation for startups' },
      { label: 'DevSecOps', blurb: 'Supply chain, secrets, code scanning' }
    ],
    metricsThatMatter: [
      { label: 'Design partner → paid', why: 'Enterprise trust signal' },
      { label: 'Logo retention / NDR', why: 'Security products must stick' },
      { label: 'Sales cycle length', why: 'Capital plan realism' },
      { label: 'POC win rate', why: 'Product-market fit in security' },
      { label: 'ACV / deal size', why: 'Path to efficient GTM' },
      { label: 'Compliance certifications', why: 'Table stakes for buyers' }
    ],
    diligenceMap: [
      { area: 'Technical depth', weight: 92, detail: 'Real differentiation vs suites' },
      { area: 'Buyer & wedge', weight: 88, detail: 'ICP clarity and champion map' },
      { area: 'GTM motion', weight: 82, detail: 'PLG vs enterprise realism' },
      { area: 'Trust & security posture', weight: 80, detail: 'Your own SOC 2 / data handling' },
      { area: 'Team pedigree', weight: 72, detail: 'Security domain + GTM balance' }
    ],
    whoItFits: [
      'B2B security founders with a narrow wedge and early enterprise pilots',
      'Teams selling globally from India with US design partners',
      'Founders who understand long cycles and compliance buyers',
      'Products with measurable risk reduction, not slide-deck fear'
    ],
    whoDoesntFit: [
      'Consumer VPN or generic “cyber awareness” apps',
      'Founders who cannot explain the buyer or procurement path',
      'Copy-paste global features with no India or GTM edge',
      'Services-heavy MSSP models pitched as product companies'
    ],
    whatInvestorsLookFor: [
      'Clear ICP and attack surface owned',
      'Evidence of technical depth (team, architecture, pilots)',
      'Early paid or committed design partners',
      'Honest enterprise cycle and pricing assumptions',
      'Why incumbents lose to you in your wedge',
      'Plan for certifications and customer trust'
    ],
    whatToPrepare: [
      'Architecture diagram and threat model for your wedge',
      'Pilot / POC outcomes with named logos if allowed',
      'Security & privacy one-pager (your product + company)',
      'Competitive map vs 2–3 incumbents and alternatives',
      '18-month GTM plan with cycle assumptions'
    ],
    fundraisingPlaybook: [
      'Lead with wedge and buyer, not “cyber TAM”',
      'Shortlist funds with B2B SaaS + security portfolio overlap',
      'Bring a customer or design-partner quote to first calls',
      'Separate product risk from GTM risk in the deck',
      'Raise for the next 2–3 lighthouse logos, not vanity ARR',
      'Be ready for technical diligence early'
    ],
    commonMistakes: [
      'Fear-based pitching without product proof',
      'Underestimating enterprise sales cycles',
      'No security posture for your own company',
      'Competing head-on with suites on day one',
      'Ignoring compliance as “later problem”'
    ],
    relatedThesisIds: ['saas-b2b', 'tech-first', 'ai-ml', 'fintech', 'series-a-pmf'],
    relatedStageIds: ['seed', 'pre-seed', 'series-a']
  },
  {
    id: 'blockchain',
    label: 'Blockchain',
    eyebrow: 'Sector guide',
    order: 10,
    summary:
      'Web3, blockchain infrastructure, and crypto-native products — how specialist capital diligences token models, compliance, and community-led growth in India.',
    writeup: `Blockchain and Web3 investors evaluate a different risk stack: protocol design, token economics, regulatory posture, community traction, and whether the team can ship through market cycles. In India, activity spans infrastructure (L1/L2, tooling, wallets), DeFi and payments rails, gaming/NFT platforms, and enterprise blockchain for supply chain and identity — often with global users from day one.

Capital is more specialized than generalist VC. The best pitches combine a clear on-chain or crypto-native wedge with honest regulatory framing (India VDA rules, offshore structure, KYC/AML where relevant) and evidence of usage — wallets, TVL, transactions, or developer adoption — not only whitepaper narrative.

Fundraising means finding crypto-native funds, syndicates, and angels who understand token timelines, and being transparent about what is equity vs token, jurisdiction, and treasury policy. Warm intros through builder communities matter more here than in classic SaaS.`,
    snapshot: {
      typicalCheque: 'Highly variable; strategic + token rounds',
      buyer: 'Users, developers, protocols, institutions',
      diligenceFocus: 'Token model, compliance, traction, team',
      indiaEdge: 'Builder talent; global crypto networks',
      capitalTypes: 'Web3 specialists, angels, global crypto VCs'
    },
    subsectors: [
      { label: 'Infrastructure & tooling', blurb: 'Nodes, indexing, wallets, dev tooling' },
      { label: 'DeFi & payments', blurb: 'On-chain finance, remittance, stablecoin rails' },
      { label: 'Gaming / NFT / consumer', blurb: 'GameFi, digital collectibles, social tokens' },
      { label: 'Enterprise blockchain', blurb: 'Supply chain, identity, tokenized assets' },
      { label: 'Exchange / custody adjacency', blurb: 'Compliance-heavy regulated touchpoints' }
    ],
    metricsThatMatter: [
      { label: 'Active wallets / users', why: 'Real adoption beyond airdrops' },
      { label: 'On-chain volume or TVL', why: 'Usage truth for DeFi/protocol plays' },
      { label: 'Developer adoption', why: 'Infra and tooling fit' },
      { label: 'Token float & unlock schedule', why: 'Cap table and dilution clarity' },
      { label: 'Regulatory posture', why: 'India + target market viability' },
      { label: 'Community retention', why: 'Cycle-resilient engagement' }
    ],
    diligenceMap: [
      { area: 'Token & cap table', weight: 90, detail: 'Equity vs token, unlocks, treasury' },
      { area: 'Regulatory & compliance', weight: 88, detail: 'VDA, KYC, jurisdiction' },
      { area: 'Product / protocol traction', weight: 85, detail: 'Usage, audits, security' },
      { area: 'Team & crypto-native fit', weight: 78, detail: 'Shipping through cycles' },
      { area: 'Go-to-market', weight: 72, detail: 'Community, partnerships, listings' }
    ],
    whoItFits: [
      'Crypto-native teams with shipped product and on-chain metrics',
      'Infrastructure founders with developer adoption',
      'Founders transparent about regulation and structure',
      'Global-first Web3 products with India engineering base'
    ],
    whoDoesntFit: [
      'Token slides with no product or users',
      'Founders avoiding regulatory questions',
      'Copycat NFT/gaming without retention',
      'Equity-only pitches to crypto funds expecting token clarity'
    ],
    whatInvestorsLookFor: [
      'Clear protocol or product wedge',
      'Honest tokenomics and cap table map',
      'Security audits or smart-contract discipline',
      'Usage metrics that survive incentive removal',
      'Regulatory plan for India and primary markets',
      'Team that has operated through a crypto cycle'
    ],
    whatToPrepare: [
      'Token/equity structure one-pager',
      'On-chain metrics dashboard or screenshots',
      'Audit / security summary if applicable',
      'Regulatory memo (India VDA, offshore entity if any)',
      'Cap table including advisor and community allocations'
    ],
    fundraisingPlaybook: [
      'Target Web3-native funds first — generalists need extra education',
      'Lead with traction metrics, not ideology',
      'Be explicit about round type (equity, token, SAFT)',
      'Map co-investors who add exchange, audit, or devrel value',
      'Prepare for technical + legal diligence in parallel',
      'Build in public — community is part of the pitch'
    ],
    commonMistakes: [
      'Opaque token allocations',
      'Ignoring India VDA compliance for India-facing products',
      'Metric farming that collapses when incentives stop',
      'Pitching Web3 without naming the on-chain wedge',
      'Raising from generalist VCs with no crypto follow-on path'
    ],
    relatedThesisIds: ['crypto-web3', 'fintech', 'gaming-media', 'tech-first', 'saas-b2b'],
    relatedStageIds: ['pre-seed', 'seed', 'series-a']
  }
];

module.exports = { SECTOR_GUIDES };
