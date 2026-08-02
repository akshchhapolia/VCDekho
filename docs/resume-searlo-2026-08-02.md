# Resume Searlo jobs — paused 2 Aug 2026 (credits depleted)

**Paused:** 2 Aug 2026 (~3:13 PM IST)  
**Reason:** Searlo returned `402 INSUFFICIENT_CREDITS` — **0 credits available**. Activity batch 2 stopped mid-run; portfolio job had already finished its `$25` budget.

**Do not restart until credits are topped up** (https://searlo.tech dashboard).

**Ops:** After the Resend alert system ships, Searlo `402` during cron backfill / vendor ping emails `team@vcdekho.com` automatically (see `docs/ops-alerts.md`).

---

## Progress this session (2 Aug)

### Task 1 — Recent activity thin-backfill

| Metric | Before | After |
|--------|--------|-------|
| Funds with 3 activity rows | 38 | **106** |
| Thin (≤2 checks) | 510 | **442** |

- Batch 1: 80/80 checked, 56 with activity, ~$0.07  
- Batch 2: 54/80 checked, 39 with activity, then **402 credits = 0** → stopped  

**Resume after top-up:**
```bash
cd VC_Dekho-main
node scripts/investor_activity_websearch.js \
  --thin-only --limit 80 --concurrency 1 --budget 5
```

### Task 2 — Portfolio amount/date enrichment

- Finished: processed **141**, updated **25** companies, est. spend **$25.00** (budget cap)  
- Many Blume portfolio rows filled; remaining gaps need another `--all` pass after credits

**Resume after top-up:**
```bash
node scripts/enrich_portfolio_details.js --all --budget 25 --concurrency 1 --delay-ms 10000
```

---

## Prompt for Cursor agent (after credit top-up)

> Searlo credits topped up. Resume from `docs/resume-searlo-2026-08-02.md`: (1) activity `--thin-only` until thin count drops, (2) portfolio `enrich_portfolio_details.js --all`. Can run in parallel at concurrency 1 each. Report activity distribution before/after.
