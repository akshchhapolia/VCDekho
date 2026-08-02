# Ops alerts & health

Alerts email **`team@vcdekho.com`** (override with `ALERT_TO`) via **Resend**.

## Env (Vercel Production)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key |
| `ALERT_FROM` | e.g. `VC Dekho Alerts <alerts@vcdekho.com>` (domain must be verified in Resend) |
| `ALERT_TO` | default `team@vcdekho.com` |
| `CRON_SECRET` | Bearer for cron + vendor ping |
| `ADMIN_SECRET` | Admin dashboard + test alert |
| `DATABASE_URL` | Postgres (required) |

## Endpoints (`/api/ops`)

| Action | Auth | Role |
|--------|------|------|
| `?action=health` | public | Uptime checks — `200` ok / `503` degraded |
| `?action=sitemap` | public | Sitemap (also `/sitemap.xml`) |
| `?action=status` | `ADMIN_SECRET` | Dashboard metrics |
| `?action=test-alert` | `ADMIN_SECRET` | Force-send test email |
| `?action=ping-vendors` | `CRON_SECRET` | Daily Searlo/Gemini/Anthropic watch |

## What triggers email

- Any cron job throw (scrape, ai-process, daily-digest, ai-blog, investor-activity)
- RSS scrape: all (or nearly all) sources fail
- AI process: queue non-empty but 0 processed
- Activity backfill: Searlo `402` / fatal vendor errors
- Vendor watch cron (`0 5 * * *` UTC): Searlo/Gemini failures, low credits, missing Anthropic key
- Health: missing `DATABASE_URL` in production (deduped)

Dedup window: **6 hours** per `source|subject` key (`ops_alerts` table).

## UptimeRobot (recommended)

1. Monitor type: **HTTP(s)**
2. URL: `https://vcdekho.com/api/ops?action=health`
3. Interval: 5 minutes
4. Alert contact: `team@vcdekho.com`
5. Optionally also monitor `https://vcdekho.com/` (static vs API)

## Local migration

Tables auto-create on first ops/cron call. Manual:

```bash
psql "$DATABASE_URL" -f scripts/migrations/2026-08-02-ops-tables.sql
```

## Test alert

1. Open `/admin/`
2. Enter `ADMIN_SECRET`
3. Click **Send test alert**
4. Confirm inbox at `team@vcdekho.com`
