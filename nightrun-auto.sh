#!/bin/bash
# nightrun-auto.sh - 完全自動実行スクリプト
# 就寝中に自動実行されるスクリプト

set -e  # エラー時に停止

# カラー出力
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "============================================================"
echo "🌙 NIGHTRUN Auto-Execution Started"
echo "   Date: $(date)"
echo "   Cost: ¥2,100 (SEO Optimization)"
echo "   Duration: ~1-2 hours"
echo "============================================================"
echo ""

# 環境変数読み込み
if [ -f .env ]; then
    source .env
    echo "✅ Environment variables loaded"
else
    echo "❌ .env file not found!"
    exit 1
fi

# 開始時刻記録
START_TIME=$(date +%s)

# ログディレクトリ作成
LOG_DIR="nightrun-logs"
mkdir -p $LOG_DIR
LOG_FILE="$LOG_DIR/nightrun-$(date +%Y%m%d-%H%M%S).log"

# ログ関数
log() {
    echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1" | tee -a $LOG_FILE
}

log_error() {
    echo -e "${RED}[$(date +%H:%M:%S)] ERROR:${NC} $1" | tee -a $LOG_FILE
}

log_section() {
    echo "" | tee -a $LOG_FILE
    echo "============================================================" | tee -a $LOG_FILE
    echo -e "${BLUE}$1${NC}" | tee -a $LOG_FILE
    echo "============================================================" | tee -a $LOG_FILE
    echo "" | tee -a $LOG_FILE
}

# ============================================================
# フェーズ1: バックアップ + 監視（無料）
# ============================================================

log_section "📦 Phase 1: Backup & Monitoring (¥0)"

log "1️⃣ Airtable Backup..."
if node packages/shared/scripts/backup-airtable.cjs >> $LOG_FILE 2>&1; then
    log "✅ Airtable backup completed"
else
    log_error "Airtable backup failed"
fi

log "2️⃣ GitHub Actions Monitoring..."
if DISCORD_WEBHOOK_URL="$DISCORD_WEBHOOK_URL" node packages/shared/scripts/monitor-github-actions.cjs >> $LOG_FILE 2>&1; then
    log "✅ GitHub Actions monitoring completed"
else
    log_error "GitHub Actions monitoring failed"
fi

# ============================================================
# フェーズ2: SEO最適化（¥2,100）
# ============================================================

log_section "🔍 Phase 2: SEO Optimization (¥2,100)"

log "3️⃣ SEO Optimization: keiba-matome..."
if node packages/shared/scripts/optimize-seo.cjs --project=keiba-matome --limit=10 >> $LOG_FILE 2>&1; then
    log "✅ keiba-matome SEO completed"
else
    log_error "keiba-matome SEO failed"
fi

log "4️⃣ SEO Optimization: chihou-keiba-matome..."
if node packages/shared/scripts/optimize-seo.cjs --project=chihou-keiba-matome --limit=10 >> $LOG_FILE 2>&1; then
    log "✅ chihou-keiba-matome SEO completed"
else
    log_error "chihou-keiba-matome SEO failed"
fi

log "5️⃣ SEO Optimization: yosou-keiba-matome..."
if node packages/shared/scripts/optimize-seo.cjs --project=yosou-keiba-matome --limit=10 >> $LOG_FILE 2>&1; then
    log "✅ yosou-keiba-matome SEO completed"
else
    log_error "yosou-keiba-matome SEO failed"
fi

# ============================================================
# フェーズ3: スクレイピング安定性テスト（無料）
# ============================================================

log_section "🧪 Phase 3: Scraping Stability Test (¥0)"

log "6️⃣ Scraping Stability Test (75 tests, ~10 minutes)..."
if node packages/shared/scripts/test-scraping-stability.cjs >> $LOG_FILE 2>&1; then
    log "✅ Scraping stability test completed"
else
    log_error "Scraping stability test failed"
fi

# ============================================================
# フェーズ4: ビルドテスト（無料）
# ============================================================

log_section "🏗️ Phase 4: Build Test (¥0)"

log "7️⃣ Building keiba-matome..."
if npm run build --workspace=packages/keiba-matome >> $LOG_FILE 2>&1; then
    log "✅ keiba-matome build successful"
else
    log_error "keiba-matome build failed"
fi

log "8️⃣ Building chihou-keiba-matome..."
if npm run build --workspace=packages/chihou-keiba-matome >> $LOG_FILE 2>&1; then
    log "✅ chihou-keiba-matome build successful"
else
    log_error "chihou-keiba-matome build failed"
fi

log "9️⃣ Building yosou-keiba-matome..."
if npm run build --workspace=packages/yosou-keiba-matome >> $LOG_FILE 2>&1; then
    log "✅ yosou-keiba-matome build successful"
else
    log_error "yosou-keiba-matome build failed"
fi

# ============================================================
# 完了レポート
# ============================================================

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$((DURATION / 60))

log_section "🎉 NIGHTRUN Completed!"

echo "" | tee -a $LOG_FILE
echo "============================================================" | tee -a $LOG_FILE
echo "📊 Summary" | tee -a $LOG_FILE
echo "============================================================" | tee -a $LOG_FILE
echo "Start Time:  $(date -r $START_TIME)" | tee -a $LOG_FILE
echo "End Time:    $(date)" | tee -a $LOG_FILE
echo "Duration:    ${DURATION_MIN} minutes" | tee -a $LOG_FILE
echo "Total Cost:  ¥2,100" | tee -a $LOG_FILE
echo "Log File:    $LOG_FILE" | tee -a $LOG_FILE
echo "============================================================" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

log "✅ All tasks completed successfully!"
log "📄 Full log: $LOG_FILE"

# Discord通知（オプション）
if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    curl -H "Content-Type: application/json" \
         -d "{\"content\": \"🌙 **NIGHTRUN Completed!**\n\n✅ Duration: ${DURATION_MIN} minutes\n💰 Cost: ¥2,100\n📄 Log: \`$LOG_FILE\`\"}" \
         "$DISCORD_WEBHOOK_URL" >> $LOG_FILE 2>&1
fi

echo ""
echo "🌙 Good night! All tasks completed while you were sleeping."
