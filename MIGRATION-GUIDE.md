# monorepo統合版への移行ガイド

## 概要

**10サイト以上に拡大しても保守コストが増えない設計**に移行します。

| 項目 | 旧設計 | 新設計 |
|------|-------|--------|
| ワークフローファイル数 | 6個（サイトごと） | **2個**（統合） |
| GitHub Secrets数 | 18個（3サイト） | **7個** |
| 10サイト時のSecrets数 | 60個 | **12個** |
| 新サイト追加の手間 | ワークフローコピペ + 6個のSecrets | **sites-config.json編集 + 2個のSecrets** |

---

## 移行手順

### ステップ1: Airtableで新トークン作成

1. https://airtable.com/create/tokens にアクセス
2. 「Create new token」をクリック
3. Token名: `keiba-matome-monorepo`
4. **Scopes**を選択：
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
5. **Access**で3つのBaseすべてを選択：
   - `appdHJSC4F9pTIoDj`（keiba-matome）
   - `appt25zmKxQDiSCwh`（chihou-keiba-matome）
   - `appKPasSpjpTtabnv`（yosou-keiba-matome）
6. トークンをコピー（後で使用）

---

### ステップ2: GitHub Secrets設定

**方法A: 自動設定スクリプト（推奨）**

```bash
bash setup-github-secrets.sh
```

スクリプトが対話的にすべてのSecretsを設定します。

**方法B: 手動設定**

SETUP-GITHUB-SECRETS.mdの手順に従って設定してください。

---

### ステップ3: 旧Secretsの削除

新しいSecretsが正常に動作確認できたら、旧Secretsを削除：

```bash
# プロジェクト固有のAirtable API Keys（不要）
gh secret delete KEIBA_MATOME_AIRTABLE_API_KEY
gh secret delete CHIHOU_KEIBA_AIRTABLE_API_KEY
gh secret delete YOSOU_KEIBA_AIRTABLE_API_KEY

# プロジェクト固有のBase IDs（不要、sites-config.jsonで管理）
gh secret delete KEIBA_MATOME_AIRTABLE_BASE_ID
gh secret delete CHIHOU_KEIBA_AIRTABLE_BASE_ID
gh secret delete YOSOU_KEIBA_AIRTABLE_BASE_ID

# プロジェクト固有のX API Keys（不要、X_CREDENTIALS_JSONに統合）
gh secret delete KEIBA_MATOME_X_API_KEY
gh secret delete KEIBA_MATOME_X_API_SECRET
gh secret delete KEIBA_MATOME_X_ACCESS_TOKEN
gh secret delete KEIBA_MATOME_X_ACCESS_SECRET

gh secret delete CHIHOU_X_API_KEY
gh secret delete CHIHOU_X_API_SECRET
gh secret delete CHIHOU_X_ACCESS_TOKEN
gh secret delete CHIHOU_X_ACCESS_SECRET

gh secret delete YOSOU_X_API_KEY
gh secret delete YOSOU_X_API_SECRET
gh secret delete YOSOU_X_ACCESS_TOKEN
gh secret delete YOSOU_X_ACCESS_SECRET
```

---

### ステップ4: 動作確認

#### ローカルテスト

```bash
# 環境変数を読み込む
source .env

# keiba-matomeのワークフローをテスト
node packages/shared/scripts/run-workflow.cjs \
  --site=keiba-matome \
  --workflow=daily

# chihou-keiba-matomeのワークフローをテスト
node packages/shared/scripts/run-workflow.cjs \
  --site=chihou-keiba-matome \
  --workflow=daily

# yosou-keiba-matomeのワークフローをテスト（南関）
node packages/shared/scripts/run-workflow.cjs \
  --site=yosou-keiba-matome \
  --workflow=nankan-daily
```

#### GitHub Actions手動実行

```bash
# keiba-matomeを実行
gh workflow run unified-daily.yml --field site=keiba-matome

# chihou-keiba-matomeを実行
gh workflow run unified-daily.yml --field site=chihou-keiba-matome

# yosou-keiba-matome（南関）を実行
gh workflow run unified-yosou.yml --field workflow=nankan-daily

# yosou-keiba-matome（中央）を実行
gh workflow run unified-yosou.yml --field workflow=chuou-weekly
```

#### 実行結果の確認

```bash
# ワークフロー実行状況を確認
gh run list --workflow=unified-daily.yml

# 最新の実行ログを表示
gh run view --log
```

---

### ステップ5: 自動実行の確認

- **unified-daily.yml**: 毎日6AM/12PM/6PM JSTに自動実行
- **unified-yosou.yml**: 月〜金の6AM/12PM/6PM JST（南関）、火・金の6PM JST（中央）に自動実行

翌日の自動実行を確認してください。

---

## 新しいサイトを追加する場合

### ステップ1: Airtable Baseを作成

1. Airtableで新しいBaseを作成
2. テーブル構造をコピー（Newsテーブル、Commentsテーブル）
3. Base IDをメモ（例: `appXXXXXXXXXX`）

### ステップ2: sites-config.jsonに追加

```json
{
  "sites": {
    "existing-site-1": { ... },
    "existing-site-2": { ... },
    "new-site": {
      "name": "新サイト",
      "displayName": "新サイト表示名",
      "airtableBaseId": "appXXXXXXXXXX",
      "siteUrl": "https://new-site.example.com",
      "port": 4326,
      "xAccountHandle": "@new_site_jp",
      "xCredentialKey": "NEW_SITE_X",
      "netlifyBuildHook": "NEW_SITE_NETLIFY_BUILD_HOOK",
      "workflows": {
        "daily": {
          "schedule": ["0 21 * * *", "0 3 * * *", "0 9 * * *"],
          "scripts": [
            { "name": "scrape", "script": "scripts/scrape-news.cjs" },
            { "name": "generate-seo", "script": "../shared/scripts/generate-seo-for-new-articles.cjs", "args": ["--project=new-site"] },
            { "name": "generate-comments", "script": "../shared/scripts/generate-2ch-comments.cjs" },
            { "name": "post-to-x", "script": "scripts/post-to-x.cjs" }
          ]
        }
      }
    }
  }
}
```

### ステップ3: X_CREDENTIALS_JSONに追加

```bash
# 既存のJSONを取得
gh secret get X_CREDENTIALS_JSON > /tmp/x-creds.json

# 編集（新サイトの認証情報を追加）
# {
#   "EXISTING_SITE_1_X": { ... },
#   "EXISTING_SITE_2_X": { ... },
#   "NEW_SITE_X": {
#     "apiKey": "...",
#     "apiSecret": "...",
#     "accessToken": "...",
#     "accessSecret": "..."
#   }
# }

# 再設定
cat /tmp/x-creds.json | jq -c . | gh secret set X_CREDENTIALS_JSON --body-file -
rm /tmp/x-creds.json
```

### ステップ4: Netlify Build Hook追加

```bash
gh secret set NEW_SITE_NETLIFY_BUILD_HOOK --body "https://api.netlify.com/build_hooks/..."
```

### ステップ5: unified-daily.ymlに追加

```yaml
jobs:
  run-workflow:
    strategy:
      matrix:
        include:
          - site: keiba-matome
            workflow: daily
          - site: chihou-keiba-matome
            workflow: daily
          - site: new-site  # ← 追加
            workflow: daily
```

**それだけです！**

---

## トラブルシューティング

### ワークフローが失敗する

```bash
# ログを確認
gh run view --log

# ローカルで再現
node packages/shared/scripts/run-workflow.cjs \
  --site=<site-name> \
  --workflow=<workflow-name>
```

### X_CREDENTIALS_JSONのパースエラー

```bash
# JSONの検証
gh secret get X_CREDENTIALS_JSON | jq .

# エラーが出る場合は再設定
bash setup-github-secrets.sh
```

### Airtable API Keyのアクセス権限エラー

- Airtableの設定で、すべてのBase（3つ）にアクセス権限が付与されているか確認
- Scopesに`data.records:read`, `data.records:write`, `schema.bases:read`が含まれているか確認

---

## まとめ

**新設計の利点：**
- ✅ 10サイトでも**わずか12個のSecrets**
- ✅ 新サイト追加が**5分**で完了
- ✅ ワークフローファイルの重複なし
- ✅ 長期運用・量産に最適

**旧設計の問題点：**
- ❌ 10サイトで**60個のSecrets**
- ❌ 新サイト追加に**1時間**
- ❌ 保守コストが線形に増加
