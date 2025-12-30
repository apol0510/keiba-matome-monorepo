#!/bin/bash

###############################################################################
# 夜間タスク統合実行スクリプト（VSCodeクラッシュ対策込み）
#
# すべての夜間タスクを1コマンドで実行
#
# 使い方:
#   bash NIGHTRUN-FULL.sh [OPTIONS]
#
# オプション:
#   --phase1      フェーズ1のみ実行（無料タスク）
#   --phase2      フェーズ2のみ実行（SEO最適化）
#   --phase3      フェーズ3のみ実行（コメント品質分析）
#   --no-check    実行前チェックをスキップ
#   --auto        対話なしで全フェーズ実行
#
# 例:
#   bash NIGHTRUN-FULL.sh                    # 対話モードで選択
#   bash NIGHTRUN-FULL.sh --phase1           # フェーズ1のみ
#   bash NIGHTRUN-FULL.sh --auto             # 全自動実行
###############################################################################

set -e  # エラーで停止

# ================================================================================
# 初期設定
# ================================================================================

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ロゴ表示
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}║       🌙 夜間タスク統合実行スクリプト 🌙                  ║${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}║   keiba-matome-monorepo 運用改善・収益基盤強化            ║${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# スクリプトのディレクトリ取得
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# ログファイル
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$SCRIPT_DIR/nightrun-${TIMESTAMP}.log"

# 実行開始時刻
START_TIME=$(date +%s)

# ================================================================================
# オプション解析
# ================================================================================

RUN_PHASE1=false
RUN_PHASE2=false
RUN_PHASE3=false
SKIP_CHECK=false
AUTO_MODE=false

for arg in "$@"; do
  case $arg in
    --phase1)
      RUN_PHASE1=true
      ;;
    --phase2)
      RUN_PHASE2=true
      ;;
    --phase3)
      RUN_PHASE3=true
      ;;
    --no-check)
      SKIP_CHECK=true
      ;;
    --auto)
      AUTO_MODE=true
      RUN_PHASE1=true
      RUN_PHASE2=true
      RUN_PHASE3=false  # Phase 3は高コストなのでデフォルトOFF
      ;;
    *)
      echo -e "${RED}❌ 不明なオプション: $arg${NC}"
      exit 1
      ;;
  esac
done

# ================================================================================
# ヘルパー関数
# ================================================================================

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

print_step() {
  echo ""
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${MAGENTA}▶ $1${NC}"
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  log "STEP: $1"
}

print_ok() {
  echo -e "${GREEN}✅ $1${NC}"
  log "OK: $1"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
  log "ERROR: $1"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  log "WARNING: $1"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
  log "INFO: $1"
}

# ================================================================================
# ステップ0: 実行前チェック
# ================================================================================

if [ "$SKIP_CHECK" = false ]; then
  print_step "実行前チェック"

  if bash "$SCRIPT_DIR/pre-flight-check.sh"; then
    print_ok "実行前チェック完了"
  else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 2 ]; then
      print_error "致命的エラーがあります。実行を中止します。"
      exit 1
    else
      print_warning "警告がありますが、継続します..."
      sleep 2
    fi
  fi
fi

# ================================================================================
# ステップ0.5: caffeinate起動確認
# ================================================================================

print_step "スリープ防止設定"

if pgrep -x "caffeinate" > /dev/null; then
  print_ok "caffeinate は既に実行中です"
else
  print_warning "caffeinate を起動します..."
  caffeinate -d &
  sleep 1
  if pgrep -x "caffeinate" > /dev/null; then
    print_ok "caffeinate 起動成功"
  else
    print_error "caffeinate 起動失敗"
    exit 1
  fi
fi

# ================================================================================
# 対話モード: フェーズ選択
# ================================================================================

if [ "$AUTO_MODE" = false ] && [ "$RUN_PHASE1" = false ] && [ "$RUN_PHASE2" = false ] && [ "$RUN_PHASE3" = false ]; then
  echo ""
  echo "実行するフェーズを選択してください:"
  echo ""
  echo "  1. フェーズ1のみ（無料タスク、約25分、¥0）"
  echo "  2. フェーズ1 + 2（SEO最適化、約70分、¥2,100）"
  echo "  3. フェーズ1 + 2 + 3（全タスク、約2.5-3時間、¥8,100）"
  echo "  4. カスタム選択"
  echo ""
  read -p "選択 [1-4]: " CHOICE

  case $CHOICE in
    1)
      RUN_PHASE1=true
      ;;
    2)
      RUN_PHASE1=true
      RUN_PHASE2=true
      ;;
    3)
      RUN_PHASE1=true
      RUN_PHASE2=true
      RUN_PHASE3=true
      ;;
    4)
      read -p "フェーズ1を実行しますか？ [y/N]: " P1
      [ "$P1" = "y" ] && RUN_PHASE1=true

      read -p "フェーズ2を実行しますか？ [y/N]: " P2
      [ "$P2" = "y" ] && RUN_PHASE2=true

      read -p "フェーズ3を実行しますか？ [y/N]: " P3
      [ "$P3" = "y" ] && RUN_PHASE3=true
      ;;
    *)
      print_error "無効な選択です"
      exit 1
      ;;
  esac
fi

# ================================================================================
# 実行サマリー表示
# ================================================================================

echo ""
echo "="$(printf '=%.0s' {1..60})
echo "📊 実行サマリー"
echo "="$(printf '=%.0s' {1..60})
echo ""
echo "  フェーズ1（無料タスク）:          $([ "$RUN_PHASE1" = true ] && echo "✅ 実行" || echo "⏭️  スキップ")"
echo "  フェーズ2（SEO最適化）:           $([ "$RUN_PHASE2" = true ] && echo "✅ 実行" || echo "⏭️  スキップ")"
echo "  フェーズ3（コメント品質分析）:    $([ "$RUN_PHASE3" = true ] && echo "✅ 実行" || echo "⏭️  スキップ")"
echo ""
echo "  推定所要時間: $(
  TIME=0
  [ "$RUN_PHASE1" = true ] && TIME=$((TIME + 25))
  [ "$RUN_PHASE2" = true ] && TIME=$((TIME + 45))
  [ "$RUN_PHASE3" = true ] && TIME=$((TIME + 120))
  echo "${TIME}分"
)"
echo "  推定コスト:   $(
  COST=0
  [ "$RUN_PHASE2" = true ] && COST=$((COST + 2100))
  [ "$RUN_PHASE3" = true ] && COST=$((COST + 6000))
  echo "¥${COST}"
)"
echo ""
echo "  ログファイル: $LOG_FILE"
echo ""
echo "="$(printf '=%.0s' {1..60})
echo ""

if [ "$AUTO_MODE" = false ]; then
  read -p "実行を開始しますか？ [y/N]: " CONFIRM
  if [ "$CONFIRM" != "y" ]; then
    print_info "実行をキャンセルしました"
    exit 0
  fi
fi

# ================================================================================
# フェーズ1: 無料タスク
# ================================================================================

if [ "$RUN_PHASE1" = true ]; then
  print_step "フェーズ1: 無料タスク（約25分、¥0）"

  # 1. Airtableバックアップ
  print_info "1/4: Airtableバックアップ（約5分）"
  if AIRTABLE_API_KEY="$AIRTABLE_API_KEY" node packages/shared/scripts/backup-airtable.cjs 2>&1 | tee -a "$LOG_FILE"; then
    print_ok "Airtableバックアップ完了"
  else
    print_error "Airtableバックアップ失敗"
  fi

  # 2. GitHub Actions監視
  print_info "2/4: GitHub Actions監視（数秒）"
  if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    if DISCORD_WEBHOOK_URL="$DISCORD_WEBHOOK_URL" node packages/shared/scripts/monitor-github-actions.cjs 2>&1 | tee -a "$LOG_FILE"; then
      print_ok "GitHub Actions監視完了"
    else
      print_warning "GitHub Actions監視失敗（スキップ）"
    fi
  else
    print_warning "DISCORD_WEBHOOK_URL 未設定（スキップ）"
  fi

  # 3. 統計レポート送信
  print_info "3/4: 統計レポート送信（数秒）"
  if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    if DISCORD_WEBHOOK_URL="$DISCORD_WEBHOOK_URL" node packages/shared/scripts/monitor-github-actions.cjs stats 2>&1 | tee -a "$LOG_FILE"; then
      print_ok "統計レポート送信完了"
    else
      print_warning "統計レポート送信失敗（スキップ）"
    fi
  else
    print_warning "DISCORD_WEBHOOK_URL 未設定（スキップ）"
  fi

  # 4. スクレイピング安定性テスト（オプション）
  print_info "4/4: スクレイピング安定性テスト（約17分、オプション）"
  read -p "スクレイピング安定性テストを実行しますか？ [y/N]: " RUN_STABILITY
  if [ "$RUN_STABILITY" = "y" ] || [ "$AUTO_MODE" = true ]; then
    if AIRTABLE_API_KEY="$AIRTABLE_API_KEY" node packages/shared/scripts/test-scraping-stability.cjs 2>&1 | tee -a "$LOG_FILE"; then
      print_ok "スクレイピング安定性テスト完了"
    else
      print_warning "スクレイピング安定性テスト失敗（スキップ）"
    fi
  else
    print_info "スクレイピング安定性テストをスキップしました"
  fi

  print_ok "フェーズ1完了"
fi

# ================================================================================
# フェーズ2: SEO最適化
# ================================================================================

if [ "$RUN_PHASE2" = true ]; then
  print_step "フェーズ2: SEO最適化（約45分、¥2,100）"

  if [ -z "$ANTHROPIC_API_KEY" ]; then
    print_error "ANTHROPIC_API_KEY が未設定です。フェーズ2をスキップします。"
  else
    PROJECTS=("keiba-matome" "chihou-keiba-matome" "yosou-keiba-matome")

    for i in "${!PROJECTS[@]}"; do
      PROJECT="${PROJECTS[$i]}"
      print_info "$((i+1))/3: SEO最適化 - $PROJECT"

      if ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" AIRTABLE_API_KEY="$AIRTABLE_API_KEY" \
         node packages/shared/scripts/optimize-seo.cjs --project="$PROJECT" 2>&1 | tee -a "$LOG_FILE"; then
        print_ok "$PROJECT のSEO最適化完了"
      else
        print_error "$PROJECT のSEO最適化失敗"
      fi
    done

    print_ok "フェーズ2完了"
  fi
fi

# ================================================================================
# フェーズ2.5: OGP画像生成（オプション）
# ================================================================================

if [ "$RUN_PHASE2" = true ]; then
  print_step "フェーズ2.5: OGP画像生成（約5分、¥0、オプション）"

  read -p "OGP画像を生成しますか？ [y/N]: " RUN_OGP
  if [ "$RUN_OGP" = "y" ] || [ "$AUTO_MODE" = true ]; then
    PROJECTS=("keiba-matome" "chihou-keiba-matome" "yosou-keiba-matome")

    for i in "${!PROJECTS[@]}"; do
      PROJECT="${PROJECTS[$i]}"
      print_info "$((i+1))/3: OGP画像生成 - $PROJECT"

      if AIRTABLE_API_KEY="$AIRTABLE_API_KEY" \
         node packages/shared/scripts/generate-ogp-images.cjs --project="$PROJECT" --limit=10 2>&1 | tee -a "$LOG_FILE"; then
        print_ok "$PROJECT のOGP画像生成完了"
      else
        print_error "$PROJECT のOGP画像生成失敗"
      fi
    done

    print_ok "OGP画像生成完了"
  else
    print_info "OGP画像生成をスキップしました"
  fi
fi

# ================================================================================
# フェーズ3: コメント品質大規模分析
# ================================================================================

if [ "$RUN_PHASE3" = true ]; then
  print_step "フェーズ3: コメント品質大規模分析（約90-120分、¥6,000）"

  if [ -z "$ANTHROPIC_API_KEY" ]; then
    print_error "ANTHROPIC_API_KEY が未設定です。フェーズ3をスキップします。"
  else
    print_warning "⚠️  このフェーズは高コスト（¥6,000）です。本当に実行しますか？"
    read -p "実行する [y/N]: " CONFIRM_PHASE3

    if [ "$CONFIRM_PHASE3" = "y" ] || [ "$AUTO_MODE" = true ]; then
      PROJECTS=("keiba-matome" "chihou-keiba-matome" "yosou-keiba-matome")

      for i in "${!PROJECTS[@]}"; do
        PROJECT="${PROJECTS[$i]}"
        print_info "$((i+1))/3: コメント品質分析 - $PROJECT"

        if ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" AIRTABLE_API_KEY="$AIRTABLE_API_KEY" \
           node packages/shared/scripts/analyze-comment-quality.cjs --project="$PROJECT" --limit=50 2>&1 | tee -a "$LOG_FILE"; then
          print_ok "$PROJECT のコメント品質分析完了"
        else
          print_error "$PROJECT のコメント品質分析失敗"
        fi
      done

      print_ok "フェーズ3完了"
    else
      print_info "フェーズ3をスキップしました"
    fi
  fi
fi

# ================================================================================
# 完了サマリー
# ================================================================================

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$((DURATION / 60))
DURATION_SEC=$((DURATION % 60))

echo ""
echo "="$(printf '=%.0s' {1..60})
echo -e "${GREEN}🎉 夜間タスク実行完了${NC}"
echo "="$(printf '=%.0s' {1..60})
echo ""
echo "  実行時間: ${DURATION_MIN}分${DURATION_SEC}秒"
echo "  ログファイル: $LOG_FILE"
echo ""
echo "次のアクション:"
echo ""

if [ "$RUN_PHASE1" = true ]; then
  echo "  ✅ バックアップファイル確認:"
  echo "     ls -lh packages/backups/"
  echo ""
fi

if [ "$RUN_PHASE2" = true ]; then
  echo "  ✅ SEO出力ファイル確認:"
  echo "     ls -lh packages/seo-output/"
  echo ""
  echo "  ✅ sitemap.xml を public/ にコピー:"
  echo "     cp packages/seo-output/*/sitemap.xml packages/*/public/"
  echo ""
fi

if [ "$RUN_PHASE3" = true ]; then
  echo "  ✅ コメント品質分析レポート確認:"
  echo "     cat packages/quality-reports/comment-quality-report-*.json | jq '.aggregateStats'"
  echo ""
fi

echo "="$(printf '=%.0s' {1..60})
echo ""

print_ok "すべてのタスクが完了しました！ 🚀"
echo ""
