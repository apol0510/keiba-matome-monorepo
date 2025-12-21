# yosou-keiba-matome Airtable セットアップガイド

## 概要

yosou-keiba-matome（競馬予想まとめサイト）用のAirtable Base作成手順です。

---

## Base情報

**Base名**: `Yosou Keiba Matome (2ch風予想)`
**説明**: 中央競馬重賞＋南関重賞の予想記事を管理するデータベース

---

## テーブル構成

### 1. Articles（予想記事テーブル）

重賞レースの予想記事を管理します。

#### フィールド一覧

| フィールド名 | タイプ | 説明 | 必須 | デフォルト値 |
|-------------|--------|------|------|------------|
| **Title** | Single line text | スレタイ風タイトル | ✅ | - |
| **Slug** | Single line text | URLスラッグ（日本語） | ✅ | - |
| **RaceName** | Single line text | レース名 | ✅ | - |
| **RaceDate** | Date | レース開催日 | ✅ | - |
| **Track** | Single line text | 競馬場 | ✅ | - |
| **Grade** | Single select | グレード | ✅ | - |
| **Category** | Single select | カテゴリ | ✅ | - |
| **SourceURL** | URL | 引用元URL | ○ | - |
| **SourceSite** | Single select | 引用元サイト | ○ | - |
| **Summary** | Long text | 予想記事要約 | ✅ | - |
| **Status** | Single select | ステータス | ✅ | draft |
| **ViewCount** | Number | 閲覧数 | - | 0 |
| **CommentCount** | Number | コメント数 | - | 0 |
| **PublishedAt** | Date | 公開日時 | - | - |
| **CreatedAt** | Created time | 作成日時 | ✅ | (自動) |

#### フィールド詳細

**Grade（グレード）の選択肢**:
```
G1
G2
G3
Jpn1
Jpn2
Jpn3
S1
S2
S3
メインレース
```

**グレード説明**:
- **G1/G2/G3**: 中央競馬（JRA）の重賞
- **Jpn1/Jpn2/Jpn3**: 交流重賞（全国G1/G2/G3）
- **S1/S2/S3**: 南関重賞（南関東4競馬の独自グレード）
- **メインレース**: 重賞以外のメインレース

**Category（カテゴリ）の選択肢**:
```
中央重賞
南関重賞
南関メイン
```

**Status（ステータス）の選択肢**:
```
draft（下書き）
published（公開済み）
```

**SourceSite（引用元サイト）の選択肢**:
```
netkeiba
Yahoo!競馬
日刊スポーツ
スポーツ報知
スポニチ
その他
```

#### サンプルデータ

| Title | Slug | RaceName | RaceDate | Track | Grade | Category |
|-------|------|----------|----------|-------|-------|----------|
| 【有馬記念】本命はドウデュース？イクイノックスか？ | 有馬記念2025予想 | 有馬記念 | 2025-12-28 | 中山 | G1 | 中央重賞 |
| 【東京大賞典】南関G1の本命を予想するスレ | 東京大賞典2025予想 | 東京大賞典 | 2025-12-29 | 大井 | Jpn1 | 南関重賞 |
| 【川崎記念】2026年最初の南関G1予想 | 川崎記念2026予想 | 川崎記念 | 2026-01-26 | 川崎 | Jpn1 | 南関重賞 |
| 【浦和 11R】師走特別 | 浦和-2025-12-22-11R | 師走特別 | 2025-12-22 | 浦和 | メインレース | 南関メイン |

---

### 2. Comments（コメントテーブル）

予想記事に対する2ch風コメントを管理します。

#### フィールド一覧

| フィールド名 | タイプ | 説明 | 必須 | デフォルト値 |
|-------------|--------|------|------|------------|
| **ArticleID** | Link to Articles | 関連記事 | ✅ | - |
| **Content** | Long text | コメント本文 | ✅ | - |
| **UserName** | Single line text | 投稿者名 | - | 名無しさん@実況で競馬板アウト |
| **UserID** | Single line text | 匿名ID | - | - |
| **IsApproved** | Checkbox | 承認済みフラグ | ✅ | false |
| **CreatedAt** | Created time | 投稿日時 | ✅ | (自動) |

#### サンプルデータ

| ArticleID | Content | UserName | UserID | IsApproved |
|-----------|---------|----------|--------|-----------|
| 有馬記念2025予想 | 本命はドウデュース一択だろ | 名無しさん@実況で競馬板アウト | ID:abc123 | ✅ |
| 有馬記念2025予想 | >>1 いやイクイノックスの連覇あるぞ | 名無しさん@実況で競馬板アウト | ID:def456 | ✅ |
| 東京大賞典2025予想 | 南関G1は荒れるからなぁ穴狙いたい | 名無しさん@実況で競馬板アウト | ID:ghi789 | ✅ |

---

## Airtable Base作成手順

### Step 1: Airtableにログイン

1. https://airtable.com/ にアクセス
2. アカウントにログイン

### Step 2: 新しいBase作成

1. ワークスペース画面で「Create a base」をクリック
2. 「Start from scratch」を選択
3. Base名を入力: `Yosou Keiba Matome (2ch風予想)`
4. 「Create base」をクリック

### Step 3: Articlesテーブル作成

#### 3-1. デフォルトテーブルの名前変更

1. デフォルトで作成される「Table 1」を右クリック
2. 「Rename table」を選択
3. `Articles` に変更

#### 3-2. フィールド追加

デフォルトの「Name」フィールドを「Title」に変更してから、以下のフィールドを追加：

1. **Title** (Single line text) - デフォルトフィールドをリネーム
2. **Slug** (Single line text)
3. **RaceName** (Single line text)
4. **RaceDate** (Date) - 日付のみ
5. **Track** (Single line text)
6. **Grade** (Single select)
   - 選択肢: G1, G2, G3, JpnG1, JpnG2, JpnG3
7. **Category** (Single select)
   - 選択肢: 中央重賞, 南関重賞
8. **SourceURL** (URL)
9. **SourceSite** (Single select)
   - 選択肢: netkeiba, Yahoo!競馬, 日刊スポーツ, スポーツ報知, スポニチ, その他
10. **Summary** (Long text)
11. **Status** (Single select)
    - 選択肢: draft, published
    - デフォルト値: draft
12. **ViewCount** (Number) - Integer, デフォルト値: 0
13. **CommentCount** (Number) - Integer, デフォルト値: 0
14. **PublishedAt** (Date) - 日付と時刻
15. **CreatedAt** (Created time)

### Step 4: Commentsテーブル作成

#### 4-1. 新しいテーブル追加

1. 左サイドバーの「Add or import」をクリック
2. 「Create a new table」を選択
3. テーブル名: `Comments`

#### 4-2. フィールド追加

1. **ArticleID** (Link to another record)
   - リンク先: Articles
   - リンクフィールド名: Comments (Articles側に自動作成)
2. **Content** (Long text)
3. **UserName** (Single line text)
   - デフォルト値: 名無しさん@実況で競馬板アウト
4. **UserID** (Single line text)
5. **IsApproved** (Checkbox)
   - デフォルト値: false
6. **CreatedAt** (Created time)

### Step 5: サンプルデータ投入

#### Articlesテーブル

以下の3件を手動で追加：

**記事1: 有馬記念（中央G1）**
- Title: 【有馬記念】本命はドウデュース？イクイノックスか？
- Slug: 有馬記念2025予想
- RaceName: 有馬記念
- RaceDate: 2025-12-28
- Track: 中山
- Grade: G1
- Category: 中央重賞
- Summary: 2025年有馬記念の予想。本命はドウデュース、対抗イクイノックス。
- Status: published
- PublishedAt: 2025-12-21 (現在日時)

**記事2: 東京大賞典（国際交流G1）**
- Title: 【東京大賞典】国際交流G1の本命を予想するスレ
- Slug: 東京大賞典2025予想
- RaceName: 東京大賞典
- RaceDate: 2025-12-29
- Track: 大井
- Grade: G1
- Category: 南関重賞
- Summary: 2025年東京大賞典の予想。国際交流のG1レース。
- Status: published
- PublishedAt: 2025-12-21 (現在日時)

**記事3: 川崎記念（交流Jpn1）**
- Title: 【川崎記念】2026年最初の交流Jpn1予想
- Slug: 川崎記念2026予想
- RaceName: 川崎記念
- RaceDate: 2026-01-26
- Track: 川崎
- Grade: Jpn1
- Category: 南関重賞
- Summary: 2026年川崎記念の予想。新春の交流Jpn1。
- Status: published
- PublishedAt: 2025-12-21 (現在日時)

**記事4: 浦和メインレース**
- Title: 【浦和 11R】師走特別
- Slug: 浦和-2025-12-22-11R
- RaceName: 師走特別
- RaceDate: 2025-12-22
- Track: 浦和
- Grade: メインレース
- Category: 南関メイン
- Summary: 浦和競馬のメインレース予想。本命: 5番、対抗: 11番、穴: 7番
- Status: published
- PublishedAt: 2025-12-21 (現在日時)

#### Commentsテーブル

各記事に3-5件のサンプルコメントを追加（後ほどスクリプトで自動生成可能）。

### Step 6: Base IDとAPI Keyの取得

#### Base ID取得

1. BaseのURLを確認: `https://airtable.com/appXXXXXXXXXXXXXX/...`
2. `appXXXXXXXXXXXXXX` の部分がBase ID
3. コピーして保存

#### API Key取得

1. https://airtable.com/create/tokens にアクセス
2. 「Create new token」をクリック
3. Token name: `yosou-keiba-matome`
4. Scopes:
   - `data.records:read`
   - `data.records:write`
5. Access: 先ほど作成したBaseを選択
6. 「Create token」をクリック
7. 表示されたトークンをコピー（一度しか表示されない）

### Step 7: 環境変数設定

#### ローカル開発環境

```bash
cd packages/yosou-keiba-matome
cp .env.example .env
```

`.env`ファイルを編集：
```bash
AIRTABLE_API_KEY=patXXXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXXXXX
SITE_URL=http://localhost:4325
```

#### Netlify本番環境（将来）

Netlify管理画面で以下の環境変数を設定：
```bash
YOSOU_KEIBA_AIRTABLE_API_KEY=patXXXXXXXXXXXXXXXX
YOSOU_KEIBA_AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXXXXX
SITE_URL=https://yosou.keiba-matome.jp
```

---

## 次のステップ

1. ✅ Airtable Base作成完了
2. [ ] サンプルデータ投入スクリプト作成
3. [ ] 2ch風コメント自動生成スクリプト作成
4. [ ] スクレイピングスクリプト作成（中央重賞予想）
5. [ ] スクレイピングスクリプト作成（南関重賞予想）

---

## トラブルシューティング

### API Keyが無効

- トークンの有効期限を確認
- Scopesが正しく設定されているか確認
- Base Accessが正しく設定されているか確認

### Base IDが見つからない

- BaseのURLを確認
- `app` で始まる17文字の文字列

### フィールドタイプが違う

- Airtableで該当フィールドを右クリック
- 「Customize field type」でタイプを変更

---

## 参照

- [Airtable API Documentation](https://airtable.com/developers/web/api/introduction)
- [Airtable Personal Access Tokens](https://airtable.com/create/tokens)
