# Resume after Searlo daily limit — 2 Aug 2026

**Paused:** 1 Aug 2026 (~2:37 PM IST)  
**Reason:** Searlo Search API daily quota exhausted — **5,000 / 5,000** (Micro tier). Dashboard showed 100% daily usage; backfill run hit repeated `429` / `4201` rate-limit errors.

**Do not start Searlo jobs until the daily counter resets** (check https://searlo.tech dashboard → Rate Limits → “Per Day”).

---

## Already done (no Searlo needed)

- [x] **3 recent-activity limit (code)** — deployed to prod
  - Display cap: 3 items per fund profile (`RECENT_ACTIVITY_LIMIT = 3`)
  - Storage cap: 3 checks in `investor_activity.recent_checks`
  - Web-search lookup now runs a **second query** when the first returns fewer than 3 deals
  - News pipeline re-run locally (`41` investors updated from news)
- [x] **Funds / Investors rename** — deployed earlier today

---

## Task 1 — Recent activity backfill (Searlo + Gemini)

**Goal:** Fill funds that still have only 1 activity row up to 3 where data exists.

**Script:** `scripts/investor_activity_websearch.js`  
**Flag:** `--thin-only` (targets funds with ≤2 stored checks)

```bash
cd VC_Dekho-main

# After Searlo daily reset — start conservative (dual-search = ~2 Searlo calls per fund)
node scripts/investor_activity_websearch.js \
  --thin-only \
  --limit 80 \
  --concurrency 1 \
  --budget 5
```

**Notes from failed run (1 Aug):**
- Started `--thin-only --limit 40 --concurrency 2 --budget 4`
- Most funds failed immediately with Searlo 429 (quota already gone)
- Re-run with **`--concurrency 1`** to stay under per-minute limits once daily quota resets

**Verify after run:**
```bash
node -e "
require('dotenv').config();
const db = require('./utils/db');
(async () => {
  const { rows } = await db.query(\`
    SELECT jsonb_array_length(COALESCE(recent_checks,'[]'::jsonb)) AS n, COUNT(*) AS c
    FROM investor_activity WHERE last_check_date IS NOT NULL
    GROUP BY 1 ORDER BY 1\`);
  console.table(rows);
  process.exit(0);
})();"
```

Spot-check a profile, e.g. `/investors/100unicorns` — should show up to 3 activity rows when data exists.

---

## Task 2 — Portfolio enrichment via Searlo (if still in queue)

**Goal:** Backfill portfolio company amount / stage / date / website from news search.

**Scripts (both use Searlo via `utils/web-search.js`):**
- `scripts/investor_portfolio_websearch.js` — portfolio discovery backfill
- `scripts/enrich_portfolio_details.js` — amount/date enrichment for existing rows

Pick up whichever batch was paused; typical safe restart:

```bash
# Portfolio details enrichment (adjust limit/budget as needed)
node scripts/enrich_portfolio_details.js --limit 200

# OR portfolio websearch backfill
node scripts/investor_portfolio_websearch.js --limit 100 --concurrency 2 --budget 5
```

---

## Searlo budget tips for tomorrow

| Setting | Recommendation |
|--------|------------------|
| Daily cap | 5,000 searches — plan batches, don’t run Task 1 + Task 2 in parallel |
| Activity backfill | ~2 searches/fund (dual query) → 80 funds ≈ 160 searches |
| Concurrency | Use `1–2` on Micro tier |
| Order | Run **activity thin backfill first**, then portfolio jobs |

---

## Prompt for Cursor agent (copy-paste tomorrow)

> Searlo daily limit has reset. Please resume the paused Searlo tasks from `docs/resume-searlo-2026-08-02.md`: (1) activity thin backfill for 3 recent activities per fund, then (2) any pending portfolio Searlo enrichment. Check Searlo dashboard first, use low concurrency, and report before/after activity count distribution.
