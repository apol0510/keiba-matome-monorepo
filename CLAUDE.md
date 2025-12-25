# keiba-matome-monorepo: 2ch風競馬ニュースまとめサイト群

## 🏗️ monorepo構成

このリポジトリは、2ch/5ch風の競馬ニュース・予想まとめサイト3つを管理するmonorepoです。

```
keiba-matome-monorepo/
├── package.json                    ← npm workspaces設定
├── packages/
│   ├── shared/                     ← 共通ライブラリ
│   │   ├── package.json
│   │   └── scripts/
│   │       └── generate-2ch-comments.cjs  ← 2ch風コメント生成（全サイト共通）
│   ├── keiba-matome/              ← 中央競馬ニュースまとめ
│   │   ├── package.json
│   │   ├── CLAUDE.md
│   │   └── ... (Astroプロジェクト)
│   ├── chihou-keiba-matome/       ← 地方競馬ニュースまとめ
│   │   ├── package.json
│   │   ├── CLAUDE.md
│   │   └── ... (Astroプロジェクト)
│   └── yosou-keiba-matome/        ← 競馬予想まとめ
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

### packages/yosou-keiba-matome (競馬予想)

**ドメイン**: https://yosou.keiba-matome.jp
**ポート**: 4325
**Airtable Base**: appKPasSpjpTtabnv

**予想元**:
- nankan-analytics (南関メインレース予想)
- netkeiba予想コラム (中央重賞予想)

**特徴**:
- 中央重賞＋南関重賞の予想まとめ
- 南関重賞自動判定機能（GI/JpnI/SI/SII/SIII等）
- 2ch風予想コメント自動生成
- Zapier連携によるX自動投稿（実装予定）
- 完全自動化（1日2回実行）

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

# 競馬予想サイト (localhost:4325)
npm run dev:yosou

# 全サイト同時起動
npm run dev:keiba-matome & npm run dev:chihou & npm run dev:yosou
```

### ビルド

```bash
# 全プロジェクトを一括ビルド
npm run build:all

# 個別ビルド
npm run build --workspace=packages/keiba-matome
npm run build --workspace=packages/chihou-keiba-matome
npm run build --workspace=packages/yosou-keiba-matome

# または短縮形
npm run build:yosou
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

### yosou-keiba-matome (競馬予想)

`.github/workflows/yosou-nankan-daily.yml` / `.github/workflows/yosou-chuou-weekly.yml`
- **頻度**:
  - 南関: 1日2回（6AM, 6PM JST）
  - 中央: 週1回（木曜18時）
- **処理内容**:
  1. nankan-analyticsから南関予想スクレイピング
  2. netkeibaから中央重賞予想スクレイピング
  3. 各記事に2ch風予想コメント生成（15-35件/記事）
  4. Zapier連携でX自動投稿（実装予定）
  5. Netlify自動デプロイ

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

### yosou-keiba-matome (競馬予想)

```bash
# Airtable
AIRTABLE_API_KEY=patkpjNBAn2is12XO***
AIRTABLE_BASE_ID=appKPasSpjpTtabnv

# Claude API
ANTHROPIC_API_KEY=sk-ant-api03-***

# Zapier Webhook (X自動投稿用)
YOSOU_KEIBA_ZAPIER_WEBHOOK=https://hooks.zapier.com/hooks/catch/XXXXXXX/YYYYYYY/

# Netlify Build Hook
YOSOU_KEIBA_NETLIFY_BUILD_HOOK=https://api.netlify.com/build_hooks/***

# サイト情報
SITE_URL=https://yosou.keiba-matome.jp
```

---

## データ分離ポリシー

**重要**: 3つのプロジェクトは完全に独立しています。

| 項目 | keiba-matome | chihou-keiba-matome | yosou-keiba-matome |
|------|--------------|---------------------|--------------------|
| Airtable Base | appdHJSC4F9pTIoDj | appt25zmKxQDiSCwh | appKPasSpjpTtabnv |
| データ共有 | **なし** | **なし** | **なし** |
| デプロイ | 独立 | 独立 | 独立 |
| GitHub Actions | 独立 | 独立 | 独立 |
| X投稿 | あり (X Dev API) | なし | Zapier連携（実装予定） |

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
- [ ] このmonorepoは2ch風まとめサイト専用（3サイト統合）
- [ ] review-platform-monorepoとは完全に独立
- [ ] コメント生成の改善は `packages/shared` で行い、全プロジェクトに適用

### 作業時の注意
- [ ] 各プロジェクトの `CLAUDE.md` を必ず読むこと
- [ ] 中央競馬・地方競馬・競馬予想で用語・ニュース元が異なることを理解すること
- [ ] データベース（Airtable Base）は3つとも完全に独立していること

### コメント生成改善時
- [ ] `packages/shared/scripts/generate-2ch-comments.cjs` を修正
- [ ] 競馬用語対応済み（南関東4競馬、トゥインクル、TCK、重賞予想など）
- [ ] 全プロジェクトで動作確認すること

### ⚠️ Netlifyデプロイ時の鉄則（2025-12-22 - yosou-keiba-matomeで4回失敗した教訓）

**【重要】Netlifyにpushする前に必ず以下を実行すること:**

#### 1. ローカルビルドテスト（必須）
```bash
cd packages/[project-name]
npm run build
ls -la dist/  # 出力ディレクトリが生成されているか確認
```

#### 2. netlify.toml検証チェックリスト
- [ ] `publish` はリポジトリルートからの相対パス（例: `packages/project-name/dist`）
- [ ] `command` はワークスペース指定（例: `npm run build --workspace=packages/project-name`）
- [ ] プラグインを追加する場合、**必ず `npm info [plugin-name]` で存在確認**
- [ ] 設定変更後、必ずローカルで `npm run build` が通ることを確認

#### 3. クロスプラットフォーム対応（Astro/Viteの場合）
```json
// package.jsonに追加
"optionalDependencies": {
  "@rollup/rollup-linux-x64-gnu": "^4.30.1",
  "@rollup/rollup-darwin-x64": "^4.30.1"
}
```

#### ❌ 絶対にやってはいけないこと

1. **Netlifyで試行錯誤デバッグ（1回10分 × 失敗回数 = 大量の時間浪費）**
   - ローカルで検証してからpush

2. **存在しないプラグインをnetlify.tomlに追加**
   ```bash
   # プラグイン追加前に必ず実行:
   npm info @netlify/plugin-name
   # → 404エラーが出たら存在しない
   ```

3. **ドキュメント未確認での最適化**
   - Netlifyは自動的にnode_modulesをキャッシュする
   - 不要なプラグインは追加しない

#### 今回の失敗例（yosou-keiba-matome）

| 回数 | エラー内容 | 原因 | 無駄時間 |
|-----|----------|------|---------|
| 1回目 | `Cannot find module @rollup/rollup-linux-x64-gnu` | クロスプラットフォームバイナリ不足 | 10分 |
| 2回目 | `Deploy directory 'dist' does not exist` | publishパスが相対パスだった | 10分 |
| 3回目 | `@netlify/plugin-cache not found` | 存在しないプラグインを追加 | 18秒 |
| 4回目 | 同上 | 同上（ドキュメント更新コミットで再トリガー） | 17秒 |
| **合計** | | | **約20分 + 精神的ダメージ** |

**すべてローカルテストで防げた失敗でした。**

---

### 🔴 Claudeへの厳格な指示（必ず遵守）

**Netlify関連の設定変更時は、以下を厳守すること:**

1. **変更前**:
   ```bash
   # プラグイン追加時は必ず存在確認
   npm info [plugin-name]
   ```

2. **変更後**:
   ```bash
   # 必ずローカルビルドテスト
   cd packages/[project-name]
   npm run build
   ls -la dist/
   ```

3. **pushは最後**:
   - ローカルテスト完了後のみpush許可
   - 不確実な変更は絶対にpushしない

**違反した場合**: このような大失態を繰り返すことになる

---

## 作業履歴

### 2025-12-21

1. ✅ **monorepo初期セットアップ完了**
   - keiba-matome-monorepoディレクトリ作成
   - npm workspaces設定
   - packages/shared作成（generate-2ch-comments.cjs移動）
   - 既存プロジェクト2つを packages/ に移動
   - yosou-keiba-matome作成（第3プロジェクト）
   - Git初期化＆リモートリポジトリ作成
   - GitHub: https://github.com/apol0510/keiba-matome-monorepo

2. ✅ **動作確認完了**
   - keiba-matomeの開発サーバー起動成功（localhost:4323）
   - chihou-keiba-matomeの開発サーバー起動成功（localhost:4324）
   - yosou-keiba-matomeの開発サーバー起動成功（localhost:4325）
   - npm workspaces正常動作
   - CLAUDE.md作成

### 2025-12-25

1. ✅ **yosou-keiba-matome 本格実装**
   - IsApprovedフィールド問題の修正（自動コメントが表示されない問題）
   - 記事タイトルの改善（SEO最適化、馬名・日付追加）
   - 南関重賞の自動判定機能実装（71レース対応）
   - Airtableに8つのGrade選択肢追加（GI/JpnI/SI/SII/SIII等）
   - Zapier + X自動投稿の計画策定（年間$2,040節約）

2. ✅ **リポジトリ整理・統合**
   - WorkSpace直下の古いディレクトリ削除（keiba-matome, chihou-keiba-matome）
   - GitHubリポジトリの削除（apol0510/keiba-matome, apol0510/chihou-keiba-matome）
   - monorepo完全統一（3サイトすべてkeiba-matome-monorepoで管理）
   - CLAUDE.md更新（3サイト対応、環境変数、作業履歴追加）

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
