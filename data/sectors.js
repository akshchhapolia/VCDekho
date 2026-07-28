/**
 * Sector guide pages — curated writeups for Indian founders.
 * Keep ids aligned with SECTOR_CANON in scripts/build_investors_json.js.
 */
const SECTOR_GUIDES = [
  {
    id: 'fintech',
    label: 'Fintech',
    eyebrow: 'Sector guide',
    summary: 'Payments, lending, wealth, insurance, and embedded finance investors backing India-first financial products.',
    writeup: `Fintech remains one of the deepest pools of venture capital in India — from UPI-native consumer apps to B2B payments, lending infrastructure, wealthtech, and insurance. Investors in this sector underwrite regulatory awareness, unit economics at Indian price points, and distribution through banks, platforms, or partnerships.

Founders should expect diligence on credit quality, take rates, compliance posture, and whether growth is pull from real demand or push from subsidies and promotions. Later-stage fintech investors also care about capital efficiency and a path to sustainable contribution margins.

Pitch fintech investors with a crisp wedge (who pays, why now, why you), early retention or repayment signal, and a clear view of licensing or partner-bank dependencies. Warm intros still help, but a precise ICP and metric pack matter more than a broad “India finance” story.`,
    whoItFits: [
      'Consumer and SME finance, payments, and embedded-finance founders',
      'Infrastructure and tooling companies selling to banks, NBFCs, or platforms',
      'Teams that can explain regulation and unit economics without hand-waving'
    ],
    whatToPrepare: [
      'Unit economics at Indian ARPU / ticket sizes',
      'Compliance and partnership map (licenses, bank partners, APIs)',
      'Retention, repayment, or usage cohorts — even if early'
    ]
  },
  {
    id: 'saas',
    label: 'SaaS / Enterprise',
    eyebrow: 'Sector guide',
    summary: 'B2B software, enterprise tools, and product-led platforms built for India and global markets from India.',
    writeup: `SaaS and enterprise investors look for software leverage: recurring revenue, expanding accounts, and a product that becomes harder to rip out over time. In India this covers India-for-India SMB tools, mid-market vertical SaaS, and global product companies built from Indian engineering hubs.

Diligence usually centres on retention, net revenue retention, sales motion (PLG vs enterprise), and why customers choose you over horizontal suites or incumbents. Multi-product roadmaps matter less than a sharp wedge and proof that buyers renew.

Lead with the product demo, ICP clarity, and early revenue quality. Show implementation effort honestly. If you sell into Indian enterprises, explain procurement cycles and champion maps; if you sell globally from India, show time-zone and trust advantages without overselling “cost arbitrage.”`,
    whoItFits: [
      'B2B SaaS and enterprise software founders',
      'Vertical tools with a clear buyer and workflow',
      'Product-led teams with expanding usage inside accounts'
    ],
    whatToPrepare: [
      'A short demo that shows the aha moment',
      'Retention / NRR or usage intensity if available',
      'ICP, ACV, and why you win against the default tool'
    ]
  },
  {
    id: 'consumer',
    label: 'Consumer / D2C',
    eyebrow: 'Sector guide',
    summary: 'Brands, marketplaces, and consumer internet products winning on distribution, habit, and India-scale demand.',
    writeup: `Consumer and D2C investors back products that win on taste, distribution, and repeat behaviour — ecommerce brands, marketplaces, consumer apps, and services that scale across Indian cities. They underwrite brand strength, contribution margins after marketing, and whether growth can survive paid-channel saturation.

In India, offline plus online hybrid stories, vernacular audiences, and Tier 2/3 density often matter as much as metro launch metrics. Investors will pressure-test CAC payback, repeat rates, and whether the category has room for a category leader.

Pitch with a sharp customer insight, proof of repeat purchase or engagement, and a distribution thesis that is not only performance marketing. Show unit economics at real Indian price points and the wedge city or cohort where you are already dense.`,
    whoItFits: [
      'D2C brands and consumer marketplace founders',
      'Consumer apps with habit and retention, not only downloads',
      'Founders building for Bharat or vernacular audiences'
    ],
    whatToPrepare: [
      'Repeat rate, contribution margin, and CAC payback',
      'A clear wedge market (city, cohort, or category)',
      'Brand and distribution story beyond paid ads'
    ]
  },
  {
    id: 'ai-ml',
    label: 'AI / ML',
    eyebrow: 'Sector guide',
    summary: 'Funds backing applied AI, model-driven products, and enterprise AI workflows — not just AI wrappers.',
    writeup: `AI / ML investors look for real technical leverage: proprietary data, model fine-tuning, workflow depth, or distribution into a buyer who will pay for accuracy and speed. India has strong engineering talent and a growing set of enterprise and consumer AI products; investors want to separate durable AI businesses from thin wrappers on public models.

Expect deeper product and technical diligence than a typical consumer pitch. Questions centre on evaluation metrics, data moats, inference cost, and why the customer cannot just prompt ChatGPT. Vertical AI with workflow lock-in often reads better than horizontal chat tools.

Show the workflow, the before/after for the user, and any accuracy or cost edge. Be honest about model dependency and gross margins. If you are early, a sharp pilot with a named ICP beats vague “AI platform” language.`,
    whoItFits: [
      'Applied AI and ML product founders',
      'Vertical AI tools embedded in a real workflow',
      'Teams with technical depth and a clear evaluation story'
    ],
    whatToPrepare: [
      'Demo with measurable lift vs baseline',
      'Data, model, and cost structure overview',
      'ICP and why switching costs will grow'
    ]
  },
  {
    id: 'health',
    label: 'Healthcare / Medtech',
    eyebrow: 'Sector guide',
    summary: 'Healthtech, medtech, biotech-adjacent, and wellness investors underwriting India’s care delivery and life-sciences opportunity.',
    writeup: `Healthcare investors in India span digital health, care delivery, diagnostics, medtech devices, and wellness. Timelines can be longer than pure software, and regulation, clinical validation, and hospital or doctor distribution matter as much as product polish.

These investors ask how you acquire patients or providers, whether outcomes or cost savings are proven, and what the reimbursement or cash-pay reality looks like. Deep-science and device stories need stronger evidence packages; consumer wellness needs retention and brand clarity.

Pitch with clinical or operational proof, a realistic go-to-market through providers or employers, and capital needs that match regulatory milestones. Do not hide the long cycle — show why this team can navigate it.`,
    whoItFits: [
      'Digital health, care delivery, and diagnostics founders',
      'Medtech and life-sciences-adjacent teams with validation plans',
      'Wellness products with real retention, not only downloads'
    ],
    whatToPrepare: [
      'Evidence of outcomes, pilots, or clinical validation path',
      'Provider / patient acquisition plan',
      'Regulatory and capital milestone map'
    ]
  },
  {
    id: 'deeptech',
    label: 'Deep Tech',
    eyebrow: 'Sector guide',
    summary: 'Hard tech, deep science, semiconductors, robotics, space, and research-heavy companies that need patient capital.',
    writeup: `Deep tech investors underwrite science and engineering risk: semiconductors, robotics, space, advanced materials, deep R&D software, and lab-to-market stories. Cheque sizes and timelines often differ from classic SaaS seed rounds; many Indian deep-tech funds also connect to incubators, government programs, and corporate pilots.

Diligence is evidence-heavy: IP position, technical milestones, manufacturing or deployment path, and who the first customer is. Founders should expect longer fundraising cycles and more specialist questions.

Lead with the technical wedge and the first commercial beachhead. Show why India is an advantage (talent, cost, testbeds) and what milestone the round funds. Pair deep-tech capital with grants or strategic partners when it shortens the path to proof.`,
    whoItFits: [
      'Hard-tech and deep-science founders',
      'Teams with IP, lab validation, or engineering prototypes',
      'Companies needing patient capital and specialist networks'
    ],
    whatToPrepare: [
      'Technical milestone plan tied to the raise',
      'IP / differentiation summary',
      'First customer or pilot path'
    ]
  },
  {
    id: 'climate',
    label: 'Climate / Sustainability',
    eyebrow: 'Sector guide',
    summary: 'Climate, cleantech, energy transition, and sustainability investors funding India’s green economy.',
    writeup: `Climate and sustainability investors back energy transition, cleantech hardware and software, carbon and circularity, sustainable mobility, and climate adaptation. In India this often overlaps with manufacturing, logistics, agriculture, and industrial efficiency — not only consumer “green” brands.

Investors look for measurable impact plus a real business: payback for the customer, policy tailwinds, and a path to scale that does not depend forever on subsidies. Hardware-heavy stories need manufacturing and project-finance literacy; software climate tools need clear ROI for enterprises.

Pitch with the tonne or efficiency metric, the buyer’s payback period, and why now in India’s policy and infrastructure context. Be precise about additionality and avoid impact theatre.`,
    whoItFits: [
      'Cleantech, energy, and climate-tech founders',
      'Industrial efficiency and circularity businesses',
      'Teams that can quantify impact and customer ROI'
    ],
    whatToPrepare: [
      'Impact metric and customer payback math',
      'Policy / market timing thesis for India',
      'Scale path (manufacturing, distribution, or enterprise sales)'
    ]
  },
  {
    id: 'impact',
    label: 'Social Impact',
    eyebrow: 'Sector guide',
    summary: 'Impact and inclusion-focused capital for companies serving underserved users with sustainable models.',
    writeup: `Social impact investors look for businesses that expand access — financial inclusion, livelihoods, education for underserved segments, healthcare access, and climate-adjacent inclusion — while building durable unit economics. In India this capital often sits across AIFs, development finance, and thesis-driven VCs.

The bar is not charity: investors still want growth, retention, and a path to returns, but they weight outcomes for underserved users more heavily. Founders should expect questions on who is served, how impact is measured, and whether the model works without perpetual grant support.

Pitch both the impact narrative and the business narrative. Show density in a cohort that matters, honest economics, and how capital unlocks reach or product depth — not only awareness campaigns.`,
    whoItFits: [
      'Founders serving underserved or Bharat-first users',
      'Inclusion-focused fintech, edtech, health, and livelihood models',
      'Teams comfortable measuring outcomes alongside revenue'
    ],
    whatToPrepare: [
      'Clear beneficiary and outcome metrics',
      'Unit economics that can scale beyond grants',
      'Why this team reaches the community better than incumbents'
    ]
  }
];

module.exports = { SECTOR_GUIDES };
