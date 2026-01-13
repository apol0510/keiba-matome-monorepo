# chihou-keiba-matome: 地方競馬ニュースまとめ（2ch/5ch風）

## 🚨 プロジェクト識別

**このプロジェクト**: chihou-keiba-matome (地方競馬ニュースまとめ)
**作業ディレクトリ**: `/Users/apolon/Library/Mobile Documents/com~apple~CloudDocs/WorkSpace/keiba-matome-monorepo/packages/chihou-keiba-matome/`
**monorepoルート**: `/Users/apolon/Library/Mobile Documents/com~apple~CloudDocs/WorkSpace/keiba-matome-monorepo/`
**リポジトリ**: https://github.com/apol0510/keiba-matome-monorepo
**旧リポジトリ**: https://github.com/apol0510/chihou-keiba-matome (アーカイブ済み)
**サブドメイン**: https://chihou.keiba-matome.jp

---

## 🏗️ monorepo構成（重要）

**✅ 現在の状態**: monorepo化完了（2025-12-21）

**monorepo構成**:
```
keiba-matome-monorepo/              ← 2ch風まとめ専用monorepo
├── package.json (workspaces)      ← npm workspaces設定
├── CLAUDE.md                       ← monorepo全体のドキュメント
├── packages/
│   ├── shared/                    ← 共通ライブラリ
│   │   ├── package.json
│   │   └── scripts/
│   │       └── generate-2ch-comments.cjs
│   ├── keiba-matome/             ← 兄弟プロジェクト（中央競馬）
│   │   ├── package.json           ("@keiba-matome/shared": "*")
│   │   └── CLAUDE.md
│   └── chihou-keiba-matome/      ← このプロジェクト（地方競馬）
│       ├── package.json           ("@keiba-matome/shared": "*")
│       └── CLAUDE.md              ← このファイル
└── .git/
```

**monorepo主要コマンド**:
```bash
# monorepoルートから実行
npm run dev:chihou                # このプロジェクトの開発サーバー起動
npm run dev:keiba-matome          # 中央競馬プロジェクトの開発サーバー起動
npm run build:all                 # 全プロジェクトを一括ビルド

# このプロジェクトのディレクトリで実行
npm run dev                       # 開発サーバー起動（従来通り）
npm run build                     # ビルド（従来通り）
```

**共有コードの使用**:
- `packages/shared/scripts/generate-2ch-comments.cjs`: 2ch風コメント生成スクリプト
- 両プロジェクトから `../shared/scripts/generate-2ch-comments.cjs` で参照

**review-platform-monorepoとの関係**:
- ❌ **完全に独立**
- ❌ **共有コードなし**
- ❌ **統合しない**
- 理由: 口コミサイトと2ch風まとめサイトは目的が全く異なるため

**Claudeへの指示（必読）**:
- [x] このプロジェクトは keiba-matome-monorepo に統合済み
- [x] keiba-matome（中央競馬）と共有コードがある（コメント生成）
- [ ] コメント生成の改善は `packages/shared` で行い、両プロジェクトに適用すること
- [x] review-platform-monorepo とは完全に独立

**monorepo化の経緯**:
- 2025-12-20: keiba-matomeをベースに作成（独立リポジトリとして運用開始）
- 2025-12-21: keiba-matome-monorepo作成、keiba-matomeと統合

---

## プロジェクト概要

**地方競馬ニュースまとめサイト - 2つのニュースソースに2ch/5ch風コメントを追加**

### コンセプト

**ニュース元**: netkeiba地方競馬、Yahoo!ニュース
**独自要素**: 2ch/5ch風の匿名コメント・まとめ（AI生成）
**デザイン**: 掲示板風のレイアウト（薄黄色背景、オレンジアクセント）

### 対象範囲

- **南関東4競馬**: 大井・船橋・川崎・浦和
- **全国地方競馬**: 門別、盛岡、水沢、金沢など

### コンテンツ構成

1. **ニュース引用**
   - 元記事のタイトル・要約
   - 引用元URL
   - 公開日時

2. **2ch/5ch風コメント（AI生成）**
   - 匿名ユーザーのコメント（Claude API生成）
   - レス番号、匿名ID、投稿時間
   - 「>>1」などのアンカー
   - 15-35件/記事（ランダム）
   - **地方競馬特有の用語**:
     - 「南関」「TCK」「ナイター」「トゥインクル」
     - 「大井の穴党」「川崎の鉄板」「船橋の逃げ馬」
     - 「東京大賞典」「川崎記念」「帝王賞」「ジャパンダートダービー」

### 他プロジェクトとの関係

| 項目 | keiba-matome (中央) | chihou-keiba-matome (地方) |
|------|---------------------|---------------------------|
| 対象 | 中央競馬 | 地方競馬（南関東+全国） |
| Airtable Base | appdHJSC4F9pTIoDj | appt25zmKxQDiSCwh |
| ドメイン | keiba-matome.jp | chihou.keiba-matome.jp |
| ポート | 4323 | 4324 |
| 記事数/回 | 3件 | 9件（netkeiba 5 + yahoo 4） |

**相互リンク**:
- chihou → 中央競馬版へのリンク（ヘッダー）
- 中央 → 地方競馬版へのリンク（サイドバー）

---

## 技術スタック

- **フロントエンド**: Astro 5.x
- **スタイリング**: インラインCSS（2ch風デザイン）
- **データベース**: Airtable（Newsテーブル + Commentsテーブル）
- **スクレイピング**: Puppeteer（netkeiba、yahoo）
- **コメント生成**: Anthropic Claude Sonnet 4.5（2ch風コメント自動生成）
- **ホスティング**: Netlify
- **ポート**: 4324（開発サーバー）

---

## 主要コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# ニュース取得（手動）
AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" npm run scrape:netkeiba  # 5件
npm run scrape:yahoo      # 4件

# コメント自動生成（手動）
ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" npm run generate:comments
```

---

## 環境変数

```bash
# Airtable（必須）
AIRTABLE_API_KEY=pat***
AIRTABLE_BASE_ID=appt25zmKxQDiSCwh
AIRTABLE_NEWS_TABLE_ID=tblzB1TSKca0Hq81d
AIRTABLE_COMMENTS_TABLE_ID=tblq8mMckpcuFvbf2

# Claude API（コメント生成）
ANTHROPIC_API_KEY=sk-ant-api03-***

# サイト情報
SITE_URL=https://chihou.keiba-matome.jp
```

**GitHub Secrets（設定済み）:**
- AIRTABLE_API_KEY
- AIRTABLE_BASE_ID
- ANTHROPIC_API_KEY
- NETLIFY_BUILD_HOOK（後で追加）

---

## データベース（Airtable）

### chihou-keiba-matome専用ベース

- **Base ID**: appt25zmKxQDiSCwh
- **Base名**: 地方競馬ニュースまとめ

### Newsテーブル (tblzB1TSKca0Hq81d)

| フィールド名 | タイプ | 説明 |
|-------------|--------|------|
| Title | Single line text | スレタイ風タイトル（例: 【速報】...） |
| Slug | Single line text | URLスラッグ（日本語） |
| SourceTitle | Single line text | 元記事タイトル |
| SourceURL | URL | 引用元URL |
| SourceSite | Single select | 引用元（netkeiba-chihou/yahoo） |
| Summary | Long text | 記事要約 |
| Category | Single select | カテゴリ（速報/炎上/まとめ/ランキング） |
| Tags | Multiple select | タグ（大井競馬/船橋競馬/川崎競馬/浦和競馬/南関東/地方競馬/予想サイト/詐欺/炎上） |
| Status | Single select | ステータス（published/draft） |
| ViewCount | Number | 閲覧数 |
| CommentCount | Number | コメント数 |
| PublishedAt | Date | 公開日時 |

### Commentsテーブル (tblq8mMckpcuFvbf2)

| フィールド名 | タイプ | 説明 |
|-------------|--------|------|
| NewsID | Link to News | 関連ニュース |
| Number | Number | コメント番号 |
| Content | Long text | コメント本文 |
| UserID | Single line text | 匿名ID（例: ID:abc123） |
| IsOP | Checkbox | スレ主フラグ（常にfalse） |

**現在のデータ数（2025-12-20）:**
- News: 2件（published）
- Comments: 65件（AI生成コメント）

---

## 完全自動化システム

### GitHub Actions（完全放置運営）

#### 記事取得+コメント生成（daily-news.yml）
- **頻度**: 1日3回（6AM, 12PM, 6PM JST）
- **処理内容**:
  1. netkeibaから記事スクレイピング（5件）
  2. yahooから記事取得（4件）
  3. 各記事に2ch風コメント生成（15-35件/記事）
  4. Netlify自動デプロイ

**記事数シミュレーション:**
- 1回あたり: netkeiba 5件 + yahoo 4件 = 9件
- 1日3回: 9件 × 3 = 27件
- 月間: 27件 × 30日 = 810件（重複除く、実際は100-150記事程度）

---

## スクレイピング対象サイト

1. **netkeiba地方競馬**（メインソース）
   - `https://nar.netkeiba.com/top/news_list.html`
   - 5件/回
   - 成功率: 100%

2. **Yahoo!ニュース**
   - `https://news.yahoo.co.jp/search?p=%E5%9C%B0%E6%96%B9%E7%AB%B6%E9%A6%AC`
   - 4件/回
   - 成功率: 100%

---

**現在のデータ数（2025-12-20）:**
- News: 2件（published）
- Comments: 66件（AI生成コメント）
  - 川崎競馬記事: 34件
  - 大井競馬記事: 32件

---

## 作業履歴

### 2025-12-20

1. ✅ **プロジェクト作成**
   - keiba-matomeをベースにrsyncでコピー
   - package.json更新（chihou-keiba-matome、ポート4324）
   - astro.config.mjs更新（chihou.keiba-matome.jp）
   - .env更新（Airtable Base ID: appt25zmKxQDiSCwh）
   - 開発サーバー起動成功（http://localhost:4324/）

2. ✅ **Airtable設定**
   - Newsテーブル: 全フィールド設定完了
   - Commentsテーブル: 全フィールド設定完了
   - API Key更新（patCIn4iIx274YQZB...）

3. ✅ **スクレイピング機能実装**
   - 2つのスクレイピングスクリプト作成
     - scrape-netkeiba-chihou.cjs（5件/回）
     - scrape-yahoo-chihou.cjs（4件/回）
   - 地方競馬特化のカテゴリ判定・タグ判定
   - モックデータフォールバック機能

4. ✅ **コメント生成機能実装**
   - generate-2ch-comments.cjs作成
   - add-comments-to-published.cjs作成
   - Claude Sonnet 4.5統合
   - 地方競馬特有の用語対応

5. ✅ **動作確認**
   - 2件の記事作成成功
   - 66件のコメント生成成功
   - Comments table field test成功

6. ✅ **GitHubリポジトリ作成**
   - https://github.com/apol0510/chihou-keiba-matome
   - 初回コミット・プッシュ完了
   - GitHub Secrets設定完了（4つ）
     - AIRTABLE_API_KEY
     - AIRTABLE_BASE_ID
     - ANTHROPIC_API_KEY
     - NETLIFY_BUILD_HOOK

7. ✅ **Netlifyデプロイ完了**
   - プロジェクト名: chihou-keiba-matome
   - カスタムドメイン: https://chihou.keiba-matome.jp
   - デフォルトURL: https://chihou-keiba-matome.netlify.app
   - 環境変数設定完了
   - Build Hook設定完了

8. ✅ **DNS設定完了**
   - Cloudflare CNAME追加: chihou → chihou-keiba-matome.netlify.app
   - DNS Proxy: OFF（グレー雲マーク）

9. ✅ **初回デプロイ成功**
   - サイト表示確認
   - 2件の記事＋66件のコメント表示確認
   - 2ch風デザイン適用確認

10. ✅ **GitHub Actions初回実行成功（2025-12-21）**
   - Ubuntu 24.04対応（libasound2 → libasound2t64）
   - 2ソースからの記事スクレイピング成功
   - 2ch風コメント自動生成成功
   - Netlify自動デプロイ成功
   - 完全自動化システム稼働開始

11. ✅ **Slug長問題修正**
   - 全スクレイピングスクリプトで50文字制限追加
   - 既存3件の長いSlug修正（111-136文字 → 50文字）
   - 404エラー解消

12. ✅ **Google Analytics & Search Console設定完了**
   - Google Analytics: G-HMBYF1PJ5K
   - Google Tag: GT-5N2BB8LW
   - Search Console: HTMLファイル認証完了（google89654457531021bb.html）
   - robots.txt修正: サイトマップURL更新（chihou.keiba-matome.jp）
   - 旧認証メタタグ削除

13. ✅ **SEO対策完了（2025-12-21）**
   - **サイトマップ**: https://chihou.keiba-matome.jp/sitemap.xml
   - **Google Search Console**: 登録完了、サイトマップ送信済み
   - **robots.txt**: サイトマップURL記載済み
   - **XMLサイトマップ自動生成**: src/pages/sitemap.xml.ts実装済み
   - **インデックス状況**: 数日〜数週間でGoogle検索に表示予定

14. ✅ **Netlify設定整理（2025-12-21）**
   - 重複プロジェクト `lucky-dusk-60500a` 削除完了
   - `chihou-keiba-matome` プロジェクトに統一
   - netlify.toml修正: chihou.keiba-matome.jp へのリダイレクト設定
   - 不要なドメイン参照削除

---

## 運用開始

✅ **完全自動化運用開始（2025-12-21）**
- 1日3回（6AM, 12PM, 6PM JST）自動記事取得＆コメント生成
- 4ソース × 17件/回 = 51件/日（重複除く）
- 月間想定: 180-230記事
- すべてのシステムが正常稼働中

---

## 作業履歴

### 2025-12-21（午前）

1. ✅ **タイトル・要約の長さ最適化（全4スクレイピングスクリプト）**
   - **問題**:
     - SourceTitleに「スポニチアネックス競馬12/21(土) 14:30」などのメディア名+日時が含まれる
     - Summaryが長すぎてリスト表示が見づらい

   - **実装内容（全スクリプト共通）**:
     - `cleanTitle()` 関数追加:
       - メディア名削除（スポニチアネックス、netkeiba、スポーツ報知、Yahoo!ニュースなど）
       - 日時情報削除（競馬12/21(土) 14:30 など）
       - 末尾の三点リーダー削除
       - **タイトル: 50文字前後に調整**（60文字超の場合は50文字+...）

     - Summary最適化:
       - **要約: 150文字前後に調整**（160文字超の場合は150文字+...）

     - 記事保存時の変更:
       ```javascript
       // タイトルをクリーンアップ（50文字前後）
       const cleanedTitle = cleanTitle(article.sourceTitle);
       const slug = generateSlug(cleanedTitle);
       const title = generate2chTitle(cleanedTitle, article.category);

       // Summaryを150文字前後に調整
       let summary = article.summary || cleanedTitle;
       if (summary.length > 160) {
         summary = summary.substring(0, 150) + '...';
       }

       // Airtableに保存
       SourceTitle: cleanedTitle,  // クリーンアップ済み
       Summary: summary,           // 150文字前後
       ```

   - **修正したファイル**:
     - `scripts/scrape-netkeiba-chihou.cjs` ✅
     - `scripts/scrape-yahoo-chihou.cjs` ✅

   - **効果**:
     - トップページのリスト表示が見やすくなる
     - Slugが意味のある日本語になる（不正Slug問題の根本解決）
     - 詳細ページのタイトルも簡潔に

2. ✅ **同一ネタの優先順位制御（GitHub Actions実行順序変更）**
   - **要件**: 同じネタが複数メディアにある場合、以下の優先順位で保存
     1. netkeiba（最優先）
     2. Yahoo!ニュース（優先度2）

   - **実装方法**:
     - `.github/workflows/daily-news.yml` の実行順序を変更
     - GitHub Actionsのステップは順次実行されるため、実行順序で優先順位を実現
     - 各スクリプトは既にSlugベースの重複チェック機能を持っている

   - **変更内容**:
     ```yaml
     - name: 1️⃣ Scrape netkeiba（最優先 - 5 articles）
     - name: 2️⃣ Scrape Yahoo!ニュース（優先度2 - 4 articles）
     ```

   - **動作例**:
     | メディア | 実行順序 | 結果 |
     |---------|---------|------|
     | netkeiba | 1番目 | ✅ 保存される（Slug: `川崎記念の出走予定馬が発表`） |
     | Yahoo | 2番目 | ⏭️ スキップ（同じSlug） |
     | Hochi | 3番目 | ⏭️ スキップ（同じSlug） |
     | Sponichi | 4番目 | ⏭️ スキップ（同じSlug） |

   - **効果**:
     - 信頼性の高いメディア（netkeiba）を優先
     - 重複記事を自動で排除
     - データ品質の向上

3. ✅ **相互リンク強化（記事詳細ページCTAバナー追加）**
   - **追加場所**: コメント投稿フォームの直前
   - **デザイン**: グラデーション背景（#fffbea → #fff3cd）、2px オレンジボーダー
   - **リンク先**:
     - 🏇 中央競馬ニュースまとめ（keiba-matome.jp）
     - ⭐ 競馬予想サイト口コミ評価（keiba-review.jp）
   - **効果**:
     - 内部リンク強化（SEO効果）
     - トラフィック相互流入
     - ユーザーエンゲージメント向上

4. ✅ **コメント生成改善（地方競馬特化・大幅強化）**
   - **地方競馬用語追加**:
     - 南関東4競馬場の特徴（「TCK（大井）は穴が出る」「川崎は鉄板」「船橋の逃げ馬は信頼できる」「浦和は荒れる」）
     - 地方G1・重賞（東京大賞典、川崎記念、帝王賞、ジャパンダートダービー、トゥインクルレース、羽田盃、黒潮盃）
     - 地方競馬あるある（「ナイター競馬は仕事帰りに最高」「平日の南関は穴狙い」「地方は人気薄が来やすい」「南関のオッズは中央より素直」「TCKは金曜ナイターが熱い」）
     - 競馬場ネタ（「大井のメガイルミ見ながら競馬最高」「川崎のもつ煮美味いよな」「船橋は坂がきつい」「浦和は馬場が重い」）

   - **話題の自然な脱線**:
     - 例: 記事の話 → 予想の話 → 競馬場のグルメの話
     - 2chスレッドの自然な流れを再現

   - **予想サイトへの導線拡充**（5パターン → 7パターン）:
     - 「TCK特化の予想サイトあったら教えてくれ」
     - 「地方競馬の情報サイトでオススメある？」

   - **効果**:
     - 地方競馬ファンのリアルな会話を再現
     - コメントの多様性・リアリティ向上
     - 自然な予想サイトへの導線

### 2025-12-27: Netlifyデプロイ問題の完全解決

5. ✅ **monorepo化後のNetlifyデプロイ問題を解決**
   - **問題**: monorepo化後、サイトが更新されなくなった
   - **症状**:
     - GitHub Actions: ✅ 正常実行（記事取得、コメント生成すべて成功）
     - Netlify Build Hook: ✅ トリガー成功
     - Netlify Deploy: ❌ エラー（exit status 128: Host key verification failed）

   - **根本原因（2つ）**:
     1. **netlify.tomlのpublishパスが相対パスだった**
        - ❌ `publish = "dist"`（packages/chihou-keiba-matome/内の相対パス）
        - ✅ `publish = "packages/chihou-keiba-matome/dist"`（リポジトリルートからの相対パス）

     2. **Netlifyのリポジトリ設定が旧リポジトリを参照**
        - ❌ 旧: `apol0510/chihou-keiba-matome`（monorepo化時に削除済み）
        - ✅ 新: `apol0510/keiba-matome-monorepo`

   - **解決手順**:
     1. **netlify.toml修正** (`packages/chihou-keiba-matome/netlify.toml`)
        ```toml
        [build]
          command = "npm install && npm run build --workspace=packages/chihou-keiba-matome"
          publish = "packages/chihou-keiba-matome/dist"  # ← 修正
        ```

     2. **Netlifyリポジトリ再接続**
        - Site settings → Build & deploy → Repository → Edit settings
        - 新しいリポジトリ `apol0510/keiba-matome-monorepo` を選択
        - Base directory: `packages/chihou-keiba-matome`
        - Build command: `npm install && npm run build --workspace=packages/chihou-keiba-matome`
        - Publish directory: `packages/chihou-keiba-matome/dist`
        - Functions directory: `packages/chihou-keiba-matome/netlify/functions`

     3. **環境変数確認**
        - `ANTHROPIC_API_KEY`: 既存（確認済み）
        - `AIRTABLE_API_KEY`: 既存
        - `AIRTABLE_BASE_ID`: 既存（appt25zmKxQDiSCwh）

     4. **新しいBuild Hook URL取得**
        - Build & deploy → Build hooks → Add build hook
        - 生成されたURL: `https://api.netlify.com/build_hooks/694fe1e4fa81b7c3229b6439`
        - GitHub Secretsに設定: `CHIHOU_KEIBA_NETLIFY_BUILD_HOOK`

     5. **動作確認**
        - ローカルビルドテスト: ✅ 成功
        - Netlifyデプロイ: ✅ 成功
        - サイト表示: ✅ 地方競馬記事が表示

   - **教訓**:
     - **keiba-matomeと同じ問題が発生**（monorepo CLAUDE.mdの警告を確認すべきだった）
     - netlify.tomlのpublishパスは必ずリポジトリルートからの相対パスにすること
     - リポジトリ変更時は、Netlifyのリポジトリ設定と環境変数を必ず確認

   - **現在の状態**:
     - 完全自動運用復旧 ✅
     - 毎日3回（6AM, 12PM, 6PM JST）自動更新
     - 記事取得（4ソース17件） → コメント生成 → Netlifyデプロイまで完全自動化

6. ✅ **AIコメント生成の自然な話題誘導機能実装（ファネル戦略）**
   - **背景**: 中央競馬サイト（keiba-matome.jp）からの自然な導線を構築

   - **実装内容** (`packages/shared/scripts/generate-2ch-comments.cjs`):
     - 中央競馬（CHUOU）記事に南関（地方競馬）への自然な導線を追加
     - 不自然な脱線を防止（文脈のない突然の競馬場の話をブロック）
     - 南関導線コメント8パターンを3-5件に含める

   - **chihou-keiba-matomeへの影響**:
     - 地方競馬サイト自体のコメント生成ロジックは変更なし
     - 中央競馬サイトから自然に誘導されるトラフィック増加が期待される
     - ファネル: keiba-matome.jp → **chihou.keiba-matome.jp** → nankan-analytics

   - **期待効果**:
     - 中央競馬ファンの流入増加
     - 地方競馬・南関重賞への関心喚起
     - nankan-analytics（最終収益化地点）へのトラフィック増加

   - **commit**:
     - b425b2f - feat: Enable natural topic flow from central to Nankan in comments
     - fba68d7 - docs: Document natural topic flow feature in work history

### 2025-12-30: スクレイピングソース最適化

1. ✅ **hochi + sponichi の削除（安定性向上）**
   - **理由**:
     - 成功率低下: hochi 60%, sponichi 66.7% (目標 95%+)
     - 頻繁なタイムアウト: 60秒制限ギリギリ
     - コンテンツ重複: スポーツ紙同士で同じネタが多い
     - メンテナンス負荷: タイムアウトエラー対応が必要

   - **削除内容**:
     - GitHub Actions workflow から hochi/sponichi ステップ削除
     - スクレイピング安定性テストから hochi/sponichi 削除
     - スクリプトファイル削除:
       - `scripts/scrape-hochi-chihou.cjs`
       - `scripts/scrape-sponichi-chihou.cjs`

   - **結果**:
     - 記事数: 17件/回 → **9件/回** (netkeiba 5 + yahoo 4)
     - 1日: 51件 → **27件** (十分な量)
     - 成功率: **100%** (両ソースとも安定)
     - テスト時間: 17分 → **10分** (40%短縮)
     - メンテナンス負荷: 大幅削減

### 2026-01-13: Yahoo scraper根本解決（4つの落とし穴を完全に潰す）

1. ✅ **問題の特定と根本解決**
   - **問題**: hochi/sponichiから取得しないはずが、Yahoo経由で混入（最新20件中13件）
   - **問題**: 2025-12-29の古い記事が2026-01-12に「新着」として復活
   - **原因**: 4つの落とし穴があった

   - **実装した完全な解決策**:

     **A) fullText未定義リスク解消** (Line 204-208)
     - 除外メディアチェックをタイトルのみで判定（fullText不要、クラッシュリスク排除）
     - daysAgo取得失敗時は`null` → `9999`で古い扱い（安全側に倒す）
     ```javascript
     const isExcludedMedia = excludedMedia.some(media => title.includes(media));
     const safeDaysAgo = Number.isFinite(daysAgo) && daysAgo !== null ? daysAgo : 9999;
     const isTooOld = safeDaysAgo > 14;
     ```

     **B) リダイレクト確認エラー時の混入防止** (Line 257-261)
     - エラー時は「保守的に通す」 → **「混入ゼロ優先で除外」**に変更
     - 取りこぼし < 混入のダメージ（正しい判断）
     ```javascript
     } catch (error) {
       console.error(`⚠️ URL確認エラー: ${article.sourceTitle}`, error.message);
       console.log(`⏭️ スキップ（URL確認エラー）: ${article.sourceTitle}`);
       continue; // 混入ゼロを最優先
     }
     ```

     **C) PublishedAt根本修正（最重要）** (Line 351-363)
     - **取得日時** → **元記事の公開日時**（daysAgoから逆算）
     - daysAgo取得できない記事は保存しない（新着誤爆防止）
     ```javascript
     if (Number.isFinite(article.daysAgo) && article.daysAgo !== null) {
       const date = new Date();
       date.setDate(date.getDate() - article.daysAgo);
       publishedAt = date.toISOString(); // 元記事の公開日時
     } else {
       console.log(`⏭️ スキップ: ${title} (公開日時不明)`);
       continue; // 新着誤爆防止
     }
     ```

     **D) 既存汚れデータのクレンジング**
     - `cleanup-contaminated-data.cjs` 作成
     - 実行結果: **75件削除**
       - 除外ドメイン（hochi/sponichi）: 68件
       - 古い記事（日付不整合）: 7件
     - 残存: 111件（クリーンなデータのみ）

   - **期待効果**:
     - ✅ **hochi/sponichi混入ゼロ**（タイトル検出 + URL確認 + エラー時除外）
     - ✅ **古い記事の新着化ゼロ**（PublishedAtは常に元記事の公開日時）
     - ✅ **エラー時も混入しない**（安全側に倒す）
     - ✅ **既存汚れデータ完全除去**（75件削除）
     - ✅ **クラッシュリスクゼロ**（fullText不要、安全な数値処理）

   - **コミット**:
     - beea67b - fix: Yahoo scraper完全修正（hochi/sponichi除外 + 古い記事復活防止）
     - 62dd046 - fix: Yahoo scraper根本解決（4つの落とし穴を完全に潰す）

### 2026-01-11: データ品質の根本改善（3つの防御策実装）

1. ✅ **Slug生成の共通ライブラリ化（全プロジェクト統一）**
   - **問題**: 不正Slug（`/`, `:`, `#` 等含む）による404エラー
   - **原因**: URL不適切文字の除去が不足

   - **実装内容** (`packages/shared/lib/scraping-utils.cjs`):
     - `generateSlug()` 関数を共通化
     - URL不適切文字の除去: `.replace(/[\/:#&%?=+@]/g, '')`
     - 空Slug防止: フォールバック `news-${timestamp}`
     - 50文字制限の統一

   - **影響範囲**:
     - chihou-keiba-matome: 全スクレイピングスクリプト
     - keiba-matome: 全スクレイピングスクリプト
     - yosou-keiba-matome: 全スクレイピングスクリプト

   - **効果**:
     - バグ修正が1箇所で済む（保守性向上）
     - 新規プロジェクトでも即座に適用可能
     - monorepoの真価を発揮

2. ✅ **不正Slug一括修正スクリプト実行**
   - **実行内容** (`packages/shared/scripts/fix-invalid-slugs.cjs`):
     - chihou-keiba-matome: 6件の不正Slug修正
     - keiba-matome: 7件の不正Slug修正
     - yosou-keiba-matome: 3件の不正Slug修正
     - **合計**: 16件の不正Slug修正（成功率100%）

   - **修正例**:
     - `G/JpnⅠ` → `GJpnⅠ`
     - `1/9` → `19`
     - `6:13一度も...` → `613一度も...`

   - **効果**:
     - 既存の404リンクを完全解消
     - ユーザー体験の即座改善

3. ✅ **過去記事復活問題の根本解決（Yahoo scraper）**
   - **問題**:
     - 2025-12-29の記事（東京大賞典）が2026-01-11に「新規」として復活
     - hochi.newsのURLがYahoo経由で混入
     - PublishedAtが常に取得時刻で上書きされていた

   - **根本原因**:
     1. Yahoo検索結果にhochi.news等の配信元記事が含まれる
     2. Slug重複チェックのみ（SourceURL重複を検出できない）
     3. 古い記事を物理的にフィルタしていない

   - **実装した3つの防御策** (`scripts/scrape-yahoo-chihou.cjs`):

     **P0（最優先）: SourceURLベース重複排除**
     - Slug → SourceURLで重複チェックに変更
     - 既存URLの記事は完全スキップ（PublishedAt更新なし）
     - Line 269-276

     **P1: hochi.news / sponichi.co.jp ドメイン除外**
     - 除外ドメインリスト追加: `['hochi.news', 'hochi.co.jp', 'sponichi.co.jp']`
     - Yahoo経由でもhochi/sponichi記事を弾く
     - Line 175-176, 198-199

     **P2: 古い記事カット（14日制限）**
     - 日付情報を抽出（「X日前」をパース）
     - 14日以上前の記事を破棄
     - Line 183-188, 201-202

   - **効果**:
     - ✅ 過去記事の「復活」を完全防止
     - ✅ hochi削除後もYahoo経由混入を防止
     - ✅ スクレイピングの品質向上（新鮮な記事のみ）
     - ✅ Airtableデータの整合性確保

   - **コミット**:
     - 9c8e1f2 - feat: Slug生成を共通ライブラリ化（URL不適切文字除去）
     - aa1b8f6 - fix: 不正Slug一括修正（16件、3サイト合計）
     - 425e4e2 - fix: 過去記事復活問題を根本解決（Yahoo scraper）

4. ✅ **データ品質の総合評価**

   | 項目 | 修正前 | 修正後 |
   |------|-------|-------|
   | **不正Slug** | 16件（404エラー） | 0件 ✅ |
   | **過去記事復活** | 発生（東京大賞典事例） | 完全防止 ✅ |
   | **hochi混入** | Yahoo経由で混入 | ドメインフィルタで除外 ✅ |
   | **古い記事スクレイピング** | 制限なし | 14日以内のみ ✅ |
   | **PublishedAt整合性** | 常に上書き | 既存URLはスキップ ✅ |
   | **コード保守性** | 各スクリプトに散在 | 共通ライブラリ化 ✅ |

   - **運用安定性**: 大幅向上（エラー検出→修正サイクルの確立）
   - **monorepoスケーリング**: 10サイト以上への展開準備完了

---

## 次のステップ

1. **モニタリング** - 1週間の自動運用確認
2. **SEO最適化** - サイトマップ送信、インデックス状況確認
3. **中央競馬版との相互リンク強化** - keiba-matome.jpとの連携

---

## 参照ドキュメント

- keiba-matome CLAUDE.md: `../keiba-matome/CLAUDE.md` （参照のみ）
