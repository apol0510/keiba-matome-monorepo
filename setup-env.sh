#!/bin/bash

###############################################################################
# 環境変数セットアップスクリプト
#
# .envファイルを対話的に作成
#
# 使い方:
#   bash setup-env.sh
###############################################################################

echo "🔐 環境変数セットアップ"
echo ""

# .envファイルが既に存在する場合
if [ -f ".env" ]; then
  echo "⚠️  .envファイルが既に存在します"
  read -p "上書きしますか？ [y/N]: " OVERWRITE
  if [ "$OVERWRITE" != "y" ]; then
    echo "セットアップをキャンセルしました"
    exit 0
  fi
fi

# Airtable API Key
echo "📋 Airtable API Key を入力してください"
echo ""
echo "取得方法: https://airtable.com/account → API → Personal access tokens"
echo ""
echo "既存のキー（参考）:"
echo "  - chihou-keiba-matome: patCIn4iIx274YQZB..."
echo "  - yosou-keiba-matome: patkpjNBAn2is12XO..."
echo ""
read -p "AIRTABLE_API_KEY: " AIRTABLE_API_KEY

# Anthropic API Key
echo ""
echo "🤖 Anthropic (Claude) API Key を入力してください"
echo ""
echo "取得方法: https://console.anthropic.com/ → API Keys → Create Key"
echo ""
read -p "ANTHROPIC_API_KEY: " ANTHROPIC_API_KEY

# Discord Webhook (オプション)
echo ""
echo "📢 Discord Webhook URL を入力してください（オプション、Enterでスキップ）"
echo ""
echo "取得方法: Discord サーバー設定 → 連携サービス → ウェブフック"
echo ""
read -p "DISCORD_WEBHOOK_URL (オプション): " DISCORD_WEBHOOK_URL

# .envファイル作成
cat > .env << EOF
# Airtable API Key
export AIRTABLE_API_KEY="$AIRTABLE_API_KEY"

# Anthropic (Claude) API Key
export ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"

# Discord Webhook URL (オプション)
export DISCORD_WEBHOOK_URL="$DISCORD_WEBHOOK_URL"
EOF

echo ""
echo "✅ .envファイルを作成しました"
echo ""

# .gitignoreに追加
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
  echo ".env" >> .gitignore
  echo "✅ .gitignore に .env を追加しました"
  echo ""
fi

# 環境変数を読み込む
source .env

# 確認
echo "🔍 環境変数チェック"
echo ""
bash check-env.sh

echo ""
echo "="$(printf '=%.0s' {1..60})
echo "✅ セットアップ完了"
echo "="$(printf '=%.0s' {1..60})
echo ""
echo "次のステップ:"
echo ""
echo "  1. 環境変数を読み込む:"
echo "     source .env"
echo ""
echo "  2. 夜間タスクを実行:"
echo "     bash NIGHTRUN-FULL.sh"
echo ""
