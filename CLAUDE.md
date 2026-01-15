# keiba-matome-monorepo: 2ch風競馬ニュースまとめサイト群

## 📊 プロジェクト概要（現状）

3つの2ch/5ch風競馬ニュースまとめサイトを運営するmonorepoです。

**運用状況**:
- ✅ 完全自動化済み（1日3回スクレイピング + コメント生成 + デプロイ）
- ✅ GitHub Actions安定稼働中（成功率100%）
- ✅ 3サイト合計: 447記事、17,351コメント（2026-01-13時点）

**運用コスト**:
- 約¥700/日（¥20,000/月） - Claude APIのみ
- GitHub Actions、Netlify: 無料枠内

---

## 🏗️ monorepo構成

```
keiba-matome-monorepo/
├── packages/
│   ├── shared/                     ← 共通ライブラリ
│   │   └── scripts/
│   │       └── generate-2ch-comments.cjs  ← 2ch風コメント生成
│   ├── keiba-matome/              ← 中央競馬（https://keiba-matome.jp）
│   ├── chihou-keiba-matome/       ← 地方競馬（https://chihou.keiba-matome.jp）
│   └── yosou-keiba-matome/        ← 競馬予想（https://yosou.keiba-matome.jp）
├── CLAUDE.md                       ← このファイル（簡潔版）
├── HISTORY.md                      ← 作業履歴
├── NIGHTRUN-GUIDE.md               ← 夜間タスクガイド（長時間実行用）
└── setup-env.sh, NIGHTRUN-FULL.sh  ← 自動化スクリプト
```

---

## 🚀 クイックスタート

### 開発サーバー起動

```bash
# 全サイト起動
npm run dev

# 特定のサイトのみ
cd packages/keiba-matome && npm run dev       # ポート4323
cd packages/chihou-keiba-matome && npm run dev # ポート4324
cd packages/yosou-keiba-matome && npm run dev  # ポート4325
```

### ビルド

```bash
# 全サイトビルド
npm run build

# 特定のサイトのみ
cd packages/keiba-matome && npm run build
```

### 環境変数設定

各サイトに `.env` ファイルが必要：

```bash
# packages/keiba-matome/.env
AIRTABLE_API_KEY=patXXX...
AIRTABLE_BASE_ID=appdHJSC4F9pTIoDj
PUBLIC_SITE_URL=https://keiba-matome.jp
PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## 📦 3サイトの詳細

### 1. keiba-matome（中央競馬）

- **ドメイン**: https://keiba-matome.jp
- **ポート**: 4323
- **Airtable Base**: appdHJSC4F9pTIoDj
- **ニュース元**: netkeiba（3件）、Yahoo（3件）
- **自動化**: 1日3回実行（6:00/12:00/18:00 JST）

### 2. chihou-keiba-matome（地方競馬）

- **ドメイン**: https://chihou.keiba-matome.jp
- **ポート**: 4324
- **Airtable Base**: appt25zmKxQDiSCwh
- **ニュース元**: netkeiba地方（5件）、Yahoo（4件）
- **自動化**: 1日3回実行

### 3. yosou-keiba-matome（競馬予想）

- **ドメイン**: https://yosou.keiba-matome.jp
- **ポート**: 4325
- **Airtable Base**: appKPasSpjpTtabnv
- **予想元**: nankan-analytics、netkeiba予想コラム
- **自動化**: 1日2回実行（10:00/16:00 JST）

詳細は各サイトの `packages/*/CLAUDE.md` を参照。

---

## 🤖 GitHub Actions自動化

### 統合ワークフロー

| ワークフロー | 実行頻度 | 機能 |
|------------|---------|------|
| **Unified Daily Workflow** | 1日3回 | keiba-matome、chihou-keiba-matomeのスクレイピング + コメント生成 + デプロイ |
| **Unified Yosou Workflow** | 1日2回 | yosou-keiba-matomeのスクレイピング + コメント生成 + デプロイ |
| **Health Check** | 1日1回 | サイト監視、エラー検知 |

### 手動実行

```bash
# 特定のサイトのみ実行
gh workflow run "Unified Daily Workflow" -f site=keiba-matome
gh workflow run "Unified Daily Workflow" -f site=chihou-keiba-matome
```

---

## 🔧 共有コードの使い方

### 2ch風コメント生成

```javascript
// packages/shared/scripts/generate-2ch-comments.cjs
const { generateComments } = require('../../shared/scripts/generate-2ch-comments.cjs');

const comments = await generateComments({
  title: '記事タイトル',
  content: '記事本文',
  commentCount: 30
});
```

### 共通ユーティリティ

```javascript
// packages/shared/lib/scraping-utils.cjs
const { generateSlug, sanitizeTitle } = require('../../shared/lib/scraping-utils.cjs');
```

---

## 📋 定期タスク（簡潔版）

### 週次（毎週月曜、5分）

```bash
# GitHub Actions実行履歴を確認
gh run list --limit 20

# 失敗がないか確認、あればログをチェック
gh run view <run_id> --log
```

### 月次（毎月1日、10分）

```bash
# GA4でトラフィックを確認
# https://analytics.google.com/

# Google Search Consoleで検索パフォーマンスを確認
# https://search.google.com/search-console

# 記事数とコメント数を確認（3サイト合計）
```

### 四半期（3ヶ月に1回、30分）

```bash
# SEO最適化実行（必要に応じて）
bash setup-env.sh
bash NIGHTRUN-FULL.sh --phase2

# コメント品質分析（必要に応じて）
bash NIGHTRUN-FULL.sh --phase3
```

詳細は `NIGHTRUN-GUIDE.md` を参照。

---

## 🔗 重要なリンク

### ドキュメント

- **HISTORY.md**: 作業履歴（2025-12-21〜現在）
- **NIGHTRUN-GUIDE.md**: 夜間タスクガイド（長時間実行用）
- **packages/keiba-matome/CLAUDE.md**: 中央競馬サイトの詳細
- **packages/chihou-keiba-matome/CLAUDE.md**: 地方競馬サイトの詳細
- **packages/yosou-keiba-matome/CLAUDE.md**: 競馬予想サイトの詳細

### 本番サイト

- 中央: https://keiba-matome.jp
- 地方: https://chihou.keiba-matome.jp
- 予想: https://yosou.keiba-matome.jp

### 管理画面

- GitHub: https://github.com/apol0510/keiba-matome-monorepo
- Netlify: https://app.netlify.com/
- Airtable: https://airtable.com/

---

## 🎯 今後の重要タスク

### 優先度S: 効果測定基盤の構築

現在、自動化は完璧だが**効果測定ができていない**。

**実施すべきこと**:
1. GA4でファネル設定（3サイト → nankan-analytics）
2. イベントトラッキング設定（サイト間リンククリック）
3. SEO効果のベースライン測定（現在の検索流入数）
4. 2週間分のデータ収集 → 改善サイクルを回す

### 優先度A: SEO最適化の実装

生成済みのメタデータ（28記事分）を実装していない。

**実施すべきこと**:
1. メタデータをAstroテンプレートに適用
2. sitemap.xmlをpublic/に配置
3. Google Search Consoleにサイトマップ送信
4. 構造化データ（JSON-LD）をHTMLに埋め込み

---

## 🛠️ トラブルシューティング

### GitHub Actions失敗時

```bash
# 最新の実行ログを確認
gh run list --limit 5
gh run view <run_id> --log

# エラーが「AIRTABLE_API_KEY」関連の場合
# → GitHub Secretsを確認・更新

# エラーが「スクレイピング失敗」の場合
# → ニュース元のHTML構造変更を確認
```

### ローカル開発でエラーが出る場合

```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install

# .envファイルを確認
cat packages/keiba-matome/.env
```

---

## 📞 サポート

- **メンテナー**: @apol0510
- **リポジトリ**: https://github.com/apol0510/keiba-matome-monorepo
- **作成日**: 2025-12-21
- **最終更新**: 2026-01-15（簡潔版にリファクタリング）

---

## 📚 技術スタック

- **Framework**: Astro 4.x + React 18.x
- **Styling**: Tailwind CSS 3.x
- **Database**: Airtable（3つのBase）
- **AI**: Claude Sonnet 4.5（コメント生成）
- **CI/CD**: GitHub Actions + Netlify
- **Analytics**: Google Analytics 4

---

## ⚠️ 重要な注意事項

1. **Airtable APIキーは絶対に公開しない**
   - GitHub Secretsで管理
   - .envファイルは.gitignoreに含める

2. **Claude APIコストに注意**
   - 1記事あたり約¥20-30のコスト
   - 月間コスト: 約¥20,000（66記事/日 × 30日）

3. **スクレイピング元のHTML構造変更に注意**
   - netkeiba、Yahooのサイト更新でスクリプトが壊れる可能性
   - 定期的にGitHub Actionsログを確認

4. **作業履歴はHISTORY.mdに記録**
   - このファイルは簡潔に保つ
   - 詳細な履歴は別ファイルに
