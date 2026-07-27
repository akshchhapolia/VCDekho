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
  }
];

module.exports = { THESIS_THEMES };
