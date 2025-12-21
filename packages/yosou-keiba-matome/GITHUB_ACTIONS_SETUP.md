# GitHub Actions セットアップガイド

## 必要なGitHub Secrets

yosou-keiba-matomeの自動化には、以下のGitHub Secretsが必要です。

### リポジトリ設定 > Secrets and variables > Actions で設定

#### 1. Airtable関連

```
YOSOU_KEIBA_AIRTABLE_API_KEY
```
- **値**: `patXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **説明**: yosou-keiba-matome用のAirtable APIキー
- **取得場所**: Airtable > Settings > Personal access tokens

```
YOSOU_KEIBA_AIRTABLE_BASE_ID
```
- **値**: `appKPasSpjpTtabnv`
- **説明**: yosou-keiba-matome用のAirtable Base ID
- **取得場所**: Airtable > Base URL（appから始まる文字列）

#### 2. Claude API関連

```
ANTHROPIC_API_KEY
```
- **値**: （既存のkeiba-matome、chihou-keiba-matomeと共通）
- **説明**: Claude API（2ch風コメント生成用）

#### 3. GitHub Personal Access Token（プライベートリポジトリの場合のみ）

```
GH_PAT
```
- **値**: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **説明**: nankan-analyticsリポジトリへのアクセス用
- **スコープ**: `repo`（フルアクセス）

**作成方法**:
1. GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. "Generate new token (classic)"
3. スコープ: `repo` にチェック
4. トークンをコピーしてGitHub Secretsに保存

#### 4. Netlify関連（オプション）

```
YOSOU_KEIBA_NETLIFY_BUILD_HOOK
```
- **値**: `https://api.netlify.com/build_hooks/xxxxxxxxxxxxx`
- **説明**: Netlify自動デプロイ用Build Hook URL
- **未設定の場合**: デプロイはスキップされます

#### 5. Discord通知（オプション）

```
DISCORD_WEBHOOK_URL
```
- **値**: （既存のkeiba-matome、chihou-keiba-matomeと共通）
- **説明**: Discord Webhook URL（実行結果通知用）

---

## ワークフロー実行スケジュール

### `.github/workflows/yosou-nankan-daily.yml`

**実行タイミング**:
- **毎週月〜金 朝6時（JST）**
- Cron: `0 21 * * 0-4` （UTC 21時 = JST 6時）

**処理内容**:
1. keiba-matome-monorepoをチェックアウト
2. nankan-analyticsをチェックアウト
3. 依存関係インストール
4. nankan-analyticsのallRacesPrediction.jsonを確認
5. メインレース予想をAirtableに投稿
6. 2ch風コメント自動生成（15-35件/記事）
7. Netlify自動デプロイトリガー
8. Discord通知

**手動実行**:
- GitHub > Actions > "Yosou Nankan Daily" > Run workflow
- オプション: `skip_comments: true`（コメント生成をスキップ）

---

## トラブルシューティング

### エラー: nankan-analyticsのチェックアウトに失敗

**原因**: nankan-analyticsがプライベートリポジトリで、GH_PATが設定されていない

**解決策**:
1. GitHub Personal Access Tokenを作成（スコープ: `repo`）
2. GitHub Secrets に `GH_PAT` として保存

### エラー: Airtableへの保存に失敗

**原因**: YOSOU_KEIBA_AIRTABLE_API_KEY または YOSOU_KEIBA_AIRTABLE_BASE_ID が間違っている

**解決策**:
1. Airtableの設定を確認
2. GitHub Secretsの値を再確認

### エラー: コメント生成に失敗

**原因**: ANTHROPIC_API_KEYが間違っているか、APIクォータ超過

**解決策**:
1. Claude APIの利用状況を確認
2. 必要に応じて手動実行時に `skip_comments: true` を指定

---

## 確認方法

### 1. GitHub Actionsログを確認

```
GitHub > Actions > "Yosou Nankan Daily" > 最新の実行
```

成功時のログ例:
```
✅ nankan-analyticsのデータファイルを確認
✅ 記事を投稿しました: 【浦和 11R】師走
✅ コメントを16件生成しました
🚀 Netlifyへのデプロイをトリガー中...
✅ デプロイリクエスト送信完了
```

### 2. Airtableで記事を確認

https://airtable.com/appKPasSpjpTtabnv/tblXXXXXXXXXXXXX

- Status: `published`
- CommentCount: 15-35件

### 3. サイトで確認（Netlifyデプロイ後）

https://yosou.keiba-matome.jp/

---

## 注意事項

- nankan-analyticsの予想データは**前日23時までに更新**されている必要があります
- メインレース予想がない日は自動的にスキップされます
- GitHub Actions の無料枠: 月2,000分まで（通常は十分）
- Claude API の利用状況に注意（コメント生成でトークンを消費）

---

## 次のステップ

1. [ ] GitHub Secretsを設定
2. [ ] 手動実行でテスト（Run workflow）
3. [ ] ログを確認
4. [ ] Airtableで記事確認
5. [ ] Netlifyデプロイ設定（オプション）
6. [ ] Discord通知設定（オプション）
