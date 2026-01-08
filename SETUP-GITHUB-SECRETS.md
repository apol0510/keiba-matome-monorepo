# GitHub Secrets設定手順（monorepo統合版）

## 概要

**10サイト以上に拡大しても保守コストが増えない設計**

従来の設計では、10サイトに拡大すると60個のSecretsが必要でしたが、新設計では**わずか5個**で済みます。

| 項目 | 必要な実体数 | 従来設計（Secrets数） | 新設計（Secrets数） |
|------|------------|---------------------|-------------------|
| Airtable API Keys | **1個**のトークン | 10個のSecrets | **1個**のSecret |
| **X DEV アカウント** | **10個**のアカウント | 40個のSecrets（4認証情報×10） | **1個**のSecret（JSON形式） |
| Netlify Build Hooks | 10個のHook | 10個のSecrets | 10個のSecrets |
| **合計** | - | **60個** | **12個** |

**重要**:
- X DEV APIは1サイト1アカウント必須 → **10サイトなら10個のX DEVアカウントが必要**
- 新設計では、10個のアカウント情報を1つのJSON Secretにまとめることで、GitHub Secretsの管理を簡素化
- 各サイトは実行時に自分専用の認証情報のみを使用（他サイトの認証情報にはアクセスしない）

---

## 必要なGitHub Secrets（5個のみ）

### 1. AIRTABLE_API_KEY

**全プロジェクト共通**のAirtable Personal Access Token

#### 取得方法

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
6. トークンをコピー

#### GitHub Secretsに設定

```bash
gh secret set AIRTABLE_API_KEY --body "patXXXXXXXXXXXXXX..."
```

---

### 2. ANTHROPIC_API_KEY

Claude APIのAPI Key

#### 取得方法

1. https://console.anthropic.com/ にアクセス
2. API Keys → Create Key
3. キーをコピー

#### GitHub Secretsに設定

```bash
gh secret set ANTHROPIC_API_KEY --body "sk-ant-api03-XXXXXXXXX..."
```

---

### 3. X_CREDENTIALS_JSON

**全サイトのX API認証情報を1つのJSONにまとめる**

#### JSON形式

```json
{
  "KEIBA_MATOME_X": {
    "apiKey": "YOUR_KEIBA_MATOME_API_KEY",
    "apiSecret": "YOUR_KEIBA_MATOME_API_SECRET",
    "accessToken": "YOUR_KEIBA_MATOME_ACCESS_TOKEN",
    "accessSecret": "YOUR_KEIBA_MATOME_ACCESS_SECRET"
  },
  "CHIHOU_X": {
    "apiKey": "YOUR_CHIHOU_API_KEY",
    "apiSecret": "YOUR_CHIHOU_API_SECRET",
    "accessToken": "YOUR_CHIHOU_ACCESS_TOKEN",
    "accessSecret": "YOUR_CHIHOU_ACCESS_SECRET"
  },
  "YOSOU_X": {
    "apiKey": "YOUR_YOSOU_API_KEY",
    "apiSecret": "YOUR_YOSOU_API_SECRET",
    "accessToken": "YOUR_YOSOU_ACCESS_TOKEN",
    "accessSecret": "YOUR_YOSOU_ACCESS_SECRET"
  }
}
```

#### 取得方法（各アカウント）

1. https://developer.twitter.com/ にアクセス
2. Projects & Apps → 各プロジェクトのKeys and tokensを確認
3. API Key and Secret、Access Token and Secretをコピー

#### GitHub Secretsに設定

**重要**: JSON形式を**1行**にしてから設定

```bash
# JSON作成（x-credentials.json）
cat > x-credentials.json << 'EOF'
{"KEIBA_MATOME_X":{"apiKey":"xxx","apiSecret":"xxx","accessToken":"xxx","accessSecret":"xxx"},"CHIHOU_X":{"apiKey":"xxx","apiSecret":"xxx","accessToken":"xxx","accessSecret":"xxx"},"YOSOU_X":{"apiKey":"xxx","apiSecret":"xxx","accessToken":"xxx","accessSecret":"xxx"}}
EOF

# GitHub Secretsに設定
gh secret set X_CREDENTIALS_JSON < x-credentials.json

# ファイル削除（セキュリティ）
rm x-credentials.json
```

---

### 4. DISCORD_WEBHOOK_URL（オプション）

監視システムの通知先Discord Webhook URL

#### 取得方法

1. Discord サーバー設定 → 連携サービス → ウェブフック
2. ウェブフックを作成
3. URLをコピー

#### GitHub Secretsに設定

```bash
gh secret set DISCORD_WEBHOOK_URL --body "https://discord.com/api/webhooks/..."
```

---

### 5. Netlify Build Hooks（サイトごと、3個）

各サイトのNetlify Build Hook URL

#### 取得方法

1. Netlify → Site Settings → Build & deploy → Build hooks
2. Build hookを作成（名前: `GitHub Actions`）
3. URLをコピー

#### GitHub Secretsに設定

```bash
gh secret set KEIBA_MATOME_NETLIFY_BUILD_HOOK --body "https://api.netlify.com/build_hooks/..."
gh secret set CHIHOU_KEIBA_NETLIFY_BUILD_HOOK --body "https://api.netlify.com/build_hooks/..."
gh secret set YOSOU_KEIBA_NETLIFY_BUILD_HOOK --body "https://api.netlify.com/build_hooks/..."
```

---

## 設定確認

すべてのSecretsが設定されているか確認：

```bash
gh secret list
```

期待される出力：

```
AIRTABLE_API_KEY                 2025-01-09T12:00:00Z
ANTHROPIC_API_KEY                2025-01-09T12:00:00Z
X_CREDENTIALS_JSON               2025-01-09T12:00:00Z
DISCORD_WEBHOOK_URL              2025-01-09T12:00:00Z
KEIBA_MATOME_NETLIFY_BUILD_HOOK  2025-01-09T12:00:00Z
CHIHOU_KEIBA_NETLIFY_BUILD_HOOK  2025-01-09T12:00:00Z
YOSOU_KEIBA_NETLIFY_BUILD_HOOK   2025-01-09T12:00:00Z
```

---

## 新しいサイトを追加する場合

### 必要な作業（わずか3ステップ）

1. **sites-config.jsonに追加**
   ```json
   "new-site": {
     "name": "新サイト",
     "airtableBaseId": "appXXXXXXXXXX",
     "xCredentialKey": "NEW_SITE_X",
     ...
   }
   ```

2. **X_CREDENTIALS_JSONに認証情報追加**
   ```bash
   # 既存のJSONを取得
   gh secret get X_CREDENTIALS_JSON

   # "NEW_SITE_X": {...} を追加してから再設定
   gh secret set X_CREDENTIALS_JSON --body '{...}'
   ```

3. **Netlify Build Hook追加**
   ```bash
   gh secret set NEW_SITE_NETLIFY_BUILD_HOOK --body "https://..."
   ```

**それだけです！** ワークフローファイルの修正は不要。

---

## 旧設計からの移行

### 削除するSecrets（不要になったもの）

```bash
# プロジェクト固有のAirtable API Keys
gh secret delete KEIBA_MATOME_AIRTABLE_API_KEY
gh secret delete CHIHOU_KEIBA_AIRTABLE_API_KEY
gh secret delete YOSOU_KEIBA_AIRTABLE_API_KEY

# プロジェクト固有のX API Keys
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

## トラブルシューティング

### X_CREDENTIALS_JSONのパースエラー

- JSONの改行を削除してください
- ダブルクォート`"`をエスケープしないでください
- `jq`で検証: `echo '$X_CREDENTIALS_JSON' | jq`

### Airtable API Keyのアクセス権限エラー

- Airtableの設定で、すべてのBase（3つ）にアクセス権限が付与されているか確認
- Scopesに`data.records:read`, `data.records:write`, `schema.bases:read`が含まれているか確認

---

## まとめ

**新設計の利点：**
- ✅ 10サイトでも**わずか12個のSecrets**
- ✅ 新サイト追加が**3ステップ**で完了
- ✅ ワークフローファイルの重複なし
- ✅ 長期運用・量産に最適

**旧設計の問題点：**
- ❌ 10サイトで**60個のSecrets**
- ❌ 新サイト追加に**6個のSecrets + ワークフローファイルコピペ**
- ❌ 保守コストが線形に増加
