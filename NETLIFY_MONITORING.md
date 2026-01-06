# Netlifyデプロイ失敗通知の設定

Netlifyデプロイが失敗した際にDiscordへ通知を送る設定です。

---

## 🎯 推奨方法: Netlify管理画面で設定（5分）

**メリット**:
- ✅ 設定が簡単（追加のSecrets不要）
- ✅ Netlify公式機能で安定動作
- ✅ 3サイト × 1分 = 3分で完了

### 手順

#### 1. Discord Webhook URLを確認

既存のWebhook URL:
```bash
# .envファイルから確認
grep DISCORD_WEBHOOK packages/keiba-matome/.env
```

または、新しいWebhookを作成:
1. Discordサーバー → チャンネル設定（⚙️）
2. 連携サービス → ウェブフック
3. 「新しいウェブフック」→ 名前: `Netlify通知`
4. **ウェブフックURLをコピー**

例: `https://discord.com/api/webhooks/1234567890/ABCDEFG...`

---

#### 2. 各サイトで通知設定（3回繰り返し）

**keiba-matome.jp**:
1. https://app.netlify.com にログイン
2. **keiba-matome** サイトを選択
3. **Site settings** → **Build & deploy** → **Deploy notifications**
4. **Add notification** → **Outgoing webhook**
5. 以下を入力:
   - **Event to listen for**: `Deploy failed`
   - **URL to notify**: `https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN`
   - **JWS secret**: 空欄でOK
6. **Save**

**chihou.keiba-matome.jp**:
- 上記と同じ手順

**yosou.keiba-matome.jp**:
- 上記と同じ手順

---

#### 3. テスト（オプション）

通知が届くかテストしたい場合:
1. Netlify管理画面 → サイト選択 → **Deploys**
2. **Trigger deploy**
3. 意図的にビルドを失敗させる（例: netlify.tomlのpublishパスを間違える）
4. Discord通知が届くか確認
5. 設定を元に戻す

---

## 通知の例

デプロイ失敗時、Discordに以下のような通知が届きます:

```
🚨 Deploy Failed - keiba-matome

Deploy ID: 507f1f77bcf86cd799439011
Error: Build script returned non-zero exit code: 1
Created: 2026-01-06T10:30:00.000Z
```

---

## 🤖 高度な方法: GitHub Actionsで自動監視（オプション）

**メリット**:
- ✅ より詳細な通知内容
- ✅ カスタマイズ可能
- ✅ デプロイ成功通知も可能

**デメリット**:
- ❌ 設定が複雑
- ❌ 追加のSecrets設定が必要
- ❌ GitHub Actions実行時間が長くなる

### 必要な準備

#### 1. Netlify Personal Access Tokenを取得

1. Netlify管理画面 → **User settings**（右上のアバター）
2. **Applications** → **Personal access tokens**
3. **New access token** → Description: `GitHub Actions monitoring`
4. トークンをコピー（一度しか表示されない）

#### 2. 各サイトのSite IDを取得

各サイトで:
1. Site settings → **General** → **Site details**
2. **Site ID** をコピー

例: `507f1f77-bcf8-6cd7-9943-9011abc12345`

#### 3. GitHub Secretsに登録

```bash
# setup-netlify-monitoring.sh を実行
chmod +x setup-netlify-monitoring.sh
./setup-netlify-monitoring.sh
```

または、手動で設定:
```bash
gh secret set NETLIFY_AUTH_TOKEN --body "YOUR_TOKEN"
gh secret set KEIBA_MATOME_SITE_ID --body "YOUR_SITE_ID"
gh secret set CHIHOU_KEIBA_SITE_ID --body "YOUR_SITE_ID"
gh secret set YOSOU_KEIBA_SITE_ID --body "YOUR_SITE_ID"
```

#### 4. GitHub Actionsワークフローに追加

`netlify-monitoring-example.yml` を参照して、既存のワークフローに監視ステップを追加してください。

---

## トラブルシューティング

### 通知が届かない

**Netlify管理画面設定の場合**:
1. Discord Webhook URLが正しいか確認
2. `Deploy failed` イベントが選択されているか確認
3. Netlifyでデプロイを手動でトリガーしてテスト

**GitHub Actions設定の場合**:
1. GitHub Secretsが正しく設定されているか確認
2. NETLIFY_AUTH_TOKENが有効か確認
3. Site IDが正しいか確認

### 通知が多すぎる

Netlify管理画面で不要なイベントを削除:
1. Site settings → Build & deploy → Deploy notifications
2. 不要な通知を **Delete**

---

## 参照

- 監視スクリプト: `packages/shared/scripts/monitor-netlify-deploy.cjs`
- 設定スクリプト: `setup-netlify-monitoring.sh`
- ワークフロー例: `.github/workflows/netlify-monitoring-example.yml`
