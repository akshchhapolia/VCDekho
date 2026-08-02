# GA4 events (VC Dekho)

Property: **`G-BJ23KLLWFM`** (loaded via `/js/analytics.js`).

Helper: `window.VCAnalytics.track(eventName, params)`.

## Events shipped

| Event | Params | Where |
|-------|--------|--------|
| `login_start` | `method` | OTP send |
| `login_success` | `method` | OTP verify |
| `dir_filter_change` | `directory`, `filter`, `value` | Funds / Investors filters |
| `dir_result_click` | `directory`, `slug` | Directory row → profile |
| `profile_cta_click` | `cta`, `kind` | LinkedIn / website / email / firm |
| `nav_click` | `href`, `label` | Main nav |
| `contact_submit` | — | Contact form |

Also: any element with `data-analytics-event` (+ optional `data-analytics-params` JSON).

## GA4 Admin setup

1. GA4 → **Admin → Events** — confirm events arrive (Realtime / DebugView)
2. Mark as **key events / conversions**: `login_success`, `dir_result_click`, `contact_submit`
3. **Explore → Funnel**: Landing → `login_start` → `login_success` → `dir_filter_change` → `dir_result_click` → `profile_cta_click`

## Cache

Bump `analytics.js` query string on HTML pages when changing the helper (many pages load `/js/analytics.js` without a version — hard-refresh or add `?v=` when needed).
