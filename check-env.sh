#!/bin/bash

###############################################################################
# 環境変数チェックスクリプト
#
# 夜間タスク実行に必要な環境変数が設定されているか確認
#
# 使い方:
#   bash check-env.sh
#
# 終了コード:
#   0: すべてOK
#   1: 必須環境変数が不足
###############################################################################

echo "🔍 環境変数チェック"
echo ""

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# チェック結果
ALL_OK=true

# 1. Airtable API Key（必須）
echo -n "  AIRTABLE_API_KEY: "
if [ -z "$AIRTABLE_API_KEY" ]; then
  echo -e "${RED}❌ 未設定${NC}"
  ALL_OK=false
else
  # 最初の10文字のみ表示
  MASKED_KEY="${AIRTABLE_API_KEY:0:10}***"
  echo -e "${GREEN}✅ 設定済み${NC} ($MASKED_KEY)"
fi

# 2. Claude API Key（フェーズ2, 3で必須）
echo -n "  ANTHROPIC_API_KEY: "
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo -e "${YELLOW}⚠️  未設定${NC} (フェーズ2, 3で必要)"
else
  MASKED_KEY="${ANTHROPIC_API_KEY:0:10}***"
  echo -e "${GREEN}✅ 設定済み${NC} ($MASKED_KEY)"
fi

# 3. Discord Webhook（オプション）
echo -n "  DISCORD_WEBHOOK_URL: "
if [ -z "$DISCORD_WEBHOOK_URL" ]; then
  echo -e "${YELLOW}⚠️  未設定${NC} (オプション: GitHub Actions監視用)"
else
  echo -e "${GREEN}✅ 設定済み${NC}"
fi

echo ""

# 結果判定
if [ "$ALL_OK" = false ]; then
  echo -e "${RED}❌ 必須環境変数が不足しています${NC}"
  echo ""
  echo "環境変数を設定してください:"
  echo "  export AIRTABLE_API_KEY=\"your_api_key\""
  echo "  export ANTHROPIC_API_KEY=\"your_api_key\""
  echo ""
  echo "または、.envファイルを作成して読み込んでください:"
  echo "  source .env"
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ 環境変数チェック完了${NC}"
  echo ""
  exit 0
fi
