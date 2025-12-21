# keiba-matome-monorepo: 2ch風競馬ニュースまとめサイト群

## 🏗️ monorepo構成

このリポジトリは、2ch/5ch風の競馬ニュースまとめサイト2つを管理するmonorepoです。

```
keiba-matome-monorepo/
├── package.json                    ← npm workspaces設定
├── packages/
│   ├── shared/                     ← 共通ライブラリ
│   │   ├── package.json
│   │   └── scripts/
│   │       └── generate-2ch-comments.cjs  ← 2ch風コメント生成（地方競馬特化）
│   ├── keiba-matome/              ← 中央競馬ニュースまとめ
│   │   ├── package.json
│   │   ├── CLAUDE.md
│   │   └── ... (Astroプロジェクト)
│   └── chihou-keiba-matome/       ← 地方競馬ニュースまとめ
│       ├── package.json
│       ├── CLAUDE.md
│       └── ... (Astroプロジェクト)
└── CLAUDE.md                       ← このファイル
```

---

## プロジェクト概要

### packages/keiba-matome (中央競馬)

**ドメイン**: https://keiba-matome.jp
**ポート**: 4323
**Airtable Base**: appdHJSC4F9pTIoDj
**X (Twitter)**: @keiba_matome_jp

**ニュース元**:
- netkeiba (3件/回)
- Yahoo!ニュース (3件/回)

**特徴**:
- 中央競馬（JRA）特化
- 重賞レース・騎手・馬主ニュース
- X自動投稿機能あり
- 完全自動化（1日3回実行）

### packages/chihou-keiba-matome (地方競馬)

**ドメイン**: https://chihou.keiba-matome.jp
**ポート**: 4324
**Airtable Base**: appt25zmKxQDiSCwh

**ニュース元**:
- netkeiba地方競馬 (5件/回)
- スポーツ報知 (4件/回)
- スポニチ (4件/回)
- Yahoo!ニュース (4件/回)

**特徴**:
- 地方競馬（南関東4競馬＋全国）特化
- 大井・船橋・川崎・浦和のナイター競馬
- トゥインクルシリーズ・地方G1
- 完全自動化（1日3回実行）

### packages/shared (共通ライブラリ)

**内容**:
- `scripts/generate-2ch-comments.cjs`: 2ch風コメント自動生成スクリプト
  - Claude Sonnet 4.5使用
  - 地方競馬特化の用語・ネタ対応
  - 15-35件/記事のランダム生成

**依存関係**:
- @anthropic-ai/sdk: Claude API
- airtable: Airtable接続
- puppeteer: スクレイピング（各プロジェクト側で使用）

---

## 主要コマンド

### 開発サーバー起動

```bash
# 中央競馬サイト (localhost:4323)
npm run dev:keiba-matome

# 地方競馬サイト (localhost:4324)
npm run dev:chihou

# 両方同時起動
npm run dev:keiba-matome & npm run dev:chihou
```

### ビルド

```bash
# 全プロジェクトを一括ビルド
npm run build:all

# 個別ビルド
npm run build --workspace=packages/keiba-matome
npm run build --workspace=packages/chihou-keiba-matome
```

### その他のコマンド

```bash
# 依存関係のインストール（全ワークスペース）
npm install

# 特定ワークスペースで依存関係追加
npm install <package> --workspace=packages/keiba-matome
npm install <package> --workspace=packages/chihou-keiba-matome
npm install <package> --workspace=packages/shared
```

---

## 共有コードの使い方

### 現在の共有コード

`packages/shared/scripts/generate-2ch-comments.cjs` が唯一の共有コードです。

**使用例**:
```bash
# keiba-matomeから使用
cd packages/keiba-matome
ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node ../shared/scripts/generate-2ch-comments.cjs

# chihou-keiba-matomeから使用
cd packages/chihou-keiba-matome
ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node ../shared/scripts/generate-2ch-comments.cjs
```

### 共有コードの追加方法

1. `packages/shared/scripts/` にスクリプトを追加
2. 各プロジェクトの `package.json` でスクリプトとして参照

---

## 技術スタック

### 共通
- **フロントエンド**: Astro 5.x
- **デザイン**: インラインCSS（2ch風デザイン）
- **スクレイピング**: Puppeteer
- **コメント生成**: Anthropic Claude Sonnet 4.5
- **ホスティング**: Netlify
- **データベース**: Airtable（プロジェクトごとに独立したBase）

### 開発環境
- **monorepo管理**: npm workspaces
- **ポート**: 4323（keiba-matome）、4324（chihou-keiba-matome）

---

## GitHub Actionsによる自動化

### keiba-matome (中央競馬)

`.github/workflows/daily-news.yml`
- **頻度**: 1日3回（6AM, 12PM, 6PM JST）
- **処理内容**:
  1. netkeibaから記事スクレイピング（3件）
  2. 各記事に2ch風コメント生成（15-35件/記事）
  3. **X (Twitter)に自動投稿**（最大3件/回）
  4. Netlify自動デプロイ

### chihou-keiba-matome (地方競馬)

`.github/workflows/daily-news.yml`
- **頻度**: 1日3回（6AM, 12PM, 6PM JST）
- **処理内容**:
  1. netkeiba地方競馬から記事スクレイピング（5件）
  2. スポーツ報知、スポニチ、Yahoo!ニュースから記事取得（各4件）
  3. 各記事に2ch風コメント生成（15-35件/記事）
  4. Netlify自動デプロイ

---

## 環境変数

### keiba-matome (中央競馬)

```bash
# Airtable
AIRTABLE_API_KEY=pat***
AIRTABLE_BASE_ID=appdHJSC4F9pTIoDj

# Claude API
ANTHROPIC_API_KEY=sk-ant-api03-***

# X (Twitter) API
X_API_KEY=***
X_API_SECRET=***
X_ACCESS_TOKEN=***
X_ACCESS_SECRET=***

# サイト情報
SITE_URL=https://keiba-matome.jp
```

### chihou-keiba-matome (地方競馬)

```bash
# Airtable
AIRTABLE_API_KEY=patCIn4iIx274YQZB***
AIRTABLE_BASE_ID=appt25zmKxQDiSCwh

# Claude API
ANTHROPIC_API_KEY=sk-ant-api03-***

# サイト情報
SITE_URL=https://chihou.keiba-matome.jp
```

---

## データ分離ポリシー

**重要**: 2つのプロジェクトは完全に独立しています。

| 項目 | keiba-matome | chihou-keiba-matome |
|------|--------------|---------------------|
| Airtable Base | appdHJSC4F9pTIoDj | appt25zmKxQDiSCwh |
| データ共有 | **なし** | **なし** |
| デプロイ | 独立 | 独立 |
| GitHub Actions | 独立 | 独立 |
| X投稿 | あり (@keiba_matome_jp) | なし |

**共有するもの**:
- コメント生成ロジック (`packages/shared/scripts/generate-2ch-comments.cjs`)
- 2ch風デザイン（各プロジェクトで独立実装）

---

## review-platform-monorepoとの関係

**❌ 完全に独立**
- review-platform-monorepoは口コミサイト群
- keiba-matome-monorepoは2ch風まとめサイト群
- 目的が全く異なるため、統合しない

---

## Claudeへの指示（必読）

### 基本方針
- [ ] このmonorepoは2ch風まとめサイト専用
- [ ] review-platform-monorepoとは完全に独立
- [ ] コメント生成の改善は `packages/shared` で行い、両プロジェクトに適用

### 作業時の注意
- [ ] 各プロジェクトの `CLAUDE.md` を必ず読むこと
- [ ] 中央競馬と地方競馬で用語・ニュース元が異なることを理解すること
- [ ] データベース（Airtable Base）は完全に独立していること

### コメント生成改善時
- [ ] `packages/shared/scripts/generate-2ch-comments.cjs` を修正
- [ ] 地方競馬特化の用語（南関東4競馬、トゥインクル、TCKなど）に対応済み
- [ ] 両プロジェクトで動作確認すること

---

## 作業履歴

### 2025-12-21

1. ✅ **monorepo初期セットアップ完了**
   - keiba-matome-monorepoディレクトリ作成
   - npm workspaces設定
   - packages/shared作成（generate-2ch-comments.cjs移動）
   - 既存プロジェクト2つを packages/ に移動
   - Git初期化＆リモートリポジトリ作成
   - GitHub: https://github.com/apol0510/keiba-matome-monorepo

2. ✅ **動作確認完了**
   - keiba-matomeの開発サーバー起動成功（localhost:4324）
   - npm workspaces正常動作
   - CLAUDE.md作成

---

## 次のステップ

1. **各プロジェクトのCLAUDE.md更新**
   - monorepo化完了を反映
   - 作業ディレクトリパスを更新
   - 共有コードの参照方法を記載

2. **共有コードの拡充検討**
   - スクレイピングロジックの共通化（検討中）
   - ユーティリティ関数の共有（検討中）

3. **CI/CD最適化**
   - GitHub Actionsでmonorepo対応
   - 変更されたプロジェクトのみビルド（検討中）

---

## リポジトリ情報

- **GitHub**: https://github.com/apol0510/keiba-matome-monorepo
- **作成日**: 2025-12-21
- **ライセンス**: Private
- **メンテナー**: @apol0510

---

## 参照ドキュメント

- packages/keiba-matome/CLAUDE.md: 中央競馬サイトの詳細
- packages/chihou-keiba-matome/CLAUDE.md: 地方競馬サイトの詳細
