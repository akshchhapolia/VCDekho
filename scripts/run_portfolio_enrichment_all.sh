#!/usr/bin/env bash
# Full portfolio enrichment: websites → sectors → deal details (multi-pass).
set -euo pipefail
cd "$(dirname "$0")/.."

LOG=/tmp/portfolio-all-run.log
echo "=== Portfolio enrichment ALL — started $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee "$LOG"

echo "" | tee -a "$LOG"
echo "=== Phase 1/4: Startup websites (--all-thin, budget \$200) ===" | tee -a "$LOG"
node scripts/enrich_portfolio_websites.js \
  --all-thin --limit 9999 --budget 200 --concurrency 2 --delay-ms 1200 \
  2>&1 | tee -a /tmp/portfolio-websites-all.log

echo "" | tee -a "$LOG"
echo "=== Phase 2/4: Sectors (--all) ===" | tee -a "$LOG"
node scripts/enrich_portfolio_sector.js --all --limit 9999 --concurrency 4 \
  2>&1 | tee -a /tmp/portfolio-sector-all-pass2.log

echo "" | tee -a "$LOG"
echo "=== Phase 3/4: Waiting for in-flight deal-details job ===" | tee -a "$LOG"
while pgrep -f "node scripts/enrich_portfolio_details.js" >/dev/null 2>&1; do
  echo "  … still running ($(date +%H:%M:%S))" | tee -a "$LOG"
  sleep 60
done

echo "" | tee -a "$LOG"
echo "=== Phase 4/4: Deal details — pass A (budget \$150) ===" | tee -a "$LOG"
node scripts/enrich_portfolio_details.js --all --budget 150 --concurrency 1 --delay-ms 7000 \
  2>&1 | tee -a /tmp/portfolio-news-all-pass2.log

echo "" | tee -a "$LOG"
echo "=== Phase 4/4: Deal details — pass B (budget \$150) ===" | tee -a "$LOG"
node scripts/enrich_portfolio_details.js --all --budget 150 --concurrency 1 --delay-ms 7000 \
  2>&1 | tee -a /tmp/portfolio-news-all-pass3.log

echo "" | tee -a "$LOG"
echo "=== Portfolio enrichment ALL — finished $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee -a "$LOG"
