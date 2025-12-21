# yosou-keiba-matome: 競馬予想まとめ（2ch/5ch風）

## 🚨 プロジェクト識別

**このプロジェクト**: yosou-keiba-matome (中央重賞＋南関重賞の予想まとめ)
**作業ディレクトリ**: `/Users/apolon/Library/Mobile Documents/com~apple~CloudDocs/WorkSpace/keiba-matome-monorepo/packages/yosou-keiba-matome/`
**monorepoルート**: `/Users/apolon/Library/Mobile Documents/com~apple~CloudDocs/WorkSpace/keiba-matome-monorepo/`
**リポジトリ**: https://github.com/apol0510/keiba-matome-monorepo
**Netlifyサイト**: (未設定)
**ドメイン**: yosou.keiba-matome.jp (予定)

---

## 🏗️ monorepo構成（重要）

**✅ 現在の状態**: monorepo第3プロジェクトとして作成（2025-12-21）

**monorepo構成**:
```
keiba-matome-monorepo/              ← 2ch風まとめ専用monorepo
├── package.json (workspaces)      ← npm workspaces設定
├── CLAUDE.md                       ← monorepo全体のドキュメント
├── packages/
│   ├── shared/                    ← 共通ライブラリ
│   │   ├── package.json
│   │   └── scripts/
│   │       └── generate-2ch-comments.cjs  ← 予想コメント生成に使用
│   ├── keiba-matome/             ← 中央競馬ニュース
│   ├── chihou-keiba-matome/      ← 地方競馬ニュース
│   └── yosou-keiba-matome/       ← このプロジェクト（予想特化）
│       ├── package.json
│       └── CLAUDE.md              ← このファイル
└── .git/
```

**monorepo主要コマンド**:
```bash
# monorepoルートから実行
npm run dev:yosou                 # このプロジェクトの開発サーバー起動
npm run build:yosou               # このプロジェクトのビルド
npm run build:all                 # 全プロジェクトを一括ビルド

# このプロジェクトのディレクトリで実行
npm run dev                       # 開発サーバー起動（ポート4325）
npm run build                     # ビルド
```

---

## プロジェクト概要

**競馬予想まとめサイト - 中央重賞＋南関重賞の予想に2ch/5ch風コメント**

### コンセプト

**対象レース**:
1. **中央競馬（JRA）重賞** - G1/G2/G3すべて（週末メイン）
2. **南関東4競馬の重賞** - 大井・船橋・川崎・浦和（平日水曜メイン）

**ニュース元**:
- netkeiba予想コラム
- Yahoo!競馬予想
- スポーツ新聞予想（日刊、報知、スポニチ）

**独自要素**: 2ch/5ch風の予想コメント・議論
**デザイン**: 掲示板風のレイアウト（薄黄色背景、オレンジアクセント）

### コンテンツ構成

1. **予想記事引用**
   - 重賞レース名・グレード
   - 予想コラムの要約
   - 引用元URL（netkeiba、Yahoo!競馬など）
   - レース開催日

2. **2ch/5ch風予想コメント（AI生成）**
   - 「◎本命はドウデュース」「穴狙いならスルーネットワーク」
   - レス番号、匿名ID、投稿時間
   - 「>>1」などのアンカー
   - 15-35件/記事（ランダム）

3. **カテゴリ分け**
   - **中央重賞** (`/chuou/`) - 土日の中央競馬
   - **南関重賞** (`/nankan/`) - 平日の南関競馬

### 他プロジェクトとの差別化

| 項目 | keiba-matome | chihou-keiba-matome | yosou-keiba-matome |
|------|-------------|---------------------|-------------------|
| タイプ | ニュースまとめ | 地方ニュースまとめ | **予想まとめ** |
| 対象 | 中央ニュース全般 | 地方ニュース全般 | **重賞予想のみ** |
| 更新頻度 | 毎日3回 | 毎日3回 | **毎日2回（レース日は3回）** |
| ターゲット | 競馬ファン全般 | 地方競馬ファン | **馬券購入予定者** |
| 収益化 | AdSense | AdSense | **有料予想へ導線** |

---

## 技術スタック

- **フロントエンド**: Astro 5.x
- **スタイリング**: インラインCSS（2ch風デザイン）
- **データベース**: Airtable（Articlesテーブル + Commentsテーブル）
- **スクレイピング**: Puppeteer（netkeiba予想、Yahoo!競馬予想）
- **コメント生成**: Anthropic Claude Sonnet 4.5（2ch風予想コメント自動生成）
- **ホスティング**: Netlify（完全SSG mode）
- **ポート**: 4325（開発サーバー）

---

## 主要コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 中央重賞予想取得（手動）
AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/scrape-chuou-yosou.cjs

# 南関重賞予想取得（手動）
AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/scrape-nankan-yosou.cjs

# コメント自動生成（手動）
ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node ../shared/scripts/generate-2ch-comments.cjs
```

---

## 環境変数

```bash
# Airtable（必須）
AIRTABLE_API_KEY=pat***********************************
AIRTABLE_BASE_ID=(新規作成予定)

# Claude API（コメント生成）
ANTHROPIC_API_KEY=sk-ant-api03-********************************

# サイト情報
SITE_URL=https://yosou.keiba-matome.jp
```

---

## データベース（Airtable）

### yosou-keiba-matome専用ベース（新規作成予定）

- **Base ID**: (未作成)
- **Base名**: Yosou Keiba Matome (2ch風予想)

### Articlesテーブル

| フィールド名 | タイプ | 説明 |
|-------------|--------|------|
| Title | Single line text | スレタイ風タイトル（例: 【有馬記念】本命はドウデュース？） |
| Slug | Single line text | URLスラッグ（arima-kinen-2025） |
| RaceName | Single line text | レース名（有馬記念、東京大賞典など） |
| RaceDate | Date | レース開催日 |
| Track | Single line text | 競馬場（中山、大井、船橋など） |
| Grade | Single select | グレード（G1/G2/G3/JpnG1/JpnG2/JpnG3） |
| Category | Single select | カテゴリ（中央重賞/南関重賞） |
| SourceURL | URL | 引用元URL（netkeiba、Yahoo!競馬など） |
| SourceSite | Single select | 引用元サイト（netkeiba/Yahoo!/その他） |
| Summary | Long text | 予想記事要約 |
| Status | Single select | ステータス（published/draft） |
| ViewCount | Number | 閲覧数 |
| CommentCount | Number | コメント数 |
| PublishedAt | Date | 公開日時 |

### Commentsテーブル

| フィールド名 | タイプ | 説明 |
|-------------|--------|------|
| ArticleID | Link to Articles | 関連記事 |
| Content | Long text | コメント本文 |
| UserName | Single line text | 名無しさん |
| UserID | Single line text | 匿名ID（例: ID:abc123） |
| IsApproved | Checkbox | 承認フラグ（AI生成=true） |
| CreatedAt | Created time | 投稿日時 |

---

## 更新スケジュール（365日稼働）

### 毎週月曜日
```
18:00 JST: 南関重賞予想記事生成（火・水開催分）
```

### 毎週火曜日
```
06:00 JST: 南関重賞予想追加（水曜開催分）
18:00 JST: 南関重賞予想追加（木曜開催分）
```

### 毎週水曜日
```
06:00 JST: 南関重賞予想追加（当日分）
18:00 JST: 南関重賞予想追加（木曜開催分）
```

### 毎週木曜日
```
18:00 JST: 中央重賞予想記事生成（金・土・日開催分）
```

### 毎週金曜日
```
06:00 JST: 中央重賞予想追加（土・日開催分）
18:00 JST: 中央重賞予想追加（土・日開催分）
```

### 毎週土曜日
```
06:00 JST: 中央重賞予想追加（日曜開催分）
```

### 毎週日曜日
```
18:00 JST: 翌週の南関重賞予想（月・火開催分）
```

→ **毎日更新される（SEO最強）**

---

## ディレクトリ構造

```
yosou-keiba-matome/
├── src/
│   ├── pages/
│   │   ├── index.astro          # トップページ（予想記事一覧）
│   │   ├── chuou/
│   │   │   └── [slug].astro     # 中央重賞予想詳細
│   │   └── nankan/
│   │       └── [slug].astro     # 南関重賞予想詳細
│   ├── layouts/
│   │   └── BaseLayout.astro     # 2ch風レイアウト
│   └── lib/
│       └── airtable.ts          # Airtable接続
├── scripts/
│   ├── scrape-chuou-yosou.cjs          # 中央重賞予想取得（Puppeteer）
│   ├── scrape-nankan-yosou.cjs         # 南関重賞予想取得（Puppeteer）
│   └── (共有) ../shared/scripts/generate-2ch-comments.cjs
├── .github/
│   └── workflows/
│       └── daily-yosou.yml             # 予想記事取得+コメント生成（1日2回）
├── CLAUDE.md
├── netlify.toml
└── package.json
```

---

## 2ch風予想コメント生成ルール

### コメント生成プロンプト（Claude API）

```
あなたは2ch/5chの競馬板の住人です。
以下の重賞レースの予想記事に対して、2ch風の予想コメントを{count}件生成してください。

【レース名】
{race_name}（{grade}・{track}）

【予想記事要約】
{summary}

【コメント生成ルール】
1. 短く、口語的に（10-60文字程度）
2. 予想ポイントを含める（「◎本命は〇〇」「穴狙いなら△△」）
3. 「>>1」「>>5」などのアンカーを適度に使用
4. 賛否両論（「この予想は鉄板」「いや△△の方が来る」）
5. 競馬用語・スラング（「逃げ馬」「穴馬」「ガチガチ」「万馬券」など）
6. 南関特有の表現（「TCK」「南関競馬」「ナイター」「船橋巧者」など）
7. 【重要】3-5件に1件程度、以下のような有料予想への自然な導線コメントを含める：
   - 「有料予想使ってる人いる？精度どうよ？」
   - 「〇〇予想サイトの的中率ヤバいらしいな」
   - 「詐欺サイトに引っかからないように評判は調べとけよ」
   - 「自力予想で負けまくってるから有料試してみるか」

【出力形式】
JSON配列で出力してください。
```

---

## 南関競馬予想への特化機能

### あなたの本業との連携

**前提**: 南関競馬予想を生業とされている
**目的**: 2ch風まとめサイトから有料予想サービスへ導線

### 実装予定機能

1. **手動予想記事の追加**
   - Airtableに手動で記事を追加可能
   - あなたの本命・対抗・穴馬を記載

2. **的中率の表示**
   - 予想記事 → レース結果 → 答え合わせ記事の自動生成
   - 的中率スコア表示

3. **有料予想への導線**
   - サイドバーにCTAバナー
   - 記事下に誘導リンク
   - コメント内の自然な導線（3-5件に1件）

---

## 作業履歴

### 2025-12-21

1. ✅ **yosou-keiba-matomeプロジェクト作成**
   - keiba-matomeをベースにコピー
   - package.json更新（yosou-keiba-matome、ポート4325）
   - monorepo package.jsonにコマンド追加（dev:yosou、build:yosou）
   - CLAUDE.md作成（このファイル）

---

## 次のステップ

### Phase 1: 最小構成（中央重賞のみ）- 2週間

1. [ ] Airtable Base作成
   - Articlesテーブル設計
   - Commentsテーブル設計

2. [ ] スクレイピングスクリプト作成
   - scripts/scrape-chuou-yosou.cjs（netkeiba予想コラム）
   - 週末の中央重賞のみ対応

3. [ ] フロントエンド実装
   - src/pages/index.astro（予想記事一覧）
   - src/pages/chuou/[slug].astro（予想詳細）
   - 2ch風デザイン適用

4. [ ] GitHub Actions設定
   - .github/workflows/daily-yosou.yml
   - 金・土・日のみ実行

5. [ ] Netlifyデプロイ
   - yosou.keiba-matome.jp設定

### Phase 2: 南関対応追加 - 1週間

6. [ ] 南関スクレイピング追加
   - scripts/scrape-nankan-yosou.cjs
   - 大井・船橋・川崊・浦和の重賞対応

7. [ ] カテゴリ分け実装
   - src/pages/nankan/[slug].astro
   - トップページにタブ機能追加（中央/南関）

8. [ ] GitHub Actions更新
   - 毎日稼働（月〜日）
   - レース日別の更新スケジュール

### Phase 3: 最適化 - 継続的

9. [ ] 2ch風コメントの精度向上
   - 予想特化プロンプト調整
   - 南関用語・ネタの追加

10. [ ] 手動予想記事機能
    - あなたの本命・対抗・穴馬を追加

11. [ ] 的中率表示機能
    - レース結果との答え合わせ

12. [ ] 有料予想への導線最適化
    - コンバージョン率測定
    - ABテスト実施

---

## 参照ドキュメント

- packages/keiba-matome/CLAUDE.md: 中央競馬ニュースサイトの詳細
- packages/chihou-keiba-matome/CLAUDE.md: 地方競馬ニュースサイトの詳細
- packages/shared/scripts/generate-2ch-comments.cjs: コメント生成ロジック
