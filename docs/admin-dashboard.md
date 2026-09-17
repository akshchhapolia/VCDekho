# Admin dashboard

**URL:** https://vcdekho.com/admin/

**Auth:** Browser prompts for `ADMIN_SECRET` (stored in `sessionStorage` for the tab). Same secret as `/admin/review.html`.

## Panels

- System health (`/api/ops?action=health`)
- Counts: investors, people, articles published today, thin activity funds, contact messages (30d)
- Env flags: DATABASE / CRON / RESEND / SEARLO / ANTHROPIC / GEMINI
- Latest cron run per job (`ops_cron_runs`)
- Recent alerts (`ops_alerts`)
- **Send test alert** → Resend → `ALERT_TO`
- Link to **News review** queue

## Related

- [ops-alerts.md](./ops-alerts.md) — failure matrix & UptimeRobot
- [ga4-events.md](./ga4-events.md) — product analytics events
