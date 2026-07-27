/**
 * Investment thesis theme pages — curated writeups for Indian founders.
 */
const THESIS_THEMES = [
  {
    id: 'early-stage-builders',
    label: 'Early-stage builders',
    eyebrow: 'Thesis theme',
    summary: 'Investors who write the first institutional cheque and partner before the story is obvious.',
    writeup: `Early-stage builders are the funds and angels who show up when the company is still a hypothesis with a small team, early users, and more conviction than proof. For Indian founders, this thesis usually means pre-seed and seed capital — often the first institutional cheque — plus help with hiring, customer intros, and the narrative for the next round.

These investors underwrite founder quality, problem depth, and learning speed more than polished metrics. They expect messy decks, evolving GTM, and a clear reason the founder can win the category. In return, they move faster than later-stage funds and are more willing to lead or co-lead when the round is still forming.

If you are raising your first round in India, map this theme first. Look for funds that repeatedly back day-zero and seed companies in your sector, ask what a strong first cheque looks like for them, and whether they reserve follow-on for the next 18 months. Warm intros still matter, but a crisp product demo and founder story matter more than a perfect data room.`,
    whoItFits: [
      'Pre-seed and seed founders raising a first institutional round',
      'Teams with early traction or a sharp wedge, not full product-market fit yet',
      'Founders who want hands-on partners, not only capital'
    ],
    whatToPrepare: [
      'A clear problem narrative and why now in India',
      'Early signal: waitlist, pilots, revenue, or retention — even if small',
      'A realistic use of funds and 12–18 month milestone plan'
    ]
  },
  {
    id: 'founder-led',
    label: 'Founder-led / operator capital',
    eyebrow: 'Thesis theme',
    summary: 'Operator angels, founder syndicates, and funds that invest like builders who have been in the seat.',
    writeup: `Founder-led and operator capital comes from people who have scaled products, run P&Ls, or built companies before — not only from financial partners. In India this includes active angels, founder syndicates, and funds staffed by operators who underwrite from lived experience.

These investors often care deeply about craft: product taste, distribution instincts, hiring bar, and how you handle ambiguity. Their cheque may be smaller than a large institutional seed, but the value can be disproportionately high through hiring pipelines, customer intros, and pattern recognition on what breaks at the next stage.

Pitch them like a peer. Show the hard parts of the business honestly. Ask for a specific help area — distribution, pricing, or team — not a generic “we want smart money.” If your round mixes angels and a lead fund, founder-led capital is often the bridge that makes the syndicate feel real.`,
    whoItFits: [
      'Founders who want mentorship and network alongside capital',
      'Rounds that benefit from a syndicate of credible operators',
      'Consumer, SaaS, and marketplace startups where distribution intuition matters'
    ],
    whatToPrepare: [
      'A short, personal founder story and why you are uniquely positioned',
      'Specific asks beyond money',
      'References or proof of how you learn from feedback'
    ]
  },
  {
    id: 'tech-first',
    label: 'Tech-first / product companies',
    eyebrow: 'Thesis theme',
    summary: 'Investors who back software, platforms, and product-led companies where technology is the core moat.',
    writeup: `Tech-first investors look for companies where the product itself creates leverage — SaaS, developer tools, enterprise software, AI products, and platforms where software compounds. They want to understand architecture, defensibility, and why customers will keep paying as you scale.

In the Indian context, this thesis spans India-for-India enterprise software and global product companies built from India. Diligence often goes deeper on retention, net revenue retention, sales motion, and technical differentiation than on brand or offline distribution.

Founders pitching this theme should lead with the product wedge, why switching costs or data flywheels build over time, and how go-to-market matches the product. Vanity download metrics matter less than usage intensity and willingness to pay.`,
    whoItFits: [
      'SaaS, AI, enterprise, and developer-tool founders',
      'Product-led teams selling to businesses or power users',
      'Companies where software margins and retention are the story'
    ],
    whatToPrepare: [
      'Product demo that shows the aha moment quickly',
      'Retention, usage, or revenue cohorts if available',
      'A crisp view of ICP and why you win against incumbents or horizontal tools'
    ]
  },
  {
    id: 'india-first',
    label: 'India-first / Bharat',
    eyebrow: 'Thesis theme',
    summary: 'Capital that underwrites India as the primary market — including Tier 2/3, vernacular, and mass adoption stories.',
    writeup: `India-first investors believe the next decade of outcomes will be built for Indian users, merchants, workers, and households — not only for coastal metros copying Silicon Valley playbooks. This thesis includes Bharat-facing distribution, vernacular products, UPI-native fintech, and services that work in low-trust or low-bandwidth environments.

These investors ask how you acquire users outside paid social, how unit economics work at Indian price points, and whether regulation or infrastructure is a tailwind. They are often patient with longer education cycles if the TAM and distribution path are credible.

If your company is India-first, do not hide it. Show density in a city or cohort, explain payment and logistics realities, and be clear whether you expand city-by-city, category-by-category, or online-first. Global “someday” stories are fine only after the India wedge is sharp.`,
    whoItFits: [
      'Consumer, fintech, commerce, and services startups focused on India',
      'Founders building for Tier 2/3 or vernacular users',
      'Businesses where local distribution and trust are the moat'
    ],
    whatToPrepare: [
      'Evidence of local demand and repeat usage',
      'Unit economics at Indian ARPU levels',
      'A distribution thesis that is not only performance marketing'
    ]
  },
  {
    id: 'category-creators',
    label: 'Category creators',
    eyebrow: 'Thesis theme',
    summary: 'Investors hunting for companies that define a new market rather than fighting for share in an old one.',
    writeup: `Category creators invent the frame of reference. Investors with this thesis look for products that make customers change behaviour, create a new budget line, or turn an informal process into software. The upside is asymmetric; the risk is that the category never forms.

Diligence here is narrative-heavy: why the old way is broken, why now (regulation, infrastructure, culture), and why your company becomes the default verb. These funds often tolerate early metrics if the insight is non-obvious and the founder can recruit believers.

Pitch category creation carefully. Do not claim a category without naming the customer job and the competitive set you replace. Show one wedge market where you can win first, then explain how the category expands.`,
    whoItFits: [
      'Founders with a non-obvious insight and a wedge use case',
      'Products creating new workflows, not only cheaper clones',
      'Teams that can sell a vision while shipping a narrow MVP'
    ],
    whatToPrepare: [
      'A category narrative in one paragraph',
      'Proof someone already pays or changes behaviour for your wedge',
      'A map of substitutes (including “do nothing” and Excel)'
    ]
  },
  {
    id: 'impact-inclusion',
    label: 'Impact & inclusion',
    eyebrow: 'Thesis theme',
    summary: 'Funds that seek commercial returns while improving climate, inclusion, health access, or underserved markets.',
    writeup: `Impact and inclusion investors underwrite both outcomes and returns. In India this includes climate and cleantech, financial inclusion, healthcare access, livelihoods, and products for historically underserved communities. The best of these funds are rigorous: impact without a business model does not get capital.

Expect questions on measurement — who is helped, how you know, and whether impact scales with revenue. Also expect commercial questions on margins, distribution, and policy risk. Founders who treat impact as storytelling without numbers struggle here; founders who can show both mission and mechanics do well.

Be precise. “Impact” is not a synonym for “good intentions.” Show the causal chain from product usage to outcome, and why a VC-scale business (not only a grant project) is the right vehicle.`,
    whoItFits: [
      'Climate, health, fintech inclusion, and livelihoods startups',
      'Founders who can measure outcomes without losing commercial focus',
      'Teams comfortable with policy and partnership-heavy GTM'
    ],
    whatToPrepare: [
      'A clear impact metric tied to product usage',
      'Unit economics that work without perpetual subsidy',
      'Risks: regulation, partner concentration, and measurement honesty'
    ]
  },
  {
    id: 'growth-scale',
    label: 'Growth & scale-ups',
    eyebrow: 'Thesis theme',
    summary: 'Later-stage capital for companies that already work and now need fuel to expand markets, products, or geography.',
    writeup: `Growth and scale-up investors write larger cheques into companies with proven product-market fit. They care about efficient growth, durable margins, competitive position, and whether the next dollar of capital creates enterprise value. In India this includes Series B+ and growth equity across consumer, SaaS, and financial services.

The conversation shifts from “can this work?” to “how big can this get, and how cleanly?” Diligence is heavier: cohorts, contribution margins, sales efficiency, governance, and path to leadership in the category. Founders should expect more process and less romance.

If you are not yet at this stage, still study these investors — they define what a strong Series A company looks like. If you are raising growth capital, lead with numbers, competitive reality, and a board-ready operating plan.`,
    whoItFits: [
      'Series B+ and growth-stage companies with clear metrics',
      'Founders expanding into new cities, segments, or products',
      'Businesses ready for institutional governance and larger rounds'
    ],
    whatToPrepare: [
      'Clean financials and cohort reporting',
      'A growth plan with capital efficiency assumptions',
      'An honest view of competition and moat durability'
    ]
  },
  {
    id: 'deep-science',
    label: 'Deep science / hard tech',
    eyebrow: 'Thesis theme',
    summary: 'Investors comfortable with long R&D cycles, IP, hardware, and science-driven breakthroughs.',
    writeup: `Deep science and hard-tech investors back companies where the hard part is physics, biology, materials, semiconductors, robotics, or advanced engineering — not only software packaging. Timelines are longer, capital needs can be lumpy, and technical diligence is non-negotiable.

In India this thesis is growing with deeptech funds, climate hardware, space-adjacent startups, and research-linked spinouts. Investors ask about IP, talent density, lab or manufacturing path, and what milestones unlock the next financing before full commercial scale.

Founders should not pitch hard tech like a consumer app. Show the science risk reduced so far, remaining technical milestones, and why a startup (versus a university lab or large corporate) is the right vehicle. Commercial story matters, but technical credibility comes first.`,
    whoItFits: [
      'Deeptech, climate hardware, robotics, and science-based startups',
      'Founders with strong technical teams and IP clarity',
      'Companies that need milestone-based capital, not only growth marketing capital'
    ],
    whatToPrepare: [
      'A milestone roadmap that de-risks technology step by step',
      'IP and talent story',
      'Capital plan matched to R&D reality, not SaaS defaults'
    ]
  },
  {
    id: 'fintech',
    label: 'Fintech / embedded finance',
    eyebrow: 'Sector thesis',
    summary: 'Investors backing payments, lending, insurance, wealth, and finance embedded into products.',
    writeup: `Fintech investors in India underwrite companies that move, lend, insure, or manage money — and increasingly products that embed finance into commerce, SaaS, and consumer workflows. UPI rails, account aggregators, and digital KYC have lowered distribution friction; the bar now is unit economics, credit quality, compliance, and whether you own a real customer relationship.

These funds ask how you acquire and retain users cheaply, how risk is managed if you touch credit, and whether regulation is a moat or a landmine. Pure “fintech wrapper” stories struggle; products with proprietary distribution, data, or workflow lock-in do better.

Pitch with clear revenue model (take rate, interest, float, SaaS), loss ratios or repayment metrics if relevant, and a path to becoming infrastructure rather than a feature someone else can copy.`,
    whoItFits: [
      'Payments, lending, insurtech, wealthtech, and embedded-finance founders',
      'Teams building on India stack rails with a defensible wedge',
      'B2B finance products selling into SMEs, platforms, or banks'
    ],
    whatToPrepare: [
      'Unit economics and risk metrics, not only growth charts',
      'Regulatory posture and licensing path',
      'Why your distribution or data is hard to replicate'
    ]
  },
  {
    id: 'saas-b2b',
    label: 'SaaS / B2B software',
    eyebrow: 'Sector thesis',
    summary: 'Capital for B2B software — India-for-India enterprise tools and global SaaS built from India.',
    writeup: `SaaS and B2B software investors look for recurring revenue, retention, and a sales motion that scales. In India this thesis covers two big lanes: software sold into Indian enterprises and SMEs, and product companies building from India for global buyers.

Diligence centres on ICP clarity, time-to-value, net revenue retention, sales efficiency, and whether the product becomes workflow-critical. Founders who only show logos without usage depth get pushed hard. Founders who can show a wedge use case expanding into a platform story do well.

Lead with the job-to-be-done, why buyers switch, and how you expand seat or module revenue. If you are India-for-global, be explicit about US or EU GTM — capital alone does not create pipeline.`,
    whoItFits: [
      'B2B SaaS, enterprise software, and vertical software founders',
      'India-built products selling domestically or globally',
      'Teams with early revenue or strong design-partner traction'
    ],
    whatToPrepare: [
      'Retention, NRR, or usage proof if you have it',
      'A crisp ICP and sales motion (PLG, sales-led, or hybrid)',
      'Competitive map vs horizontal tools and incumbents'
    ]
  },
  {
    id: 'consumer-d2c',
    label: 'Consumer / D2C brands',
    eyebrow: 'Sector thesis',
    summary: 'Investors funding consumer internet, marketplaces, and brand-led D2C companies.',
    writeup: `Consumer and D2C investors back products that win on brand, distribution, and repeat purchase — apps, marketplaces, and digitally native brands. In India the thesis spans metro digital consumers and Bharat-facing commerce, often mixing online acquisition with offline retail.

These investors scrutinise contribution margins, repeat rates, channel mix, and whether brand equity survives CAC inflation. Pure paid-social growth without retention is a red flag. Strong founders show category insight, creative craft, and a path to distribution leverage (marketplaces, modern trade, kirana, or community).

Pitch the consumer insight first, then the economics. Show what happens after the first order, and why your brand or experience compounds instead of resetting every campaign.`,
    whoItFits: [
      'D2C brands, consumer apps, and marketplace founders',
      'Teams with early repeat purchase or engagement signals',
      'Founders who understand both brand and contribution margin'
    ],
    whatToPrepare: [
      'Cohort repeat and contribution margin by channel',
      'Brand positioning in one sentence',
      'A distribution plan beyond performance ads'
    ]
  },
  {
    id: 'ai-ml',
    label: 'AI / ML',
    eyebrow: 'Sector thesis',
    summary: 'Investors backing applied AI, enterprise AI, and ML-native products — not AI as a buzzword.',
    writeup: `AI and ML investors want companies where machine intelligence is core to the product value, not a slide decoration. That includes enterprise AI copilots, vertical AI workflows, infrastructure and tooling, and consumer products with meaningful model-driven experiences.

In India, many strong opportunities are applied: AI for sales, support, healthcare ops, finance workflows, and developer productivity — often sold as software with clear ROI. Diligence asks what is proprietary (data, workflow, evaluation, distribution), what is rented from foundation models, and how margins hold as model costs change.

Do not pitch “we use GPT.” Pitch the workflow you own, the evaluation bar you beat, and why customers will keep paying when every competitor ships a chatbot.`,
    whoItFits: [
      'Enterprise AI, vertical AI, and ML-platform founders',
      'Teams with domain data or workflow depth',
      'Products where AI improves measurable business outcomes'
    ],
    whatToPrepare: [
      'A demo of the workflow, not only model claims',
      'Data advantage and evaluation approach',
      'Gross margin and inference cost story'
    ]
  },
  {
    id: 'healthtech',
    label: 'Healthtech / wellness',
    eyebrow: 'Sector thesis',
    summary: 'Capital for digital health, medtech-adjacent software, care delivery, and wellness platforms.',
    writeup: `Healthtech and wellness investors back companies improving access, outcomes, or efficiency across care, diagnostics, pharma supply, and consumer wellness. India offers huge demand and messy delivery — which means distribution partnerships, trust, and regulation matter as much as product.

Expect questions on clinical credibility, provider or patient acquisition, reimbursement or payment mix, and whether growth depends on continuous subsidy. B2B health software and infrastructure often underwrite more cleanly than pure consumer wellness with weak retention.

Pitch the care or ops problem narrowly, show proof someone will pay repeatedly, and be honest about what requires licenses, clinical validation, or hospital sales cycles.`,
    whoItFits: [
      'Digital health, care delivery, medtech software, and wellness founders',
      'B2B health infrastructure selling to providers, insurers, or employers',
      'Teams that can navigate trust and compliance without slowing learning'
    ],
    whatToPrepare: [
      'Evidence of clinical or operational value',
      'Who pays and why they renew',
      'Regulatory and partnership risks called out clearly'
    ]
  },
  {
    id: 'climate',
    label: 'Climate / sustainability',
    eyebrow: 'Sector thesis',
    summary: 'Investors funding climate tech, clean energy, sustainability, and green transition businesses.',
    writeup: `Climate and sustainability investors underwrite companies reducing emissions, improving resource efficiency, or enabling the energy transition — software, hardware, and services. In India this includes clean energy, climate adaptation, circular economy, EV-adjacent infrastructure, and industrial efficiency.

These funds balance impact narrative with commercial reality: path to procurement, project finance needs, policy sensitivity, and whether the business can scale without perpetual grants. Hardware-heavy climate startups should expect longer diligence than pure SaaS.

Show the tonnes or rupees of efficiency you create, who the buyer is, and the milestone plan from pilot to repeatable deployment.`,
    whoItFits: [
      'Climate tech, clean energy, and sustainability founders',
      'Teams selling measurable efficiency or transition outcomes',
      'Hardware or hybrid companies with clear deployment milestones'
    ],
    whatToPrepare: [
      'Impact metric tied to revenue (not only ESG storytelling)',
      'Buyer and procurement path',
      'Capital plan matched to pilots vs scale'
    ]
  },
  {
    id: 'pre-seed-day-zero',
    label: 'Pre-seed / day-zero',
    eyebrow: 'Stage thesis',
    summary: 'Investors who write the earliest cheques — before metrics are clean and the round is crowded.',
    writeup: `Pre-seed and day-zero investors specialise in conviction before proof. They back teams with a sharp insight, early product or prototype, and enough signal to justify the first institutional or angel cheque. Speed, founder quality, and problem obsession matter more than polished dashboards.

In India this capital often comes from micro-VCs, angels, and seed funds that reserve for the next round. Ask how fast they decide, what a strong first cheque looks like, and whether they lead or prefer to follow a lead.

Pitch tightly: why this team, why this wedge, why now. Overbuilding the data room at day-zero can signal you are optimizing the wrong thing.`,
    whoItFits: [
      'Founders raising a first cheque or pre-seed round',
      'Teams with prototypes, pilots, or early users — not full PMF',
      'Companies that need believers before a large seed process'
    ],
    whatToPrepare: [
      'A crisp founder-market fit story',
      'One clear wedge and 12-month plan',
      'Honest view of what is still unknown'
    ]
  },
  {
    id: 'crypto-web3',
    label: 'Crypto / Web3',
    eyebrow: 'Sector thesis',
    summary: 'Funds and angels backing blockchain, crypto infrastructure, and Web3 applications.',
    writeup: `Crypto and Web3 investors back protocol, infrastructure, exchange-adjacent, and application-layer companies in blockchain ecosystems. The thesis rewards technical depth, community distribution, and clarity on what is decentralised versus what is a normal product with a token narrative.

Indian founders in this lane often build for global crypto users while navigating local regulatory uncertainty. Serious investors ask about token design only after product utility, security, and go-to-market are clear — and they discount hype cycles hard.

Pitch utility and users first. Explain regulatory posture without hand-waving, and show why your team can ship secure systems in a adversarial environment.`,
    whoItFits: [
      'Crypto infrastructure, Web3 app, and blockchain tooling founders',
      'Teams with strong technical credibility',
      'Products with real users or developers, not only whitepapers'
    ],
    whatToPrepare: [
      'Clear product utility independent of token price',
      'Security and compliance posture',
      'Traction: users, developers, volume, or partnerships'
    ]
  },
  {
    id: 'family-offices',
    label: 'Family offices',
    eyebrow: 'Capital type',
    summary: 'Family office capital — often flexible, relationship-driven, and longer-horizon than traditional fund cycles.',
    writeup: `Family offices invest on behalf of wealthy families and business groups. In India they can be quieter than brand-name VCs, more flexible on cheque size and structure, and sometimes more patient on exit timing. Many prefer warm intros and clear governance over cold decks.

Diligence styles vary widely: some act like sophisticated angels, others like growth investors. Thesis fit may follow the family’s operating industries — manufacturing, healthcare, real estate, consumer — or a professionalised multi-sector approach.

Approach with clarity on round terms, use of funds, and why a family office is a better fit than a traditional VC for this round. Relationship and trust compound here more than hype.`,
    whoItFits: [
      'Founders who want flexible or patient capital',
      'Rounds where strategic industry context helps',
      'Companies comfortable with relationship-led processes'
    ],
    whatToPrepare: [
      'A clean one-pager and honest ask',
      'Governance comfort and referenceability',
      'Why this capital partner fits beyond the cheque'
    ]
  },
  {
    id: 'angel-syndicates',
    label: 'Angel syndicates / networks',
    eyebrow: 'Capital type',
    summary: 'Angel networks and syndicates that pool operators and angels into a first or supporting cheque.',
    writeup: `Angel syndicates and networks aggregate many angels into a single vehicle or coordinated cheque. For founders, they can fill a round quickly, add a bench of operators, and signal credibility — especially at pre-seed and seed.

The tradeoff is coordination: decision speed, SPV mechanics, and how much true help you get after the wire. Strong networks have a clear lead, a known process, and members who actually take calls. Weak ones create logo soup without ownership.

Pitch for a lead champion inside the network. Make it easy to share a short memo, and ask what post-investment support looks like beyond WhatsApp groups.`,
    whoItFits: [
      'Pre-seed and seed founders building a syndicate',
      'Teams that want operator angels alongside a lead fund',
      'Founders raising smaller cheques across many believers'
    ],
    whatToPrepare: [
      'A short memo a champion can forward',
      'Clear round structure and allocation for angels',
      'Specific asks for network help (customers, hiring, intros)'
    ]
  },
  {
    id: 'agri-food',
    label: 'Agri / food systems',
    eyebrow: 'Sector thesis',
    summary: 'Investors in agriculture, food supply chains, farm tech, and food brands tied to Indian systems.',
    writeup: `Agri and food-systems investors back companies across farming inputs, market linkages, processing, food brands, and supply-chain software. India’s agri reality is fragmented, seasonal, and relationship-heavy — so distribution and trust often matter more than sleek apps.

These investors look for unit economics that survive commodity cycles, working-capital intensity, and whether you create durable value for farmers, FPOs, brands, or enterprises. Pure marketplace take-rate stories need proof of retention and liquidity.

Show ground operations honestly. Pilots in one district are fine; pretend-national scale without ops depth is not.`,
    whoItFits: [
      'Agtech, foodtech, and agri supply-chain founders',
      'Teams with field distribution or procurement strength',
      'Food brands with a sourcing or systems edge'
    ],
    whatToPrepare: [
      'Unit economics including working capital',
      'Proof of repeat usage by farmers, buyers, or brands',
      'Ops plan for seasonality and geography'
    ]
  },
  {
    id: 'logistics-supply',
    label: 'Logistics / supply chain',
    eyebrow: 'Sector thesis',
    summary: 'Capital for logistics, warehousing, mobility-of-goods, and supply-chain software or services.',
    writeup: `Logistics and supply-chain investors fund the movement and visibility of goods — fulfilment, freight, warehousing, routing, and B2B supply-chain software. In India, infrastructure gaps and SME fragmentation create room for companies that improve reliability, speed, or cost.

Diligence focuses on contribution margins per shipment or account, density advantages, asset lightness vs control, and whether software or network effects deepen over time. Asset-heavy models need a clear path to capital efficiency; pure software needs proof enterprises will pay and integrate.

Pitch the bottleneck you remove, the density you have (or will get), and why incumbents or WhatsApp+Excel cannot close the gap quickly.`,
    whoItFits: [
      'Logistics, fulfilment, freight, and supply-chain software founders',
      'Teams improving reliability or cost for SMEs or enterprises',
      'Network businesses where density creates a moat'
    ],
    whatToPrepare: [
      'Unit economics per lane, order, or account',
      'Density and retention evidence',
      'Asset strategy and capital intensity called out clearly'
    ]
  }
];

module.exports = { THESIS_THEMES };
