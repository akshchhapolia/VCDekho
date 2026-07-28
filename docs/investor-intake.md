# Investor intake rules (VC Dekho)

How we grow the Indian investor directory without flooding it with junk.

## In scope

Any investor that **regularly writes cheques** into India-domiciled or India-primary startups:

- India-HQ funds and managers
- NRI / diaspora funds with clear India deployment
- Global funds with a named India practice, India partners, or repeated India deals

## Out of scope (v1)

- Pure PE buyout shops with no venture / growth-equity cheque into startups
- Random LinkedIn “investor” profiles with no public track
- One-off angels without a public portfolio or syndicate affiliation
- LLM-invented rows without a **Source** URL

## Required fields before publish

| Field | Rule |
|-------|------|
| `Company` | Legal / market name |
| `Company Type` | VC, Micro VC, Family Office, Angel, Syndicate, PE, Accelerator, Corporate / CVC, etc. |
| `Website` **or** `Company Linkedin` | At least one |
| Stages **or** Cheque Size **or** Sector | At least one signal founders can filter on |
| `India relevance` | One of: `HQ India` / `India fund` / `Active India cheque` / `India practice (global)` |
| `Source` | Attributable URL (fund site, SEBI/AIF page, deal article, IVCA list, etc.) |
| `Data Confidence` | `Verified` only when website + thesis/cheque corroborated; else `Unverified – inferred` |

Thin name-only rows go in **staging** (`data/candidates/`), never into the Org sheet until filled.

## Pipeline

```
candidates CSV
  → scripts/dedupe_investor_candidates.js
  → human triage
  → append to Updated VC Dekho Sheet - Org.csv
  → (optional) node scripts/enrich_org_csv.js
  → npm run build:investors
  → npm run fetch:logos
  → preprod QA → prod
```

## Waves

- **Wave A** — high-confidence institutions (India + India-practice global), micro-VC gaps
- **Wave B** — family offices, accelerators, CVCs
- **Wave C** — high-signal named angels / syndicates

## Confidence policy

- Prefer fewer **Verified** rows over many empty profiles
- Do not auto-mark Claude-enriched copy as `Verified`
- Keep `% Verified` stable or rising when headcount grows
