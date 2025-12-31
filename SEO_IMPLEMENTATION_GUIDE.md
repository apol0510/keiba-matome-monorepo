# SEO最適化実装ガイド

## 📋 実装チェックリスト

### Phase 1: Airtableスキーマ更新（手動作業）

**keiba-matome (appdHJSC4F9pTIoDj) のNewsテーブルに以下のフィールドを追加**:

| フィールド名 | タイプ | 説明 |
|-------------|--------|------|
| MetaTitle | Single line text | SEO最適化タイトル（60文字以内） |
| MetaDescription | Long text | SEO説明文（150文字前後） |
| OgTitle | Single line text | SNS共有用タイトル（感情訴求型） |
| OgDescription | Long text | SNS説明文（クリック促進） |
| Keywords | Single line text | 記事関連キーワード（カンマ区切り） |
| StructuredData | Long text | JSON-LD構造化データ |

**chihou-keiba-matome (appt25zmKxQDiSCwh) のNewsテーブルに同じフィールドを追加**

**yosou-keiba-matome (appKPasSpjpTtabnv) のArticlesテーブルに同じフィールドを追加**

### Phase 2: 生成済みメタデータをAirtableに適用

```bash
# 環境変数設定
export AIRTABLE_API_KEY="your_api_key_here"

# keiba-matome
cd /Users/apolon/Library/Mobile\ Documents/com~apple~CloudDocs/WorkSpace/keiba-matome-monorepo
node packages/shared/scripts/apply-seo-metadata.cjs --project=keiba-matome

# chihou-keiba-matome
node packages/shared/scripts/apply-seo-metadata.cjs --project=chihou-keiba-matome

# yosou-keiba-matome
node packages/shared/scripts/apply-seo-metadata.cjs --project=yosou-keiba-matome
```

### Phase 3: Astroテンプレート修正

**3サイトすべての [slug].astro ファイルで**:

1. BaseLayoutに渡すpropsを更新:
   ```astro
   <BaseLayout
     title={article.metaTitle || article.title}
     description={article.metaDescription || article.summary}
     ogImage={article.ogImage || "/og/default.png"}
     ogTitle={article.ogTitle || article.title}
     ogDescription={article.ogDescription || article.summary}
     keywords={article.keywords}
     structuredData={article.structuredData}
   >
   ```

2. BaseLayout.astroでpropsを受け取る:
   ```astro
   interface Props {
     title: string;
     description?: string;
     ogImage?: string;
     ogTitle?: string;
     ogDescription?: string;
     keywords?: string;
     structuredData?: string;
   }
   ```

3. BaseLayout.astro内で使用:
   ```astro
   <!-- Keywords -->
   {keywords && <meta name="keywords" content={keywords} />}

   <!-- OGP -->
   <meta property="og:title" content={ogTitle || fullTitle} />
   <meta property="og:description" content={ogDescription || description} />

   <!-- Structured Data -->
   {structuredData && (
     <script type="application/ld+json" set:html={structuredData} />
   )}
   ```

### Phase 4: sitemap.xml配置

**各プロジェクトのpublic/ディレクトリに移動**:

```bash
# keiba-matome
cp packages/seo-output/keiba-matome/sitemap.xml packages/keiba-matome/public/sitemap.xml

# chihou-keiba-matome
cp packages/seo-output/chihou-keiba-matome/sitemap.xml packages/chihou-keiba-matome/public/sitemap.xml

# yosou-keiba-matome
cp packages/seo-output/yosou-keiba-matome/sitemap.xml packages/yosou-keiba-matome/public/sitemap.xml
```

### Phase 5: Google Search Consoleにサイトマップ送信

1. https://search.google.com/search-console にアクセス
2. 各サイトを選択
3. サイドバーから「サイトマップ」をクリック
4. 新しいサイトマップを追加: `https://keiba-matome.jp/sitemap.xml`
5. 送信

**繰り返し**:
- `https://chihou.keiba-matome.jp/sitemap.xml`
- `https://yosou.keiba-matome.jp/sitemap.xml`

### Phase 6: GA4イベントトラッキング設定（手動）

**Google Analytics（https://analytics.google.com/）にアクセス**:

1. **カスタムイベントの作成**:
   - 管理 → データストリーム → ウェブストリーム詳細 → イベント → イベントを作成

2. **設定すべきイベント**:

   | イベント名 | トリガー | パラメータ |
   |-----------|---------|-----------|
   | `click_external_link` | 外部リンククリック | `link_url`, `link_text` |
   | `click_related_site` | 関連サイトリンク | `site_name` |
   | `click_nankan_cta` | nankan-analytics CTA | `placement` |
   | `submit_comment` | コメント投稿 | `article_id` |

3. **コンバージョンイベント設定**:
   - `click_nankan_cta` をコンバージョンとしてマーク

### Phase 7: GA4ファネル設定

1. **探索 → ファネルデータ探索**を選択
2. 以下のステップを設定:

```
ステップ1: ページビュー (keiba-matome.jp)
↓
ステップ2: 関連サイトリンククリック (event: click_related_site)
↓
ステップ3: ページビュー (chihou.keiba-matome.jp)
↓
ステップ4: nankan-analytics CTAクリック (event: click_nankan_cta)
```

3. 保存してダッシュボードに追加

### Phase 8: 月次レポート自動生成スクリプト

**`packages/shared/scripts/generate-ga4-report.cjs` を作成**（次のステップで実装）

---

## ⚠️ 重要な注意事項

### Airtableフィールド追加時の注意

- フィールド名は**完全に一致**させること（大文字小文字も）
- Long textフィールドは必要に応じてFormatting → Markdown対応

### デプロイ前の確認

```bash
# ローカルビルドテスト
cd packages/keiba-matome
npm run build
ls -la dist/

# 3サイト全てでテスト
cd ../chihou-keiba-matome
npm run build

cd ../yosou-keiba-matome
npm run build
```

### Git commit前の確認

- [ ] すべてのビルドが成功
- [ ] sitemap.xmlが正しく配置されている
- [ ] BaseLayout.astroの修正が完了
- [ ] [slug].astroの修正が完了

---

## 📊 期待される効果（1-3ヶ月後）

| 指標 | 現在 | 目標 | 根拠 |
|------|------|------|------|
| 検索流入 | 不明 | +10-20% | メタデータ最適化 |
| SNSクリック率 | 不明 | +20-30% | OG最適化 |
| サイト間遷移率 | 不明 | 5-15% | ファネル構築 |
| nankan-analytics流入 | 不明 | 月100-200人 | CTA設置 |

