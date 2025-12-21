# Google Analytics & Search Console 設定手順

## 1. Google Analytics 設定（5分）

### 手順

1. **Google Analytics にアクセス**
   - https://analytics.google.com/
   - Googleアカウントでログイン

2. **プロパティ作成**
   - 「管理」→「プロパティを作成」
   - プロパティ名: `競馬ニュースまとめ`
   - タイムゾーン: `日本`
   - 通貨: `日本円`

3. **データストリーム作成**
   - プラットフォーム: `ウェブ`
   - ウェブサイトURL: `https://keiba-matome.jp`
   - ストリーム名: `競馬ニュースまとめ`

4. **測定IDをコピー**
   - `G-XXXXXXXXXX` の形式
   - この IDを控えておく

5. **コードに反映**
   ```bash
   # BaseLayout.astroの53-60行目のコメントアウトを解除
   # G-XXXXXXXXXXを実際の測定IDに置き換え
   ```

---

## 2. Google Search Console 設定（10分）

### 手順

1. **Google Search Console にアクセス**
   - https://search.google.com/search-console/
   - Googleアカウントでログイン

2. **プロパティ追加**
   - 「プロパティを追加」
   - プロパティタイプ: `URLプレフィックス`
   - URL: `https://keiba-matome.jp`

3. **所有権の確認**

   **方法1: HTMLタグ（推奨）**
   - 「HTMLタグ」を選択
   - メタタグをコピー: `<meta name="google-site-verification" content="XXXX" />`
   - `src/layouts/BaseLayout.astro` の `<head>` 内に追加
   - デプロイ後、「確認」をクリック

   **方法2: DNS（簡単）**
   - 「ドメイン名プロバイダ」を選択
   - TXTレコードを追加（Netlify DNSの場合）

4. **サイトマップ送信**
   - 「サイトマップ」→「新しいサイトマップの追加」
   - URL: `https://keiba-matome.jp/sitemap.xml`
   - 「送信」

---

## 3. 計測確認（初回デプロイ後）

### Analytics 確認

1. **リアルタイムレポート**
   - Analytics → レポート → リアルタイム
   - 自分のアクセスが表示されるか確認

2. **主要指標**
   - **ユーザー**: 訪問者数
   - **セッション**: 訪問回数
   - **ページビュー**: ページ閲覧数
   - **直帰率**: 1ページだけ見て離脱した割合
   - **平均セッション時間**: 滞在時間

### Search Console 確認

1. **インデックス登録状況**
   - 「カバレッジ」→「有効なページ」
   - 記事が登録されているか確認（1-2週間かかる場合あり）

2. **検索パフォーマンス**
   - 「検索パフォーマンス」
   - クリック数・表示回数・CTR・掲載順位

---

## 4. URLインスペクション（初回のみ）

Google にサイトを早く認識させるため：

1. **Search Console → URLインスペクション**
2. トップページURL入力: `https://keiba-matome.jp/`
3. 「インデックス登録をリクエスト」
4. 主要な記事ページも同様にリクエスト（5-10記事）

---

## 5. 重要なKPI設定

### Google Analytics でカスタムイベント設定

**keiba-aへのリンククリック計測:**

`src/layouts/BaseLayout.astro` のCTAボタンに追加：

```astro
<a href="https://frabjous-taiyaki-460401.netlify.app/"
   target="_blank"
   rel="noopener"
   onclick="gtag('event', 'click', {
     'event_category': 'outbound',
     'event_label': 'keiba-a-sidebar-cta'
   });">
  診断する →
</a>
```

**記事下CTAのクリック計測:**

```astro
<a href="..."
   onclick="gtag('event', 'click', {
     'event_category': 'outbound',
     'event_label': 'keiba-a-article-cta'
   });">
  無料で口コミを見る →
</a>
```

---

## 6. 週次チェック項目

- **Analytics**: PV数、流入キーワード、人気記事
- **Search Console**: クリック数、表示回数、平均掲載順位
- **導線クリック率**: keiba-aへの遷移率

---

## 次のステップ

✅ Google Analytics設定完了
✅ Google Search Console設定完了
✅ サイトマップ送信完了
✅ インデックスリクエスト完了

→ 1週間後、Search Consoleで検索クエリを確認
→ 1ヶ月後、Analytics でユーザー属性を分析
