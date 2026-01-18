# GA4イベントトラッキング設定ガイド

## 📋 概要

このガイドでは、3サイト（keiba-matome, chihou-keiba-matome, yosou-keiba-matome）のGoogle Analytics 4（GA4）イベントトラッキングを設定し、ファネル分析を実現する手順を説明します。

---

## 🎯 目的

1. **ユーザー行動の可視化**: 各サイト内でのクリック、コメント投稿などを追跡
2. **ファネル分析**: keiba-matome → chihou-keiba-matome → yosou-keiba-matome → nankan-analytics の遷移を測定
3. **収益化**: nankan-analytics へのトラフィック増加を定量的に評価

---

## 📊 GA4プロパティ情報

| サイト | GA4測定ID | 備考 |
|--------|-----------|------|
| yosou-keiba-matome | G-K7N8XDHHQJ | BaseLayout.astro:65-70で設定済み |
| chihou-keiba-matome | G-HMBYF1PJ5K | BaseLayout.astro:65-70で設定済み |
| keiba-matome | G-HMBYF1PJ5K | BaseLayout.astro:68-73で設定済み |

**⚠️ 注意**: chihou-keiba-matomeとkeiba-matomeが同じ測定IDを使用しています。ファネル分析を正確に行うには、**keiba-matome用に別のGA4プロパティを作成することを推奨**します。

---

## ステップ1: GA4プロパティの確認・作成

### 1.1 既存プロパティの確認

1. https://analytics.google.com/ にアクセス
2. 左下の「管理」をクリック
3. 「プロパティ」列で各測定IDのプロパティを確認

### 1.2 keiba-matome用の新規プロパティ作成（推奨）

1. 「管理」→「プロパティを作成」
2. プロパティ名: `競馬ニュースまとめ（中央競馬）`
3. タイムゾーン: `日本（GMT+09:00）`
4. 通貨: `日本円（JPY）`
5. 「次へ」→ ビジネス情報を入力 → 「作成」
6. データストリームを作成:
   - プラットフォーム: `ウェブ`
   - URL: `https://keiba-matome.jp`
   - ストリーム名: `keiba-matome Web`
7. **測定IDをメモ**（例: G-XXXXXXXXXX）

### 1.3 keiba-matomeのBaseLayout.astroを更新

測定IDを取得したら:

```bash
# ファイルを編集
code packages/keiba-matome/src/layouts/BaseLayout.astro
```

**編集内容** (packages/keiba-matome/src/layouts/BaseLayout.astro:68-73):

```astro
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script is:inline>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**G-XXXXXXXXXX を実際の測定IDに置き換える**

---

## ステップ2: カスタムイベントの設定

### 2.1 既存のイベントコード確認

現在、以下のイベントが実装済み:

**nankan-analytics CTAクリック** (全3サイトのBaseLayout.astro内):

```javascript
onclick="gtag('event', 'click_nankan_cta', {'placement': 'sidebar_related_sites'});"
```

### 2.2 追加推奨イベント（今後の実装）

#### A. 外部リンククリック追跡

**実装場所**: 全3サイトのBaseLayout.astro（関連サイトリンク）

**yosou-keiba-matome の例** (BaseLayout.astro:181-197):

```astro
<!-- 地方競馬ニュースまとめ -->
<a href="https://chihou.keiba-matome.jp/" target="_blank" rel="noopener"
   onclick="gtag('event', 'click_related_site', {
     'site_name': 'chihou-keiba-matome',
     'placement': 'sidebar'
   });"
   style="...">
  🏇 地方競馬ニュースまとめ
</a>

<!-- 競馬予想サイト口コミ評価 -->
<a href="https://keiba-review.jp/" target="_blank" rel="noopener"
   onclick="gtag('event', 'click_related_site', {
     'site_name': 'keiba-review',
     'placement': 'sidebar'
   });"
   style="...">
  ⭐ 競馬予想サイト口コミ評価
</a>

<!-- 競馬ニュース速報 -->
<a href="https://keiba-b.netlify.app/" target="_blank" rel="noopener"
   onclick="gtag('event', 'click_related_site', {
     'site_name': 'keiba-b',
     'placement': 'sidebar'
   });"
   style="...">
  📰 競馬ニュース速報
</a>
```

#### B. コメント投稿イベント（将来の実装）

**実装場所**: 各サイトの[slug].astro（コメント投稿フォーム）

```javascript
// コメント送信時
gtag('event', 'submit_comment', {
  'article_id': article.recordId,
  'article_category': article.Category
});
```

### 2.3 GA4でカスタムイベントを認識させる

GA4は自動的にイベントを認識しますが、明示的に定義することも可能:

1. https://analytics.google.com/ にアクセス
2. 該当プロパティを選択
3. 「管理」→「データの表示」→「イベント」
4. 「イベントを作成」をクリック
5. 以下のイベントを作成:

| イベント名 | 説明 | パラメータ |
|-----------|------|-----------|
| `click_nankan_cta` | nankan-analytics CTAクリック | `placement` (sidebar_related_sites) |
| `click_related_site` | 関連サイトリンククリック | `site_name`, `placement` |
| `submit_comment` | コメント投稿 | `article_id`, `article_category` |

---

## ステップ3: コンバージョンイベントの設定

### 3.1 nankan-analytics CTAをコンバージョンに設定

1. GA4で該当プロパティを選択
2. 「管理」→「データの表示」→「イベント」
3. `click_nankan_cta` イベントを探す
4. 右側の「コンバージョンとしてマークを付ける」をオン

**これにより**:
- コンバージョン数を「レポート」→「エンゲージメント」→「コンバージョン」で確認可能
- ファネル分析でコンバージョン地点として使用可能

---

## ステップ4: ファネル分析の設定

### 4.1 基本ファネル（サイト間遷移）

1. GA4で「探索」をクリック
2. 「ファネルデータ探索」を選択
3. ファネル名: `競馬サイト → nankan-analytics 導線`
4. ステップを以下のように設定:

#### パターンA: yosou → nankan-analytics

```
ステップ1: page_view
  - ページの場所に次を含む: yosou.keiba-matome.jp

ステップ2: click_nankan_cta
  - placement = sidebar_related_sites

ステップ3: page_view
  - ページの場所に次を含む: nankan-analytics.keiba.link
```

#### パターンB: keiba-matome → chihou → nankan-analytics

```
ステップ1: page_view
  - ページの場所に次を含む: keiba-matome.jp

ステップ2: click_related_site
  - site_name = chihou-keiba-matome

ステップ3: page_view
  - ページの場所に次を含む: chihou.keiba-matome.jp

ステップ4: click_nankan_cta
  - placement = sidebar_related_sites

ステップ5: page_view
  - ページの場所に次を含む: nankan-analytics.keiba.link
```

### 4.2 ファネルの保存とダッシュボード追加

1. 右上の「保存」をクリック
2. 名前を付けて保存: `nankan導線ファネル`
3. 「ダッシュボードに追加」を選択

---

## ステップ5: クロスドメイントラッキングの設定（重要）

現在、各サイトは独立したGA4プロパティを使用しているため、**サイト間のユーザー遷移を正確に追跡できません**。

### 5.1 推奨アプローチ（2つの選択肢）

#### オプションA: 統一GA4プロパティ（推奨）

**メリット**:
- サイト間のユーザージャーニーを完全に追跡可能
- ファネル分析が正確

**デメリット**:
- 各サイトの個別分析が少し複雑になる

**実装方法**:

1. 新規GA4プロパティを作成: `競馬まとめサイト群`
2. 全3サイトのBaseLayout.astroで同じ測定IDを使用
3. gtag.jsに `linker` パラメータを追加:

```astro
<!-- Google Analytics（全3サイト共通） -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-UNIFIED-ID"></script>
<script is:inline>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-UNIFIED-ID', {
    'linker': {
      'domains': ['keiba-matome.jp', 'chihou.keiba-matome.jp', 'yosou.keiba-matome.jp']
    }
  });
</script>
```

#### オプションB: 現状維持（個別プロパティ）

**メリット**:
- 各サイトの分析が独立
- 設定変更不要

**デメリット**:
- サイト間の遷移追跡が不正確
- ファネル分析が困難

**実装方法**: 現状維持（変更なし）

### 5.2 推奨の選択

**フェーズ1（現在）**: オプションB（現状維持）
- まずは各サイト内のイベント追跡から開始
- nankan-analytics CTAのクリック数を測定

**フェーズ2（3ヶ月後）**: オプションA（統一プロパティ）
- データが蓄積されたら、統一プロパティに移行
- より正確なファネル分析を実現

---

## ステップ6: レポートの確認方法

### 6.1 イベント発生数の確認

1. GA4で該当プロパティを選択
2. 「レポート」→「エンゲージメント」→「イベント」
3. `click_nankan_cta` の発生数を確認

### 6.2 コンバージョンの確認

1. 「レポート」→「エンゲージメント」→「コンバージョン」
2. `click_nankan_cta` のコンバージョン数を確認

### 6.3 ファネルの確認

1. 「探索」→ 保存したファネルを開く
2. 各ステップの離脱率を確認

---

## 📅 定期チェック項目（月次）

### 月初（毎月1日）

```bash
# 1. GA4で前月のイベント数を確認
# - click_nankan_cta: 目標 月100-200回
# - click_related_site: 参考値として確認

# 2. コンバージョン率を計算
# CTR = click_nankan_cta ÷ yosou-keiba-matome訪問者数

# 3. ファネルの離脱率を確認
# 改善余地があるステップを特定
```

### 改善アクション

| 指標 | 現状 | 目標 | アクション |
|------|------|------|-----------|
| nankan CTA CTR | 不明 | 5-10% | CTAの位置・デザイン改善 |
| サイト間遷移率 | 不明 | 10-20% | コメント内の導線強化 |
| ファネル完了率 | 不明 | 3-5% | 各ステップの離脱原因分析 |

---

## 🔧 トラブルシューティング

### イベントが記録されない

**原因1**: 広告ブロッカー
- 解決策: プライベートブラウジングでテスト

**原因2**: gtag.jsの読み込みエラー
- 解決策: ブラウザのコンソールでエラー確認

**原因3**: 測定IDの誤り
- 解決策: BaseLayout.astroの測定IDを再確認

### ファネルにデータが表示されない

**原因1**: データ不足
- 解決策: 最低でも1週間のデータ蓄積を待つ

**原因2**: クロスドメイントラッキング未設定
- 解決策: ステップ5の設定を確認

---

## 📊 期待される効果（3ヶ月後）

| 指標 | 目標値 | 根拠 |
|------|--------|------|
| nankan-analytics月間流入 | 100-200人 | yosou訪問者の5-10% |
| サイト間遷移率 | 10-20% | 関連サイトリンクCTR |
| ファネル完了率 | 3-5% | 業界平均の2ch風サイト |
| nankan-analyticsでのCV | 5-10人 | 流入者の5%が有料会員化と仮定 |

---

## 🎯 次のステップ

1. **今すぐ実行**:
   - [ ] ステップ1: keiba-matome用GA4プロパティ作成
   - [ ] ステップ2: カスタムイベント確認
   - [ ] ステップ3: コンバージョン設定

2. **1週間後**:
   - [ ] イベント発生数の確認
   - [ ] 初期データの分析

3. **1ヶ月後**:
   - [ ] ファネル分析の実施
   - [ ] 改善ポイントの特定

4. **3ヶ月後**:
   - [ ] 統一GA4プロパティへの移行検討
   - [ ] クロスドメイントラッキング実装

---

## 📝 参考リンク

- [GA4公式ドキュメント](https://support.google.com/analytics/answer/9304153)
- [カスタムイベントの作成](https://support.google.com/analytics/answer/9267744)
- [ファネルデータ探索](https://support.google.com/analytics/answer/9327974)
- [クロスドメイントラッキング](https://support.google.com/analytics/answer/10071811)

---

**作成日**: 2026-01-01
**最終更新**: 2026-01-01
**バージョン**: 1.0
