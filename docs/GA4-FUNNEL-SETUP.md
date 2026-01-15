# GA4ファネル設定ガイド - サイト間導線の効果測定

## 📊 概要

このガイドでは、3サイト（keiba-matome、chihou-keiba-matome、yosou-keiba-matome）からnankan-analyticsへの導線効果を測定するためのGA4ファネル設定方法を説明します。

**目的**:
- サイト間の遷移率を測定
- nankan-analyticsへの導線効果を可視化
- データドリブンな改善サイクルの確立

---

## 🎯 トラッキングされるイベント

### 自動トラッキング済みイベント

実装済みのイベントトラッキング（`/scripts/ga4-tracking.js`）により、以下が自動的に記録されます：

| イベント名 | 説明 | パラメータ |
|-----------|------|-----------|
| `page_view_enhanced` | ページビュー拡張 | `site`, `page_type`, `page_path` |
| `site_transition` | サイト間遷移 | `from_site`, `to_site`, `link_url`, `link_text`, `link_location` |
| `nankan_analytics_click` | nankan-analyticsへのクリック（ゴール） | `from_site`, `link_url`, `link_text`, `link_location` |
| `external_link_click` | 外部リンククリック | `from_site`, `link_url`, `link_text` |

---

## 🔧 GA4ファネル設定手順

### ステップ1: GA4プロパティにアクセス

1. https://analytics.google.com/ にアクセス
2. 左サイドバーから「管理」（⚙️）をクリック
3. 「プロパティ」列で該当プロパティを選択

**注**: 3サイトで異なるGA4プロパティを使用している場合、それぞれで設定が必要
- keiba-matome: G-HMBYF1PJ5K
- chihou-keiba-matome: G-T7M1X0XGDP
- yosou-keiba-matome: G-K7N8XDHHQJ

---

### ステップ2: カスタムイベントの確認

1. 左サイドバーから「レポート」→「エンゲージメント」→「イベント」をクリック
2. 以下のイベントが表示されるか確認（デプロイ後24時間以内に表示されます）
   - ✅ `site_transition`
   - ✅ `nankan_analytics_click`
   - ✅ `page_view_enhanced`

**まだ表示されない場合**:
- デプロイが完了しているか確認
- サイトにアクセスしてテスト（リンクをクリック）
- 数時間待つ（GA4はリアルタイムではない）

---

### ステップ3: ファネルデータ探索の作成

#### 3-1. 探索レポートを作成

1. 左サイドバーから「探索」をクリック
2. 「空白」テンプレートを選択
3. レポート名を「サイト間ファネル分析」に変更

#### 3-2. ファネルを設定

1. **手法**セクションで「ファネルデータ探索」を選択
2. **ステップを追加**:

**ファネル1: keiba-matome → nankan-analytics**
```
ステップ1: keiba-matome訪問
  - イベント名: page_view_enhanced
  - パラメータ: site = keiba-matome

ステップ2: サイト間遷移
  - イベント名: site_transition
  - パラメータ: from_site = keiba-matome

ステップ3: nankan-analyticsクリック（ゴール）
  - イベント名: nankan_analytics_click
  - パラメータ: from_site = keiba-matome
```

**ファネル2: chihou-keiba-matome → nankan-analytics**
```
ステップ1: chihou-keiba-matome訪問
  - イベント名: page_view_enhanced
  - パラメータ: site = chihou-keiba-matome

ステップ2: nankan-analyticsクリック（ゴール）
  - イベント名: nankan_analytics_click
  - パラメータ: from_site = chihou-keiba-matome
```

**ファネル3: yosou-keiba-matome → nankan-analytics**
```
ステップ1: yosou-keiba-matome訪問
  - イベント名: page_view_enhanced
  - パラメータ: site = yosou-keiba-matome

ステップ2: nankan-analyticsクリック（ゴール）
  - イベント名: nankan_analytics_click
  - パラメータ: from_site = yosou-keiba-matome
```

#### 3-3. 内訳ディメンションを追加

1. **内訳**セクションで以下を追加:
   - `link_location` (どこからクリックされたか: comment, sidebar, article等)
   - `link_text` (リンクテキスト)
   - `page_type` (ページタイプ: top, article等)

2. **保存**をクリック

---

### ステップ4: コンバージョン設定

1. 「管理」→「プロパティ」→「イベント」をクリック
2. `nankan_analytics_click` を見つける
3. 「コンバージョンとしてマーク」をオンにする

**効果**:
- GA4のコンバージョンレポートで確認可能
- 広告効果測定に利用可能

---

## 📊 データの見方

### KPI一覧

| KPI | 計算方法 | 目標値（Month 6） |
|-----|---------|------------------|
| **訪問者数** | GA4 ユーザー数 | 2,300-3,700/月（3サイト合計） |
| **nankan-analytics遷移率** | nankan_analytics_click / page_view | 5-10% |
| **サイト間遷移率** | site_transition / page_view | 10-20% |
| **コメント内リンククリック率** | link_location=comment / 全クリック | 30-50% |

### 分析方法

#### 1. 全体のファネル効率

```
例: chihou-keiba-matome → nankan-analytics

訪問者: 1,000人
  ↓
nankan-analyticsクリック: 50人（5%）
  ↓
最終ゴール（nankan-analyticsで登録）: ?人

改善ポイント:
- 5%が低い場合 → CTA配置を改善、コメント内導線を増やす
- 5%が高い場合 → 成功パターンを他サイトに展開
```

#### 2. リンク配置別の効果

```
link_location別のクリック率:
- comment（コメント内）: 60%
- sidebar（サイドバー）: 20%
- article（記事内）: 15%
- other: 5%

改善ポイント:
- commentが高い → コメント内導線を強化
- sidebarが低い → サイドバーCTAを改善
```

#### 3. サイト別の比較

```
サイト別nankan-analytics遷移率:
- chihou-keiba-matome: 8%（南関特化なので高い）
- keiba-matome: 3%（総合なので低い）
- yosou-keiba-matome: 12%（予想サイトなので最も高い）

改善ポイント:
- yosou-keiba-matomeの成功パターンを分析
- keiba-matomeの導線を改善
```

---

## 🔍 リアルタイムで確認する方法

### GA4リアルタイムレポート

1. 左サイドバーから「レポート」→「リアルタイム」をクリック
2. 「イベント名でカウント」を選択
3. サイトでリンクをクリックしてテスト
4. 数秒後に `site_transition` または `nankan_analytics_click` が表示される

**確認ポイント**:
- ✅ イベントが正しく記録されているか
- ✅ パラメータ（from_site, to_site等）が正しいか
- ✅ link_locationが正しく判定されているか

---

## 📈 週次レポート確認手順（5分）

### 毎週月曜にチェック

```bash
# 1. GA4にアクセス
https://analytics.google.com/

# 2. 以下を確認
□ 訪問者数（過去7日）: ?人
□ nankan-analyticsクリック数: ?回
□ 遷移率: ?%
□ 前週比: +?% or -?%

# 3. 異常値チェック
- 訪問者数が50%以上減少 → 原因調査
- 遷移率が大幅に低下 → 導線が壊れていないか確認
- nankan-analyticsクリックが0 → イベントトラッキングが壊れていないか確認
```

---

## 🛠️ トラブルシューティング

### イベントが記録されない

**症状**: GA4でイベントが表示されない

**原因と解決策**:
1. **デプロイされていない**
   - GitHub Actionsを確認
   - Netlifyデプロイを確認
   - `/scripts/ga4-tracking.js` が配信されているか確認

2. **スクリプトエラー**
   - ブラウザの開発者ツール（F12）→ Consoleを確認
   - `[GA4 Event]` ログが出ているか確認
   - エラーが出ていないか確認

3. **GA4が読み込まれていない**
   - ブラウザの開発者ツール → Networkタブ
   - `gtag/js` がロードされているか確認
   - AdBlockが有効になっていないか確認

### パラメータが正しく記録されない

**症状**: イベントは記録されるが、パラメータ（from_site等）が空

**原因と解決策**:
1. **スクリプトのバグ**
   - `/scripts/ga4-tracking.js` を確認
   - `getSiteType()` 関数が正しくURLを判定しているか

2. **GA4のカスタムディメンション未設定**
   - 「管理」→「カスタム定義」→「カスタムディメンションを作成」
   - イベントパラメータを追加（from_site, to_site, link_location等）

---

## 📚 参考リンク

- **GA4公式ドキュメント**: https://support.google.com/analytics/
- **ファネルデータ探索**: https://support.google.com/analytics/answer/9327974
- **イベントトラッキング**: https://developers.google.com/analytics/devguides/collection/ga4/events

---

## ✅ チェックリスト

実装完了後、以下を確認:

- [ ] 3サイトすべてにイベントトラッキングスクリプトが追加されている
- [ ] デプロイが完了している
- [ ] GA4でイベントが記録されている（24時間後に確認）
- [ ] ファネルデータ探索を作成した
- [ ] nankan_analytics_clickをコンバージョンとしてマークした
- [ ] 週次レポート確認をカレンダーに追加した

---

**最終更新**: 2026-01-15
**作成者**: @apol0510
