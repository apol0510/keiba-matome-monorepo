# Netlifyデプロイガイド - yosou-keiba-matome

## 🚀 デプロイ手順

### 1. Netlifyサイト作成

#### Option A: Netlify CLI（推奨）

```bash
# packages/yosou-keiba-matome ディレクトリで実行
cd packages/yosou-keiba-matome

# Netlify CLI インストール（未インストールの場合）
npm install -g netlify-cli

# Netlifyにログイン
netlify login

# サイト作成
netlify init
```

**設定値**:
- Team: あなたのチーム
- Site name: `yosou-keiba-matome`（または任意）
- Build command: `npm run build`
- Publish directory: `dist`

#### Option B: Netlify Web UI

1. https://app.netlify.com/ にアクセス
2. "Add new site" > "Import an existing project"
3. GitHub連携
4. リポジトリ: `apol0510/keiba-matome-monorepo`
5. Base directory: `packages/yosou-keiba-matome`
6. Build command: `npm run build`
7. Publish directory: `dist`

---

### 2. 環境変数設定

Netlify Dashboard > Site settings > Environment variables で設定

#### 必須の環境変数

```
AIRTABLE_API_KEY
```
- 値: （Airtable Personal Access Token）
- スコープ: data.records:read, data.records:write

```
AIRTABLE_BASE_ID
```
- 値: `appKPasSpjpTtabnv`

---

### 3. Build Hook作成

自動デプロイ用のBuild Hookを作成します。

1. Netlify Dashboard > Site settings > Build & deploy > Build hooks
2. "Add build hook" クリック
3. Build hook name: `yosou-keiba-matome-daily`
4. Branch to build: `main`
5. "Save" クリック
6. 生成されたURLをコピー（例: `https://api.netlify.com/build_hooks/xxxxx`）

#### GitHub Secretに保存

```bash
gh secret set YOSOU_KEIBA_NETLIFY_BUILD_HOOK \
  --body "https://api.netlify.com/build_hooks/xxxxx" \
  --repo apol0510/keiba-matome-monorepo
```

---

### 4. カスタムドメイン設定

#### サブドメイン: yosou.keiba-matome.jp

1. Netlify Dashboard > Domain management > Add custom domain
2. ドメイン名: `yosou.keiba-matome.jp`
3. DNSレコード設定（お名前.comなど）

**Aレコード（推奨）**:
```
yosou.keiba-matome.jp  A  75.2.60.5
```

**または CNAMEレコード**:
```
yosou  CNAME  yosou-keiba-matome.netlify.app
```

4. SSL/TLS証明書（Let's Encrypt）を有効化
   - Netlify > Domain management > HTTPS > Verify DNS configuration
   - 自動で証明書が発行されます

---

### 5. デプロイ確認

#### 初回デプロイ

```bash
# ローカルでビルドテスト
npm run build

# Netlifyにデプロイ
netlify deploy --prod
```

#### 自動デプロイテスト

GitHub Actionsで自動デプロイが動作するか確認：

```bash
# 手動実行
gh workflow run "Yosou Nankan Daily (南関メインレース予想)" \
  --repo apol0510/keiba-matome-monorepo
```

実行後、Netlify Dashboard > Deploys で自動デプロイが開始されたことを確認。

---

## 🔧 トラブルシューティング

### ビルドエラー: "Command failed"

**原因**: 依存関係のインストール失敗

**解決策**:
1. `package-lock.json` が存在することを確認
2. Netlify > Site settings > Build & deploy > Build settings
3. Build command を以下に変更:
   ```
   cd ../.. && npm install && cd packages/yosou-keiba-matome && npm run build
   ```

### 環境変数が反映されない

**原因**: ビルド時に環境変数が読み込まれていない

**解決策**:
1. Netlify > Environment variables で設定を確認
2. 変数名が正確か確認（大文字小文字区別）
3. 再デプロイ: Netlify > Deploys > Trigger deploy > Clear cache and deploy site

### カスタムドメインが反映されない

**原因**: DNS伝播に時間がかかっている

**解決策**:
1. DNS設定を確認（AレコードまたはCNAMEレコード）
2. 24-48時間待つ（DNS伝播）
3. `dig yosou.keiba-matome.jp` で確認

---

## 📊 デプロイ後の確認項目

### 必須チェック

- [ ] サイトが正常に表示される（https://yosou.keiba-matome.jp）
- [ ] トップページに記事が表示される
- [ ] 詳細ページが正常に動作する
- [ ] SSL/TLS証明書が有効（鍵マーク）
- [ ] モバイルでも正常に表示される

### パフォーマンスチェック

- [ ] Lighthouse スコア（90点以上推奨）
- [ ] ページ読み込み速度（3秒以内）
- [ ] CDNキャッシュが動作している

### SEOチェック

- [ ] `robots.txt` が正常
- [ ] `sitemap.xml` が生成されている
- [ ] OGP画像が表示される
- [ ] 構造化データが正常（Google Rich Results Test）

---

## 🔄 継続的デプロイ

### 自動デプロイフロー

1. **GitHub Actions実行**（毎週月〜金 朝6時）
   - nankan-analyticsから予想取得
   - Airtableに投稿
   - 2ch風コメント生成

2. **Build Hook トリガー**
   - GitHub ActionsからNetlify Build Hookを呼び出し
   - Netlifyが自動的にビルド＆デプロイ

3. **CDNキャッシュ更新**
   - 新しいコンテンツが全世界に配信される

### デプロイ通知

Discord通知を設定している場合、以下のタイミングで通知が届きます：
- GitHub Actions成功/失敗
- Netlifyデプロイ完了

---

## 📈 次のステップ

1. [ ] Google Search Consoleに登録
2. [ ] Google Analyticsを設定
3. [ ] サイトマップを送信
4. [ ] パフォーマンス監視（Lighthouse CI）
5. [ ] エラーログ監視（Sentry）

---

## 参考リンク

- **Netlify Dashboard**: https://app.netlify.com/
- **Netlify CLI Docs**: https://docs.netlify.com/cli/get-started/
- **Astro Netlify Adapter**: https://docs.astro.build/en/guides/deploy/netlify/
