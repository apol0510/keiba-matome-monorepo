#!/bin/bash
#
# URL検証スクリプト
#
# 用途: 間違ったURLが残っていないか定期的にチェック
# 実行方法: bash scripts/check-urls.sh
#

set -e

echo "🔍 間違ったURLをチェック中..."
echo ""

# 間違ったURLのリスト
DEPRECATED_URLS=(
  "nankan-analytics\.com"
  "keiba-matome\.netlify\.app"
  "chihou-keiba-matome\.netlify\.app"
  "yosou-keiba-matome\.netlify\.app"
  "nankan-keiba-review\.netlify\.app"
)

# エラーフラグ
has_error=0

# 各URLをチェック
for url in "${DEPRECATED_URLS[@]}"; do
  echo "チェック中: $url"

  # ファイル内を検索（constants.ts, CLAUDE.md, NETLIFY_DEPLOY.mdを除外）
  matches=$(grep -r "$url" \
    --include="*.astro" \
    --include="*.js" \
    --include="*.mjs" \
    --include="*.cjs" \
    --include="*.tsx" \
    --exclude="constants.ts" \
    --exclude="CLAUDE.md" \
    --exclude="NETLIFY_DEPLOY.md" \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=dist \
    --exclude-dir=.netlify \
    packages/ 2>/dev/null || true)

  if [ -n "$matches" ]; then
    echo "❌ $url が見つかりました:"
    echo "$matches"
    echo ""
    has_error=1
  else
    echo "✅ 問題なし"
  fi
  echo ""
done

# 結果サマリー
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $has_error -eq 0 ]; then
  echo "✅ すべてのURLチェックに合格しました"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo "❌ 間違ったURLが見つかりました"
  echo ""
  echo "修正方法:"
  echo "  1. packages/shared/lib/constants.ts の定数を使用"
  echo "  2. 直接修正する場合は正しいドメインに変更"
  echo ""
  echo "正しいドメイン:"
  echo "  nankan-analytics.com → nankan-analytics.keiba.link"
  echo "  *.netlify.app → 本番ドメイン"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
