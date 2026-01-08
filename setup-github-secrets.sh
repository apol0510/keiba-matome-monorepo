#!/bin/bash

###############################################################################
# GitHub Secrets設定スクリプト（monorepo統合版）
#
# このスクリプトは、10サイト以上に拡大しても保守コストが増えない設計です
#
# 使い方:
#   bash setup-github-secrets.sh
###############################################################################

set -e

echo "============================================"
echo "GitHub Secrets設定（monorepo統合版）"
echo "============================================"
echo ""

# gh CLIがインストールされているか確認
if ! command -v gh &> /dev/null; then
  echo "❌ gh CLI がインストールされていません"
  echo ""
  echo "インストール方法:"
  echo "  brew install gh"
  echo ""
  exit 1
fi

# 認証確認
if ! gh auth status &> /dev/null; then
  echo "❌ GitHub認証が必要です"
  echo ""
  echo "認証方法:"
  echo "  gh auth login"
  echo ""
  exit 1
fi

echo "✅ gh CLI認証済み"
echo ""

# ============================================
# 1. AIRTABLE_API_KEY
# ============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. AIRTABLE_API_KEY（全プロジェクト共通）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "取得方法: https://airtable.com/create/tokens"
echo "必要なScopes:"
echo "  - data.records:read"
echo "  - data.records:write"
echo "  - schema.bases:read"
echo ""
echo "必要なAccess（3つのBaseすべて）:"
echo "  - appdHJSC4F9pTIoDj（keiba-matome）"
echo "  - appt25zmKxQDiSCwh（chihou-keiba-matome）"
echo "  - appKPasSpjpTtabnv（yosou-keiba-matome）"
echo ""
read -sp "AIRTABLE_API_KEY: " AIRTABLE_API_KEY
echo ""

if [ -z "$AIRTABLE_API_KEY" ]; then
  echo "❌ AIRTABLE_API_KEYが入力されていません"
  exit 1
fi

gh secret set AIRTABLE_API_KEY --body "$AIRTABLE_API_KEY"
echo "✅ AIRTABLE_API_KEY 設定完了"
echo ""

# ============================================
# 2. ANTHROPIC_API_KEY
# ============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. ANTHROPIC_API_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "取得方法: https://console.anthropic.com/ → API Keys"
echo ""

# .envから既存のキーを読み込む
if [ -f ".env" ] && grep -q "ANTHROPIC_API_KEY=" .env; then
  EXISTING_ANTHROPIC=$(grep "ANTHROPIC_API_KEY=" .env | cut -d'"' -f2)
  echo "既存のキーが見つかりました: ${EXISTING_ANTHROPIC:0:20}..."
  read -p "このキーを使用しますか？ [Y/n]: " USE_EXISTING

  if [ "$USE_EXISTING" != "n" ] && [ "$USE_EXISTING" != "N" ]; then
    ANTHROPIC_API_KEY="$EXISTING_ANTHROPIC"
  else
    read -sp "ANTHROPIC_API_KEY: " ANTHROPIC_API_KEY
    echo ""
  fi
else
  read -sp "ANTHROPIC_API_KEY: " ANTHROPIC_API_KEY
  echo ""
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌ ANTHROPIC_API_KEYが入力されていません"
  exit 1
fi

gh secret set ANTHROPIC_API_KEY --body "$ANTHROPIC_API_KEY"
echo "✅ ANTHROPIC_API_KEY 設定完了"
echo ""

# ============================================
# 3. X_CREDENTIALS_JSON
# ============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. X_CREDENTIALS_JSON（全サイトの認証情報）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  重要: X DEV APIは1サイト1アカウント必須"
echo "   3サイトなら3個のX DEVアカウントが必要です"
echo ""
echo "取得方法: https://developer.twitter.com/ → Projects & Apps"
echo ""

# JSON作成
JSON_FILE=$(mktemp)

echo "{" > "$JSON_FILE"

for i in {1..3}; do
  case $i in
    1) SITE="keiba-matome"; KEY="KEIBA_MATOME_X"; ACCOUNT="@keiba_matome_jp" ;;
    2) SITE="chihou-keiba-matome"; KEY="CHIHOU_X"; ACCOUNT="@chihou_keiba_jp" ;;
    3) SITE="yosou-keiba-matome"; KEY="YOSOU_X"; ACCOUNT="@yosou_keiba_jp" ;;
  esac

  echo ""
  echo "【$SITE】 $ACCOUNT"
  echo "────────────────────────────────────────"
  read -sp "  API Key: " API_KEY
  echo ""
  read -sp "  API Secret: " API_SECRET
  echo ""
  read -sp "  Access Token: " ACCESS_TOKEN
  echo ""
  read -sp "  Access Secret: " ACCESS_SECRET
  echo ""

  if [ -z "$API_KEY" ] || [ -z "$API_SECRET" ] || [ -z "$ACCESS_TOKEN" ] || [ -z "$ACCESS_SECRET" ]; then
    echo "❌ 入力が不完全です"
    rm "$JSON_FILE"
    exit 1
  fi

  echo "  \"$KEY\": {" >> "$JSON_FILE"
  echo "    \"apiKey\": \"$API_KEY\"," >> "$JSON_FILE"
  echo "    \"apiSecret\": \"$API_SECRET\"," >> "$JSON_FILE"
  echo "    \"accessToken\": \"$ACCESS_TOKEN\"," >> "$JSON_FILE"
  echo "    \"accessSecret\": \"$ACCESS_SECRET\"" >> "$JSON_FILE"

  if [ $i -lt 3 ]; then
    echo "  }," >> "$JSON_FILE"
  else
    echo "  }" >> "$JSON_FILE"
  fi
done

echo "}" >> "$JSON_FILE"

# JSON形式を1行に変換
X_CREDENTIALS_JSON=$(cat "$JSON_FILE" | jq -c .)
rm "$JSON_FILE"

gh secret set X_CREDENTIALS_JSON --body "$X_CREDENTIALS_JSON"
echo "✅ X_CREDENTIALS_JSON 設定完了"
echo ""

# ============================================
# 4. Netlify Build Hooks
# ============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Netlify Build Hooks（サイトごと）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "取得方法: Netlify Site Settings → Build & deploy → Build hooks"
echo ""

for SITE in "KEIBA_MATOME" "CHIHOU_KEIBA" "YOSOU_KEIBA"; do
  case $SITE in
    KEIBA_MATOME) DISPLAY="keiba-matome.jp（中央競馬）" ;;
    CHIHOU_KEIBA) DISPLAY="chihou.keiba-matome.jp（地方競馬）" ;;
    YOSOU_KEIBA) DISPLAY="yosou.keiba-matome.jp（競馬予想）" ;;
  esac

  echo ""
  echo "【$DISPLAY】"
  read -p "${SITE}_NETLIFY_BUILD_HOOK: " NETLIFY_HOOK

  if [ -z "$NETLIFY_HOOK" ]; then
    echo "⚠️  スキップ（後で設定してください）"
  else
    gh secret set "${SITE}_NETLIFY_BUILD_HOOK" --body "$NETLIFY_HOOK"
    echo "✅ ${SITE}_NETLIFY_BUILD_HOOK 設定完了"
  fi
done

echo ""

# ============================================
# 5. DISCORD_WEBHOOK_URL（オプション）
# ============================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. DISCORD_WEBHOOK_URL（オプション）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "取得方法: Discord サーバー設定 → 連携サービス → ウェブフック"
echo ""
read -p "DISCORD_WEBHOOK_URL（Enterでスキップ）: " DISCORD_WEBHOOK

if [ -n "$DISCORD_WEBHOOK" ]; then
  gh secret set DISCORD_WEBHOOK_URL --body "$DISCORD_WEBHOOK"
  echo "✅ DISCORD_WEBHOOK_URL 設定完了"
else
  echo "⚠️  スキップ（後で設定してください）"
fi

echo ""
echo "============================================"
echo "✅ GitHub Secrets設定完了"
echo "============================================"
echo ""

# 設定確認
echo "設定されたSecrets:"
gh secret list

echo ""
echo "次のステップ:"
echo "  1. GitHub Actionsを手動実行してテスト"
echo "  2. gh workflow run unified-daily.yml --field site=keiba-matome"
echo ""
