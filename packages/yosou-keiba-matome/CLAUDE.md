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
   - **中央重賞** (`/chuou/`) - 土日の中央競馬重賞
   - **南関重賞** (`/nankan/`) - 南関東4競馬の重賞（S1/S2/S3、Jpn1/Jpn2/Jpn3）
   - **南関メイン** (`/nankan-main/`) - 平日の南関メインレース（非重賞）

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
| Grade | Single select | グレード（G1/G2/G3/Jpn1/Jpn2/Jpn3/S1/S2/S3/メインレース） |
| Category | Single select | カテゴリ（中央重賞/南関重賞/南関メイン） |
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

### 2025-12-23

1. ✅ **IsApprovedフィールド問題の修正**
   - 問題: 自動生成コメントがIsApproved=undefinedで本番に表示されない
   - 修正: generate-2ch-comments.cjsにIsApproved: trueを追加
   - 結果: 今後のコメントは自動承認される

2. ✅ **記事タイトルの改善**
   - 南関メイン: 「【大井 9R】KRAトロフィー」→「【大井 9R】KRAトロフィー 本命◎モズユウガ 対抗○フジマサテイオーで勝負！」
   - 中央重賞: 「【中山 G1】有馬記念」→「【中山 G1】有馬記念 予想スレ【12/25】」
   - 目的: SEO向上、クリック率向上

3. ✅ **南関重賞の自動判定機能実装**
   - 71レースの南関重賞リスト追加（GI/JpnI/JpnII/JpnIII/SI/SII/SIII）
   - detectGrade()関数でレース名から格付けを自動判定
   - Category自動設定（南関重賞 or 南関メイン）
   - Airtableに8つのGrade選択肢を追加
   - 既存記事を一括修正（ゴールドカップ: メインレース→SI、南関メイン→南関重賞）

4. ✅ **Zapier + X自動投稿の計画策定**
   - コスト試算完了: X Dev $200プラン → Zapier連携で月額$30（年間$2,040節約）
   - Claude API料金試算: 2ch風コメント（月$27.90）、X投稿文（月$2.26）
   - CLAUDE.mdに実装手順を記載
   - 次回作業: Zapier設定 → AI生成文スクリプト → GitHub Actions連携

---

## X（Twitter）自動投稿機能（Zapier連携）

### 🎯 概要

**目的**: Zapier + Claude APIでX自動投稿を実装し、コストを削減

**現状の問題**:
- X Dev API $200プラン: 月額$200（年間$2,400）
- 複数サイトで使用すると無料枠では不足

**Zapier連携のメリット**:
- ✅ X Dev API不要（月額$200 → $0）
- ✅ 複数サイトから投稿可能
- ✅ AI生成文で魅力的な投稿
- ✅ 既存のZapier Pro契約を活用

### 💰 コスト試算

**Zapier Pro プラン（既契約）**:
- 月額: $19.99（年額$239.88）
- タスク数: 750タスク/月
- 現在使用: 8/750（ほぼ未使用）

**Claude API料金（品質重視：Sonnet 4使用）**:
- X投稿AI生成文: 約$2.26/月
- 2ch風コメント生成: 約$27.90/月（3サイト合計）
- **合計**: 約$30/月

**総コスト比較**:
| 項目 | X Dev $200プラン | Zapier連携 | 節約額 |
|------|-----------------|-----------|--------|
| 月額 | $200 | $30 | **$170** |
| 年額 | $2,400 | $360 | **$2,040** |

### 🔧 実装手順（次回作業）

#### ステップ1: Zapier設定

1. **Zapierにログイン** → https://zapier.com/app/zaps
2. **「Create Zap」をクリック**
3. **Trigger設定**:
   - App: 「Webhooks by Zapier」を選択
   - Event: 「Catch Hook」を選択
   - Continue
   - **Webhook URLが表示される** → コピー

4. **Action設定**:
   - App: 「X (Twitter)」を検索して選択
   - Event: 「Create Tweet」を選択
   - Xアカウントを接続
   - Message: `{{1__text}}` を設定

5. **Test & Turn on**

**Webhook URL例**:
```
https://hooks.zapier.com/hooks/catch/XXXXXXX/YYYYYYY/
```

#### ステップ2: AI生成文スクリプト作成

`scripts/generate-x-post.cjs` を作成:
```javascript
// Claude APIでX投稿文を生成
// Input: 記事タイトル、要約、URL
// Output: 魅力的な投稿文（2-3文、140文字以内）
```

**生成例**:
```
🏇 【浦和 SI】ゴールドカップ予想！

本命◎モズユウガ、対抗○フジマサテイオーで勝負。
南関重賞の熱い戦いが始まります。

詳細👇
https://yosou.keiba-matome.jp/keiba-yosou/浦和-2025-12-23-11R/
```

#### ステップ3: GitHub Actionsに組み込み

`.github/workflows/yosou-nankan-daily.yml` に追加:
```yaml
- name: Generate X post and send to Zapier
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    ZAPIER_WEBHOOK_URL: ${{ secrets.YOSOU_KEIBA_ZAPIER_WEBHOOK }}
  run: |
    # AI生成文を作成
    # Zapier Webhookに送信
```

#### ステップ4: GitHub Secretsに登録

```bash
gh secret set YOSOU_KEIBA_ZAPIER_WEBHOOK \
  --body "https://hooks.zapier.com/hooks/catch/XXXXXXX/YYYYYYY/" \
  --repo apol0510/keiba-matome-monorepo
```

### 📊 月間タスク数試算

| サイト | 更新頻度 | 月間投稿数 | Zapierタスク |
|--------|---------|-----------|-------------|
| yosou-keiba-matome | 1日2回×2記事 | 120 | 240 |
| keiba-matome（既存） | 1日3回×3記事 | 270 | 540 |
| chihou-keiba-matome | 追加予定 | - | - |
| **合計** | | | **780** |

→ **750タスク超過時はPay-per-task（$0.0334/タスク）**
→ 超過分30タスク × $0.0334 = 約$1/月

### 🎬 次回作業チェックリスト

- [ ] Zapierで新規Zapを作成
- [ ] Webhook URLを取得
- [ ] `scripts/generate-x-post.cjs` 作成
- [ ] GitHub Actionsに組み込み
- [ ] GitHub Secretsに登録
- [ ] テスト投稿実施
- [ ] 本番運用開始

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

## ⚠️ Netlifyデプロイの教訓（重要）

### 2025-12-22: 初回デプロイで学んだこと

**問題**: Netlifyデプロイに4回失敗し、約20分を浪費した

| 回数 | エラー内容 | 原因 | 無駄時間 |
|-----|----------|------|---------|
| 1回目 | `Cannot find module @rollup/rollup-linux-x64-gnu` | クロスプラットフォームバイナリ不足 | 10分 |
| 2回目 | `Deploy directory 'dist' does not exist` | publishパスが相対パスだった | 10分 |
| 3回目 | `@netlify/plugin-cache not found` | 存在しないプラグインを追加 | 18秒 |
| 4回目 | 同上 | 同上（ドキュメント更新コミットで再トリガー） | 17秒 |

**すべてローカルテストで防げた失敗**

#### エラー1: Rollupネイティブバイナリ不足
**症状**: `Cannot find module @rollup/rollup-linux-x64-gnu`
**原因**: macOS用バイナリ（darwin-x64）のみインストールされ、Linux用（linux-x64-gnu）が不足
**解決策**: package.jsonに `optionalDependencies` を追加
```json
"optionalDependencies": {
  "@rollup/rollup-linux-x64-gnu": "^4.30.1",
  "@rollup/rollup-darwin-x64": "^4.30.1"
}
```

#### エラー2: デプロイディレクトリパス間違い
**症状**: `Deploy directory 'dist' does not exist`
**原因**: monorepo構造でビルドは成功していたが、publishパスが相対パスになっていた
**解決策**: netlify.tomlのpublishパスを修正
```toml
publish = "packages/yosou-keiba-matome/dist"  # 正しい
publish = "dist"  # 間違い
```

#### エラー3: ビルド時間が長すぎる（10分）
**症状**: npm installだけで10分かかる
**原因**:
- キャッシュが効いていない
- 古いPuppeteer（21.x）が重複インストールされていた
**解決策**:
1. Netlifyキャッシュプラグイン追加
2. 依存関係の統一（Puppeteer 24.x）

### 今後のClaudeへの指示（必読）

#### ✅ Netlifyデプロイ前の必須チェックリスト

1. **ローカルビルドテスト**
   ```bash
   cd packages/yosou-keiba-matome
   npm run build
   ls -la dist/  # distディレクトリが生成されるか確認
   ```

2. **netlify.toml検証**
   - [ ] `publish` パスがmonorepo構造に対応しているか
   - [ ] `command` がワークスペース指定しているか
   - [ ] クロスプラットフォームバイナリが必要か（Rollup、esbuildなど）

3. **依存関係の最適化**
   - [ ] package-lock.jsonが最新か
   - [ ] 古いバージョンの依存関係が残っていないか
   - [ ] `npm audit` で脆弱性チェック

4. **Netlifyキャッシュ設定**
   - [ ] キャッシュプラグインが設定されているか
   - [ ] 2回目以降のビルド時間短縮策があるか

#### ❌ やってはいけないこと

1. **試行錯誤的なデバッグ**
   - Netlifyで何度もデプロイを繰り返さない（1回10分かかる）
   - ローカルで検証してからpushする

2. **不完全なpackage.json**
   - プラットフォーム固有のバイナリを見落とさない
   - `optionalDependencies` を活用する

3. **monorepoパスの勘違い**
   - Netlifyは常にリポジトリルートから実行される
   - 相対パスではなく、ルートからの絶対パスを指定する

#### 🔧 効率的なデバッグ方法

1. **ローカルで再現**
   - Netlifyのエラーはローカルでも再現できることが多い
   - `npm run build` でローカルビルドを確認

2. **段階的な検証**
   - Step 1: ローカルビルド成功
   - Step 2: netlify.toml設定確認
   - Step 3: 依存関係チェック
   - Step 4: Netlifyデプロイ

3. **ログの読み方**
   - エラーメッセージの**最初**と**最後**を読む
   - 中間の警告は無視してよい場合が多い

### 参考: 成功したnetlify.toml

```toml
[build]
  command = "npm run build --workspace=packages/yosou-keiba-matome"
  publish = "packages/yosou-keiba-matome/dist"

# Netlifyのキャッシュ最適化
[[plugins]]
  package = "@netlify/plugin-cache"
  [plugins.inputs]
    paths = [
      "node_modules",
      ".npm"
    ]

[functions]
  directory = "netlify/functions"
```

### 参考: 成功したpackage.json（抜粋）

```json
{
  "optionalDependencies": {
    "@rollup/rollup-linux-x64-gnu": "^4.30.1",
    "@rollup/rollup-darwin-x64": "^4.30.1"
  }
}
```

---

## 参照ドキュメント

- packages/keiba-matome/CLAUDE.md: 中央競馬ニュースサイトの詳細
- packages/chihou-keiba-matome/CLAUDE.md: 地方競馬ニュースサイトの詳細
- packages/shared/scripts/generate-2ch-comments.cjs: コメント生成ロジック
