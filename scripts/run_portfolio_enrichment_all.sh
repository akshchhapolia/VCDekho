#!/usr/bin/env bash
# Full portfolio enrichment: websites → sectors → deal details (multi-pass).
cd "$(dirname "$0")/.."

LOG=/tmp/portfolio-all-run.log
echo "=== Portfolio enrichment ALL — started $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" >> "$LOG"

echo "=== Phase 1/4: Startup websites (--all-thin, budget \$200) ===" >> "$LOG"
node scripts/enrich_portfolio_websites.js \
  --all-thin --limit 9999 --budget 200 --concurrency 2 --delay-ms 1200 \
  >> /tmp/portfolio-websites-all.log 2>&1

echo "=== Phase 2/4: Sectors (--all) ===" >> "$LOG"
node scripts/enrich_portfolio_sector.js --all --limit 9999 --concurrency 4 \
  >> /tmp/portfolio-sector-all-pass2.log 2>&1

echo "=== Phase 3/4: Waiting for in-flight deal-details job ===" >> "$LOG"
while pgrep -f "node scripts/enrich_portfolio_details.js" >/dev/null 2>&1; do
  echo "  … still running ($(date +%H:%M:%S))" >> "$LOG"
  sleep 60
done

echo "=== Phase 4A: Deal details pass (budget \$150) ===" >> "$LOG"
node scripts/enrich_portfolio_details.js --all --budget 150 --concurrency 1 --delay-ms 7000 \
  >> /tmp/portfolio-news-all-pass2.log 2>&1

echo "=== Phase 4B: Deal details pass (budget \$150) ===" >> "$LOG"
node scripts/enrich_portfolio_details.js --all --budget 150 --concurrency 1 --delay-ms 7000 \
  >> /tmp/portfolio-news-all-pass3.log 2>&1

echo "=== Portfolio enrichment ALL — finished $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" >> "$LOG"
