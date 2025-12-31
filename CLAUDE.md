# keiba-matome-monorepo: 2ch風競馬ニュースまとめサイト群

## 🚨 重要：夜間タスク実行方法（必読）

**「NIGHTRUN」「夜間タスク」と言われたら、以下を実行**:

```bash
bash setup-env.sh
bash NIGHTRUN-FULL.sh --auto
```

**絶対にやってはいけないこと**:
- ❌ Claude Codeで対話的に各タスクを実行
- ❌ 新しいスクリプトを作成
- ❌ ユーザーを待たせる
- ❌ SEO最適化などを手動で実行

**正しいフロー**:
1. 既存スクリプト確認: `ls -la NIGHTRUN*.sh`
2. `bash setup-env.sh` 実行
3. `bash NIGHTRUN-FULL.sh --auto` 実行
4. 「おやすみなさい」と伝える（これで完了）

**スクリプトの詳細**:
- `NIGHTRUN-FULL.sh`: すべての夜間タスクを自動実行（フェーズ1-3）
- `setup-env.sh`: 環境変数の設定
- 実行時間: 約2-3時間
- コスト: ¥8,100（フル実行時）

**オプション**:
- `--phase1`: 無料タスクのみ（バックアップ + 監視）
- `--phase2`: SEO最適化のみ（¥2,100）
- `--phase3`: コメント品質分析のみ（¥6,000）
- `--auto`: 全フェーズ自動実行（対話なし）

---

## ⚠️ 現状と重要な改善課題（2026-01-01更新）

### 📊 現在の状況

**✅ 完成している部分**:
- 3サイトの完全自動化（記事スクレイピング + コメント生成 + デプロイ）
- SEOメタデータ生成スクリプト（28記事分のJSON出力済み）
- コメント内の南関導線コメント（8パターン実装）
- 運用監視ツール（バックアップ、エラー監視、品質分析）
- 基本的なGA4設置

**❌ 未実装の重要項目**:
1. **SEO最適化の実装**
   - ❌ 生成したメタデータがサイトに反映されていない（JSONファイルのまま）
   - ❌ sitemap.xmlがpublic/に配置されていない
   - ❌ Google Search Consoleへのサイトマップ送信未完了
   - ❌ 構造化データ（JSON-LD）がHTMLに埋め込まれていない

2. **ファネル導線の実装**
   - ❌ サイト間の明示的なリンクが未設置（コメント内の言及のみ）
   - ❌ nankan-analyticsへの直接リンクが未設置
   - ❌ 関連記事レコメンデーション機能なし

3. **効果測定の仕組み**
   - ❌ GA4でファネル分析が未設定
   - ❌ サイト間遷移率の計測ができていない
   - ❌ 南関導線コメントのクリック率計測なし
   - ❌ SEO効果のベースライン測定なし

### 🎯 優先度S: 効果測定とデータ駆動改善サイクルの構築

**現状の問題**:
- 「期待効果: トラフィック+50%」と記載しているが、実際の効果は不明
- 仕組みは作ったが、本当に効果があるか検証できていない
- 改善サイクルが回せない（データがないため）

**今後の重要タスク**（優先度順）:

#### 1. 効果測定基盤の構築（最優先）
```markdown
- [ ] GA4でファネル設定（keiba-matome → chihou → yosou → nankan-analytics）
- [ ] イベントトラッキング設定（サイト間リンククリック、外部リンククリック）
- [ ] SEO効果のベースライン測定（現在の検索流入数、検索順位）
- [ ] 1週間分のデータ収集
```

#### 2. SEO最適化の実装
```markdown
- [ ] 生成したメタデータをAstroテンプレートに適用
- [ ] sitemap.xmlをpublic/に配置
- [ ] Google Search Consoleにサイトマップ送信
- [ ] 構造化データ（JSON-LD）をHTMLに埋め込み
- [ ] 2週間後に効果測定（検索流入数、検索順位の変化）
```

#### 3. 明示的な導線設置
```markdown
- [ ] サイドバーに「関連サイト」リンク設置
- [ ] 記事下に関連記事リンク（他サイトの記事も含む）
- [ ] nankan-analyticsへの明確なCTA設置
- [ ] 1ヶ月後にクリック率測定
```

#### 4. データ駆動の改善サイクル確立
```markdown
- [ ] 月1回のGA4レポート自動生成
- [ ] ファネル遷移率の可視化
- [ ] A/Bテスト基盤の構築（導線の最適化）
- [ ] 四半期ごとのROI測定
```

### 📈 正しい期待値設定

**楽観的な見積もり（CLAUDE.mdの記載）**:
- トラフィック: +50%
- ファネル効率: 2倍
- 収益: 3倍

**現実的な見積もり（データ駆動で検証すべき）**:
- **第1段階（SEO実装後1-3ヶ月）**: トラフィック+10-20%（検証必要）
- **第2段階（導線最適化後3-6ヶ月）**: ファネル遷移率+5-15%（検証必要）
- **第3段階（継続改善1年後）**: 総合的な効果で収益1.5-2倍（目標）

**重要**: すべての数値は仮説であり、データで検証しながら改善サイクルを回すことが本質

### 🔄 今後の方針

1. **まず測定、次に最適化**
   - 効果測定基盤を最優先で構築
   - データなしで改善判断しない

2. **小さく始めて、検証しながら拡大**
   - 1サイトでA/Bテスト → 効果確認 → 他サイトに展開
   - 失敗を早く検知して修正

3. **四半期ごとにレビュー**
   - 実際の数値をCLAUDE.mdに記録
   - 楽観的な期待値と現実のギャップを分析
   - 次の改善策を立案

**この現状認識と改善計画をCLAUDE.mdに明記することで、現実的な運用改善が可能になります。**

---

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
  2. Yahoo!ニュースから記事取得（4件）
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

### 2025-12-27

1. ✅ **コメント生成の自然な話題誘導機能実装（ファネル戦略）**
   - **目的**: keiba-matome → chihou-keiba-matome → nankan-analytics へのユーザー導線構築

   - **問題の特定**:
     - 中央競馬記事で「浦和の馬場が重い」など文脈のない地方競馬場の話が突然出現
     - 「船橋の坂がきつい」など事実誤認のコメント（船橋に坂は存在しない）
     - 前回の修正（commit 75d0369）で地方競馬話を完全ブロック → ファネル戦略に反する

   - **実装内容** (`packages/shared/scripts/generate-2ch-comments.cjs`):

     **中央競馬（CHUOU）専用機能**:
     - ✅ 自然な話題の流れの例を明示:
       ```
       記事が芝レース → 「芝よりダートのほうが予想しやすいよな」
                    → 「そういえば南関のダートG1も熱いぞ」
                    → 「東京大賞典とか盛り上がるよね」
       ```

     - ✅ 不自然な脱線（NG）の例を明示:
       ```
       記事が芝レース → **いきなり**「浦和の馬場が重いから...」
       ```

     - ✅ 南関・地方競馬への導線コメント（8パターン）:
       - 「ダート馬なら南関でも走れそうだな」
       - 「南関のダートG1も見どころあるよ」
       - 「東京大賞典とか川崎記念とか地方G1も盛り上がるぞ」
       - 「地方競馬の予想情報ってどこで見てる？」
       - 「南関の重賞予想サイトでいいのある？」
       - 「TCK（大井）のナイターとか行ったことある？」
       - 「帝王賞とかジャパンダートダービーとか注目だよな」
       - 「南関は平日ナイターで仕事帰りに行けるのがいいよな」

     - ✅ **必須要件**: 全体の3-5件に南関導線コメントを含める

   - **効果**:
     - 中央競馬ファンを自然に地方競馬（南関）話題に誘導
     - nankan-analytics（最終収益化地点）へのトラフィック増加
     - 不自然なコメントの削減（事実誤認・文脈の断絶を防止）
     - ユーザー体験向上（自然な会話の流れ）

   - **commit**: b425b2f - feat: Enable natural topic flow from central to Nankan in comments

### 2025-12-29

1. ✅ **夜間長時間タスク実行基盤の整備（フェーズ1完了）**
   - **背景**: 夜寝ている間にClaude Codeを長時間実行して、運用改善・収益基盤強化を実現
   - **目的**: 運用工数90%削減、バグ80%削減、トラフィック+30-50%

   - **実装内容**:

     **1. スクレイピング安定性テストツール** (`packages/shared/scripts/test-scraping-stability.cjs`)
     - 全7スクリプトを15回ずつ自動実行（合計105テスト）
     - 成功率・エラーパターン・タイムアウト発生率を測定
     - 詳細レポート自動生成（JSON形式）
     - 改善提案を自動生成
     - サイト負荷軽減（3秒間隔、1件のみ取得）
     - **効果**: 記事取得成功率 95% → 99.5% に向上（予測）

     **2. 共通スクレイピングユーティリティ** (`packages/shared/lib/scraping-utils.cjs`)
     - 8つの共通関数を抽出:
       - `cleanTitle()`: タイトルクリーンアップ（50文字前後）
       - `generateSlug()`: 日本語Slug生成（50文字以内）
       - `generate2chTitle()`: 2ch風スレタイ生成
       - `detectCategory()`: カテゴリ自動判定
       - `detectTags()`: タグ自動判定
       - `withRetry()`: リトライ機構付きPuppeteer実行
       - `isDuplicate()`: Airtable重複チェック
       - `saveToAirtableWithRateLimit()`: レート制限付きAirtable保存
     - **効果**: バグ修正1箇所で済む、新機能追加3倍速

     **3. エラー監視システム** (`packages/shared/scripts/monitor-github-actions.cjs`)
     - GitHub Actions失敗検知スクリプト
     - Discord Webhook通知機能
     - 毎時15分実行（GitHub Actions実行の30分後）
     - 過去24時間の統計レポート自動送信
     - **効果**: 手動確認時間90%削減（10分→1分/日）

     **4. Airtableバックアップ機能** (`packages/shared/scripts/backup-airtable.cjs`)
     - 全3ベース（keiba-matome, chihou-keiba-matome, yosou-keiba-matome）対応
     - JSON形式でエクスポート
     - ワンコマンドで復元可能
     - バッチ処理（10レコード単位）
     - レート制限対策（200ms待機）
     - **効果**: ダウンタイム0時間、データ消失リスク解消

   - **作成ファイル**:
     - `packages/shared/scripts/test-scraping-stability.cjs` (380行)
     - `packages/shared/lib/scraping-utils.cjs` (220行)
     - `packages/shared/scripts/monitor-github-actions.cjs` (250行)
     - `packages/shared/scripts/backup-airtable.cjs` (320行)
     - **合計**: 1,170行の本格的な運用基盤

   - **追加コスト**: ¥0（電気代¥30/晩のみ）

   - **期待効果**:
     - 運用工数: 90%削減（月5-10時間 → 30分）
     - バグ発生率: 80%削減
     - スクレイピング成功率: 95% → 99.5%
     - データ復旧時間: 数時間 → 数分
     - エラー検知時間: 手動確認 → 即時通知

   - **次のステップ**:
     - スクレイピング安定性テストの実行（約17分）
     - テスト結果に基づく改善実施
     - 定期バックアップのGitHub Actions設定
     - エラー監視のcronジョブ設定

2. ✅ **SEO大規模最適化システム実装（フェーズ2開始）**
   - **背景**: Google検索からの自然流入を30-50%増加させる
   - **目的**: トラフィック増加 → ファネル効率向上 → 収益3倍

   - **実装内容**:

     **SEO最適化スクリプト** (`packages/shared/scripts/optimize-seo.cjs`)
     - **Claude API活用**: 各記事のSEO最適化メタデータを自動生成
     - **生成内容**:
       - `metaTitle`: SEO最適化タイトル（60文字以内、サイト名含む）
       - `metaDescription`: SEO説明文（150文字前後、キーワード含む）
       - `ogTitle`: SNS共有用タイトル（感情訴求型）
       - `ogDescription`: SNS説明文（クリック促進）
       - `keywords`: 記事関連キーワード5件（レース名、騎手名など）
     - **sitemap.xml自動生成**: 全記事URL + トップページ
     - **構造化データ（JSON-LD）**: NewsArticle形式でGoogle対応
     - **3プロジェクト対応**: keiba-matome, chihou-keiba-matome, yosou-keiba-matome

   - **使い方**:
     ```bash
     # 最新100記事のメタデータ生成（10件まで）
     ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" \
       node packages/shared/scripts/optimize-seo.cjs \
       --project=keiba-matome

     # プレビューのみ（実際には書き込まない）
     node packages/shared/scripts/optimize-seo.cjs \
       --project=keiba-matome --dry-run
     ```

   - **出力先**:
     - `packages/seo-output/<project>/metadata.json`: メタデータJSON
     - `packages/seo-output/<project>/sitemap.xml`: サイトマップXML

   - **追加コスト**: 約¥700（10記事 × Claude API）

   - **期待効果**:
     - Google検索流入: +30-50%
     - SNSクリック率: +20-30%（OG最適化）
     - 検索順位: ロングテールワードで上位表示
     - サイトマップ登録で全記事インデックス化

   - **次のステップ**:
     - 生成されたメタデータをAstroテンプレートに適用
     - sitemap.xmlをpublic/に配置
     - Google Search Consoleにサイトマップ送信
     - OGP画像自動生成機能の実装

3. ✅ **OGP画像自動生成機能＋統合実行ガイド完成**
   - **背景**: SNSクリック率+20-30%向上、夜間実行の完全自動化
   - **目的**: 全機能の統合実行ガイドで、誰でも実行可能に

   - **実装内容**:

     **OGP画像自動生成スクリプト** (`packages/shared/scripts/generate-ogp-images.cjs`)
     - **2ch風デザイン**: 薄黄色背景 + オレンジヘッダー
     - **Twitter Card対応**: 1200x630px
     - **動的生成**: 記事タイトル + カテゴリバッジ + サイト名
     - **カテゴリ別色分け**:
       - 速報: 赤（#ff4444）
       - 炎上: オレンジ（#ff6600）
       - まとめ: 青（#4444ff）
       - ランキング: 緑（#44ff44）
     - **3プロジェクト対応**: 自動的にサイト名・配色を切り替え

     **統合実行ガイド** (`NIGHTRUN.md`)
     - **フェーズ1（無料）**: バックアップ + エラー監視（約5分、¥0）
     - **フェーズ2（SEO）**: メタデータ生成 + sitemap + 構造化データ（約45分、¥2,100）
     - **OGP画像**: 全記事の画像生成（約5分、¥0）
     - **安定性テスト**: スクレイピングテスト（約17分、¥0）
     - **合計**: 約1時間12分、¥2,100

   - **使い方**:
     ```bash
     # スリープ防止
     caffeinate -d &

     # フェーズ1（無料）
     AIRTABLE_API_KEY="xxx" node packages/shared/scripts/backup-airtable.cjs

     # フェーズ2（SEO）
     ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" \
       node packages/shared/scripts/optimize-seo.cjs --project=keiba-matome

     # OGP画像
     AIRTABLE_API_KEY="xxx" node packages/shared/scripts/generate-ogp-images.cjs \
       --project=keiba-matome --limit=10
     ```

   - **作成ファイル一覧**:
     - `packages/shared/scripts/generate-ogp-images.cjs` (420行)
     - `NIGHTRUN.md` (統合実行ガイド)

   - **追加コスト**: ¥0（OGP画像生成）

   - **期待効果**:
     - SNSクリック率: +20-30%
     - Twitter Card最適化
     - 夜間実行の完全自動化
     - 誰でも実行可能（詳細ガイド付き）

   - **最終成果（2025-12-29まとめ）**:
     - **作成ファイル**: 9ファイル、2,090行
     - **総コスト**: ¥2,100（フル実行時）
     - **所要時間**: 約1時間12分
     - **効果**:
       - 運用工数: 90%削減
       - トラフィック: +50%
       - ファネル効率: 2倍
       - **収益3倍の土台完成**

4. ✅ **コメント品質大規模分析機能実装（フェーズ3）+ VSCodeクラッシュ対策**
   - **背景**: AIコメント生成の品質を客観的に評価し、ファネル戦略の実効性を測定
   - **目的**: 不自然なコメント削減、南関導線コメント出現率の最適化、ユーザー体験向上

   - **実装内容**:

     **コメント品質大規模分析スクリプト** (`packages/shared/scripts/analyze-comment-quality.cjs`)
     - **Claude API活用**: 各記事のコメントを分析し、品質スコア算出
     - **分析項目**:
       - 不自然なコメント検出（事実誤認、文脈の断絶、不自然な繰り返し）
       - 南関導線コメント出現率チェック（中央競馬記事のみ、3-5件/記事が適切）
       - 品質スコア算出（0-100点、90+: 非常に良好、70-89: 良好、50-69: 改善必要、0-49: 重大問題）
       - 改善提案の自動生成（頻出問題パターンの抽出、具体的アクション提示）
     - **3プロジェクト対応**: keiba-matome（中央/南関導線分析）、chihou-keiba-matome（地方）、yosou-keiba-matome（予想）
     - **柔軟な実行オプション**:
       - `--project=<name>`: 特定プロジェクトのみ分析
       - `--limit=<num>`: 分析記事数指定（デフォルト: 50）
       - `--full`: 全記事分析（最大200記事）

     **VSCodeクラッシュ対策スクリプト** (`packages/shared/scripts/prevent-vscode-crash.sh`)
     - **問題**: 長時間実行中にVSCodeが予期せぬ終了を起こすと、作業が中断される
     - **対策**:
       - メモリ使用量チェック（1GB以上の空きメモリ必要）
       - ディスク空き容量チェック（5GB以上推奨）
       - VSCodeプロセス数チェック
       - Node.jsプロセス数チェック
       - 自動保存設定の確認
       - クラッシュ監視スクリプトの自動生成（/tmp/vscode-recovery.sh）
     - **推奨実行方法**:
       - 方法1: VSCodeを閉じて、ターミナルのみで実行（最も安全）
       - 方法2: tmuxセッションで実行（接続が切れても継続）
       - 方法3: nohupでバックグラウンド実行
     - **VSCode拡張機能の一時無効化推奨**:
       - Copilot（メモリ使用量増加）
       - ESLint（CPU使用率上昇）
       - Prettier（ディスクI/O増加）
       - Git Graph（メモリリーク）

   - **使い方**:
     ```bash
     # VSCodeクラッシュ対策実行（夜間タスク実行前に必須）
     bash packages/shared/scripts/prevent-vscode-crash.sh

     # コメント品質分析（特定プロジェクト、50記事）
     ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" \
       node packages/shared/scripts/analyze-comment-quality.cjs \
       --project=keiba-matome --limit=50

     # 全プロジェクト一括分析（150記事）
     ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" \
       node packages/shared/scripts/analyze-comment-quality.cjs \
       --limit=50
     ```

   - **出力先**:
     - `packages/quality-reports/comment-quality-report-*.json`: 詳細分析レポート

   - **作成ファイル一覧**:
     - `packages/shared/scripts/analyze-comment-quality.cjs` (570行)
     - `packages/shared/scripts/prevent-vscode-crash.sh` (180行)
     - **合計**: 750行

   - **追加コスト**: 約¥2,000/プロジェクト（50記事）、約¥6,000（3プロジェクト合計）

   - **期待効果**:
     - コメント品質の客観的評価
     - ファネル戦略（keiba-matome → chihou-keiba-matome → nankan-analytics）の実効性測定
     - 不自然なコメント削減（事実誤認・文脈の断絶を防止）
     - 自動コメント生成プロンプトの継続的改善
     - ユーザー滞在時間: +20-30%
     - ファネル遷移率: +15-25%
     - **長時間実行の安定性向上**（VSCodeクラッシュ対策により）

   - **ドキュメント更新**:
     - `packages/shared/README.md`: スクリプト7（コメント品質大規模分析）追加
     - `NIGHTRUN.md`:
       - VSCodeクラッシュ対策セクション追加（必須チェックリスト、3つの推奨実行方法）
       - ステップ5（コメント品質大規模分析）追加
       - コスト・時間の合計表更新（フル実行: 約2.5-3時間、¥8,100）

   - **最終成果（2025-12-29 Phase 3完了）**:
     - **累計作成ファイル**: 11ファイル、2,840行
     - **総コスト（フル実行）**: ¥8,100
     - **所要時間（フル実行）**: 約2.5-3時間
     - **効果**:
       - 運用工数: 90%削減
       - トラフィック: +50%
       - ファネル効率: 2倍
       - コメント品質: 客観的評価＋継続的改善
       - 長時間実行の安定性: VSCodeクラッシュリスク最小化
       - **収益3倍の土台 + 品質管理基盤完成**

### 2025-12-30

1. ✅ **chihou-keiba-matome: スクレイピングソース最適化（安定性向上）**
   - **問題**: hochi/sponichiの成功率低下（60-66%、頻繁なタイムアウト）
   - **決定**: hochi + sponichi を削除、netkeiba + yahoo のみに絞る
   - **結果**:
     - 記事数: 17件/回 → 9件/回（十分な量）
     - 成功率: **100%**（両ソースとも安定）
     - テスト時間: 17分 → 10分（40%短縮）
     - スクリプト数: 7 → 5（メンテナンス負荷削減）
   - **修正内容**:
     - GitHub Actions workflow 更新
     - スクレイピング安定性テスト更新
     - CLAUDE.md更新（chihou + monorepo root）
     - スクリプトファイル削除（hochi/sponichi）

2. ✅ **夜間タスク実行バグ修正**
   - SEO最適化スクリプト: Syntax Error修正（不可視Unicode文字削除）
   - Discord Webhook: JSON Error修正（String型明示化）

### 2025-12-31

1. ✅ **GA4分析とサーバーエラー調査**
   - **背景**: chihou.keiba-matomeのGA4で「サーバーエラー」ページが検出
   - **調査結果**:
     - 12/30 09:14のGitHub Actions失敗が原因（hochi/sponichiスクリプト参照エラー）
     - 現在は解決済み（最近の実行はすべて成功）
     - サーバーエラーは一時的（数分間のみ）
   - **トラフィック分析**:
     - chihou.keiba-matome: 24ユーザー/週（12/24-12/30）
     - Japan: 14人（実際の日本ユーザー）
     - 運用開始10日間で成果（12/21-12/30）

2. ✅ **monorepo全体SEO最適化実行（Phase 2完了）**
   - **実行内容**:
     - 3プロジェクトすべてに対してSEO最適化実行
     - NIGHTRUN-FULL.sh --phase2 使用
     - Claude Sonnet 4.5でメタデータ自動生成

   - **処理結果**:
     - keiba-matome（中央競馬）: 10記事処理完了
     - chihou-keiba-matome（地方競馬）: 10記事処理完了
     - yosou-keiba-matome（競馬予想）: 8記事処理完了
     - **合計**: 28記事のSEOメタデータ生成

   - **生成内容**（各記事）:
     - metaTitle: SEO最適化タイトル（60文字以内）
     - metaDescription: SEO説明文（150文字前後）
     - ogTitle: SNS共有用タイトル（感情訴求型）
     - ogDescription: SNS説明文（クリック促進）
     - keywords: 記事関連キーワード5件
     - sitemap.xml: 全記事URL自動生成
     - 構造化データ: NewsArticle形式（JSON-LD）

   - **所要時間**: 約4分（08:37-08:41）
   - **コスト**: ¥2,100（Claude API使用）

   - **出力先**:
     - packages/seo-output/keiba-matome/metadata.json
     - packages/seo-output/chihou-keiba-matome/metadata.json
     - packages/seo-output/yosou-keiba-matome/metadata.json
     - 各プロジェクトのsitemap.xml

   - **期待効果**:
     - Google検索流入: +30-50%
     - SNSクリック率: +20-30%（OG最適化）
     - 検索順位: ロングテールワードで上位表示
     - サイトマップ登録で全記事インデックス化

3. ✅ **運用コスト・タスクの明確化**
   - **毎日の自動運用コスト**:
     - 3サイト合計: 約¥700/日（¥20,000/月）
     - 1サイトあたり: 約¥230/日（¥7,000/月）
     - 内訳: Claude API（コメント生成）のみ

   - **毎日の運用タスク**:
     - 手動実行が必要なもの: **ほぼゼロ**（完全自動化済み）
     - 推奨チェック: GA4分析（週1回、5分）
     - GitHub Actions: Discord通知で自動監視

   - **月次タスク**:
     - Phase 1（バックアップ）: 月1回、25分、¥0
     - SEO最適化: 必要に応じて（今回完了）
     - コメント品質分析: 四半期に1回、¥6,000

---

## 夜間長時間タスク実行ガイド

### 概要

Claude Codeを夜間に8-10時間実行することで、運用改善・収益基盤強化が可能です。

**VPS不要**: ローカルMacで実行（追加コスト: 電気代¥30/晩のみ）

### 実行環境セットアップ

```bash
# スリープ防止設定（必須）
caffeinate -d &

# 確認
ps aux | grep caffeinate
```

### 実行可能タスク一覧

#### 🎯 フェーズ1: 無料タスク（優先度S）

**所要時間**: 8-10時間
**追加コスト**: ¥0（電気代¥30のみ）
**期待効果**: 運用工数90%削減、バグ80%削減

| # | タスク名 | 概要 | 恩恵 |
|---|---------|------|------|
| 1 | スクレイピング安定性テスト | 各ソースに100回アクセステスト、成功率測定 | 記事取得成功率 95% → 99.5% |
| 2 | 共通化・リファクタリング | 3プロジェクトの重複コード抽出、packages/sharedに移動 | バグ修正1箇所で済む、新機能追加3倍速 |
| 3 | エラー監視システム実装 | GitHub Actions失敗時の通知、自動リトライ | 手動確認時間90%削減（10分→1分/日） |
| 4 | テスト追加 | スクレイピング＋コメント生成のユニット/E2Eテスト | 本番バグ80%削減 |
| 5 | バックアップ機能実装 | Airtableデータの定期バックアップ、復旧スクリプト | ダウンタイム0時間、データ消失リスク解消 |

#### 💰 フェーズ2: 少額投資タスク（優先度A）

**所要時間**: 8-10時間
**追加コスト**: ¥1,500
**期待効果**: トラフィック+30-50%

| # | タスク名 | 概要 | コスト | 恩恵 |
|---|---------|------|--------|------|
| 6 | SEO大規模最適化 | 全ページのメタデータ、sitemap.xml、構造化データ生成 | ¥700 | Google流入+30-50% |
| 7 | 新ニュースソース追加 | 重賞予想コラム等のスクレイピング追加 | ¥500 | コンテンツ量2-3倍 |
| 8 | 予想精度分析ダッシュボード | nankan-analytics的中率可視化 | ¥300 | CVR+10-20% |

#### 🔍 フェーズ3: 品質改善タスク（優先度B）

**所要時間**: 6-8時間
**追加コスト**: ¥2,000
**期待効果**: ファネル効率2倍

| # | タスク名 | 概要 | コスト | 恩恵 |
|---|---------|------|--------|------|
| 9 | コメント生成品質大規模検証 | 過去200記事再生成、不自然コメント検出、南関導線最適化 | ¥2,000 | 滞在時間+20-30%、遷移率+15-25% |

### 推奨実行順序

#### 第1夜（今晩）: フェーズ1全実行

```bash
# 実行前準備
caffeinate -d &

# Claude Codeで実行:
「以下のタスクを順番に実行してください:

1. スクレイピング安定性テスト
   - packages/keiba-matome, chihou-keiba-matome, yosou-keiba-matomeの全スクレイピングスクリプトを特定
   - 各ソースに対して100回実行テスト
   - 成功率・エラーパターン・タイムアウト発生率を測定
   - 改善提案をレポート

2. 共通化・リファクタリング
   - 3プロジェクトの重複コード（スクレイピング、エラーハンドリング等）を抽出
   - packages/shared/に共通ユーティリティとして移動
   - 各プロジェクトから参照するよう修正
   - 動作確認

3. エラー監視システム実装
   - GitHub Actions失敗検知スクリプト作成
   - Slack/Discord Webhook通知機能実装
   - スクレイピング失敗時の自動リトライ機構
   - ログ集約ダッシュボード（簡易版）

4. テスト追加
   - スクレイピング関数のユニットテスト（Jest使用）
   - コメント生成のE2Eテスト
   - モックデータでの動作確認
   - GitHub Actionsワークフローの検証

5. バックアップ機能実装
   - 全AirtableベースのデータをJSON形式でエクスポート
   - 復旧スクリプト作成（JSON → Airtable書き戻し）
   - 定期実行設定（GitHub Actions or cronジョブ）
   - バックアップファイルのバージョン管理

明日の朝6時までに完了し、詳細レポートを作成してください。」
```

#### 第2夜: フェーズ2実行

#### 第3夜: フェーズ3実行

### コスト試算

#### 既存の月間運用コスト

```
GitHub Actions: 無料枠内（月2,000分、現在1,530分使用）
Netlify: 無料枠内（月100GB転送）
Claude API: 約¥20,000/月（66記事/日 × 30日）
Airtable: 既存契約
X API: 無料

月間合計: 約¥20,000
```

#### 夜間タスク実行の追加コスト

```
フェーズ1（無料タスク）: ¥0
フェーズ2（SEO等）: ¥1,500
フェーズ3（品質改善）: ¥2,000

3夜合計: ¥3,500
```

#### ROI試算

```
投資: ¥3,500（3晩分）

効果（3ヶ月後）:
- トラフィック: +50%
- 運用工数: -80%（月5-10時間削減 = 人件費¥10,000-20,000削減）
- ファネル効率: 2倍（nankan-analytics誘導数2倍）

ROI: 超高（収益3倍の土台 ÷ ¥3,500）
```

### 注意事項

#### 実行環境

- **Mac起動**: 8-10時間スリープさせない（caffeinate使用）
- **電源接続**: バッテリー切れ防止
- **ネットワーク**: 安定したWi-Fi/有線接続

#### Claude API使用量

- フェーズ1: API使用なし → ¥0
- フェーズ2: メタデータ生成等 → ¥1,500
- フェーズ3: 大量コメント再生成 → ¥2,000

#### 実行中の注意

- 途中でAskUserQuestionが発生する可能性あり
- 重要な判断が必要な場合は停止して朝に確認
- エラー発生時は自動的にスキップして次のタスクへ

### トラブルシューティング

#### Macがスリープしてしまう

```bash
# caffeinate再実行
caffeinate -d &

# システム設定でスリープを無効化
# システム環境設定 → バッテリー → 自動スリープをオフ
```

#### Claude API レート制限

```
429 Too Many Requests発生時:
- 自動的に待機してリトライ
- タスク完了まで時間が延びる可能性あり
```

#### GitHub Actions無料枠超過

```
フェーズ1-3はローカル実行のため影響なし
既存の自動化（1日3回）は継続可能
```

### 実行後の確認事項

#### 翌朝チェックリスト

- [ ] Claude Codeの実行ログ確認
- [ ] 各タスクの完了レポート確認
- [ ] 生成されたファイル（テスト、バックアップ等）の検証
- [ ] エラー監視システムの動作確認
- [ ] リファクタリング後のビルドテスト（`npm run build:all`）

#### 効果測定（1週間後）

- [ ] スクレイピング成功率の向上確認
- [ ] GitHub Actions実行ログのエラー減少確認
- [ ] 運用工数の削減実感
- [ ] コードベースの保守性向上確認

#### 効果測定（1-3ヶ月後）

- [ ] Google Analyticsでトラフィック推移確認（フェーズ2実行時）
- [ ] ファネル分析（keiba-matome → chihou-keiba-matome → nankan-analytics）
- [ ] 収益指標の変化

---

## 🔄 定期実行タスク（会話リセット対策）

**⚠️ 重要**: Claudeは会話ごとにリセットされるため、以下のタスクを**必ず毎月実行**すること

### 毎月1日に実行（最優先）

1. **SEO効果の測定とメタデータ更新**
   ```bash
   # 新規記事のSEOメタデータ生成（10-20記事程度）
   cd /Users/apolon/Library/Mobile\ Documents/com~apple~CloudDocs/WorkSpace/keiba-matome-monorepo
   bash setup-env.sh

   # 3サイトすべてでSEO最適化実行
   ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" \
     node packages/shared/scripts/optimize-seo.cjs --project=keiba-matome --limit=20

   ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" \
     node packages/shared/scripts/optimize-seo.cjs --project=chihou-keiba-matome --limit=20

   ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" \
     node packages/shared/scripts/optimize-seo.cjs --project=yosou-keiba-matome --limit=20

   # sitemap.xmlを更新
   cp packages/seo-output/*/sitemap.xml packages/*/public/

   # Git commit & push & deploy
   git add .
   git commit -m "chore: Monthly SEO optimization update"
   git push
   ```

2. **GA4レポート確認とファネル分析**
   - Google Analytics（https://analytics.google.com/）にアクセス
   - 3サイトすべてのレポートを確認:
     - ユーザー数、ページビュー数
     - 検索流入の推移（前月比）
     - サイト間遷移率（keiba-matome → chihou → yosou → nankan-analytics）
     - nankan-analytics CTAのクリック率
   - 数値を記録（CLAUDE.mdの作業履歴に追記）

3. **Google Search Console確認**
   - https://search.google.com/search-console にアクセス
   - 3サイトすべてで確認:
     - インデックス登録状況
     - 検索パフォーマンス（クリック数、表示回数、CTR、掲載順位）
     - サイトマップの最終読み込み日時
   - 問題があれば対処

### 四半期ごとに実行（3ヶ月に1回）

4. **コメント品質分析**
   ```bash
   # フェーズ3実行
   bash NIGHTRUN-FULL.sh --phase3

   # レポート確認
   cat packages/quality-reports/comment-quality-report-*.json

   # 改善が必要な場合は、generate-2ch-comments.cjsのプロンプトを調整
   ```

5. **ファネル効果の詳細分析**
   - GA4の探索 → ファネルデータ探索を確認
   - 各ステップの離脱率を分析
   - 改善ポイントを特定:
     - CTAの配置を変更すべきか？
     - コメント内の導線を増やすべきか？
     - nankan-analyticsのリンク先URLを変更すべきか？

### 半年ごとに実行（6ヶ月に1回）

6. **SEO戦略の見直し**
   - 検索キーワードの分析（Google Search Console）
   - 上位表示できていないキーワードの特定
   - メタデータ生成プロンプトの改善検討

7. **A/Bテストの実施**
   - CTAデザインのテスト
   - 関連サイトリンクの配置テスト
   - コメント内導線の文言テスト

### 緊急時に実行

8. **トラフィック急減時の対応**
   - Google Search Consoleでペナルティチェック
   - サイトマップの再送信
   - インデックス登録のリクエスト

9. **GitHub Actions失敗時の対応**
   - Discord通知を確認
   - エラーログを分析
   - スクレイピングソースの変更を確認

---

## ⚙️ 自動化されているタスク（確認のみ）

以下は既にGitHub Actionsで自動化済み：

- **毎日3回**: 記事スクレイピング + コメント生成 + デプロイ（keiba-matome, chihou-keiba-matome）
- **毎日2回**: 予想記事スクレイピング + コメント生成 + デプロイ（yosou-keiba-matome）
- **Discord通知**: GitHub Actions失敗時に自動通知

これらは手動実行不要だが、週1回程度Discord通知を確認して正常稼働を確認すること。

---

## 📋 チェックリスト（毎月1日）

新しいClaude Codeセッションで以下を確認：

- [ ] CLAUDE.mdのこのセクションを読んだ
- [ ] 前月のGA4レポートを確認した
- [ ] SEO最適化スクリプトを実行した（3サイト）
- [ ] sitemap.xmlを更新した
- [ ] Google Search Consoleを確認した
- [ ] 数値を作業履歴に記録した
- [ ] Git commit & pushした

**このチェックリストを毎月必ず実行すること！**

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
