#!/bin/bash
# Netlify監視用のGitHub Secretsを設定するスクリプト
#
# 使い方:
# 1. Netlify管理画面から必要な値を取得
# 2. このスクリプトを実行してSecretを設定
#
# 必要な値:
# - NETLIFY_AUTH_TOKEN: Netlify Personal Access Token
# - KEIBA_MATOME_SITE_ID: keiba-matome サイトのSite ID
# - CHIHOU_KEIBA_SITE_ID: chihou-keiba-matome サイトのSite ID
# - YOSOU_KEIBA_SITE_ID: yosou-keiba-matome サイトのSite ID

echo "🔧 Netlify監視設定スクリプト"
echo ""

# Netlify Personal Access Token
read -p "Netlify Personal Access Token: " NETLIFY_AUTH_TOKEN
gh secret set NETLIFY_AUTH_TOKEN --body "$NETLIFY_AUTH_TOKEN" --repo apol0510/keiba-matome-monorepo

# keiba-matome Site ID
read -p "keiba-matome Site ID: " KEIBA_MATOME_SITE_ID
gh secret set KEIBA_MATOME_SITE_ID --body "$KEIBA_MATOME_SITE_ID" --repo apol0510/keiba-matome-monorepo

# chihou-keiba-matome Site ID
read -p "chihou-keiba-matome Site ID: " CHIHOU_KEIBA_SITE_ID
gh secret set CHIHOU_KEIBA_SITE_ID --body "$CHIHOU_KEIBA_SITE_ID" --repo apol0510/keiba-matome-monorepo

# yosou-keiba-matome Site ID
read -p "yosou-keiba-matome Site ID: " YOSOU_KEIBA_SITE_ID
gh secret set YOSOU_KEIBA_SITE_ID --body "$YOSOU_KEIBA_SITE_ID" --repo apol0510/keiba-matome-monorepo

echo ""
echo "✅ GitHub Secrets設定完了"
echo ""
echo "次のステップ:"
echo "1. GitHub Actionsワークフローに監視ステップを追加"
echo "2. 手動実行でテスト"
