# Airtable 的中結果管理セットアップ

## レース結果テーブル追加

yosou-keiba-matome の的中率表示機能のために、新しいテーブルを追加します。

### テーブル名: RaceResults

| フィールド名 | タイプ | 説明 | 必須 |
|-------------|--------|------|------|
| **ArticleID** | Link to Articles | 関連記事 | ✅ |
| **RaceDate** | Date | レース開催日 | ✅ |
| **RaceName** | Single line text | レース名 | ✅ |
| **Track** | Single line text | 競馬場 | ✅ |
| **Grade** | Single select | グレード | ✅ |
| **Result1st** | Single line text | 1着馬番・馬名 | ✅ |
| **Result2nd** | Single line text | 2着馬番・馬名 | ✅ |
| **Result3rd** | Single line text | 3着馬番・馬名 | ✅ |
| **PredictedMain** | Single line text | 本命（予想） | - |
| **PredictedSub** | Single line text | 対抗（予想） | - |
| **PredictedHole1** | Single line text | 単穴1（予想） | - |
| **PredictedHole2** | Single line text | 単穴2（予想） | - |
| **IsMainHit** | Checkbox | 本命的中 | - |
| **IsSubHit** | Checkbox | 対抗的中 | - |
| **IsHole1Hit** | Checkbox | 単穴1的中 | - |
| **IsHole2Hit** | Checkbox | 単穴2的中 | - |
| **HitRate** | Number (Percent) | 的中率（%） | - |
| **Notes** | Long text | メモ | - |
| **CreatedAt** | Created time | 作成日時 | Auto |

### フィールド詳細設定

#### Grade（グレード）の選択肢
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

#### HitRate（的中率）の計算式

**Formula**:
```
IF(
  OR({IsMainHit}, {IsSubHit}, {IsHole1Hit}, {IsHole2Hit}),
  (
    IF({IsMainHit}, 1, 0) +
    IF({IsSubHit}, 1, 0) +
    IF({IsHole1Hit}, 1, 0) +
    IF({IsHole2Hit}, 1, 0)
  ) / 4 * 100,
  0
)
```

---

## Articles テーブル拡張

既存の Articles テーブルに以下のフィールドを追加します。

| フィールド名 | タイプ | 説明 | 必須 |
|-------------|--------|------|------|
| **HasResult** | Checkbox | レース結果登録済み | - |
| **HitRate** | Rollup | 的中率（RaceResultsから） | - |

### Rollup設定（HitRate）

- **Link to table**: RaceResults
- **Lookup field**: ArticleID
- **Aggregation function**: AVERAGE(values)
- **Field to aggregate**: HitRate

---

## レース結果登録スクリプト

### scripts/register-race-result.cjs

レース結果を手動で登録するスクリプトを作成します。

```javascript
#!/usr/bin/env node
/**
 * レース結果登録スクリプト
 *
 * 使い方:
 * node scripts/register-race-result.cjs <slug> <1着> <2着> <3着>
 * 例: node scripts/register-race-result.cjs 浦和-2025-12-22-11R "2 ブレイジングヒート" "1 エドノバンザイ" "6 ケンキートス"
 */

const Airtable = require('airtable');

// 環境変数チェック
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

// コマンドライン引数
const [, , slug, result1st, result2nd, result3rd] = process.argv;

if (!slug || !result1st || !result2nd || !result3rd) {
  console.error('使い方: node scripts/register-race-result.cjs <slug> <1着> <2着> <3着>');
  process.exit(1);
}

async function main() {
  // 1. 記事を検索
  const articles = await base('Articles')
    .select({ filterByFormula: `{Slug} = '${slug}'`, maxRecords: 1 })
    .firstPage();

  if (articles.length === 0) {
    console.error(`❌ 記事が見つかりません: ${slug}`);
    process.exit(1);
  }

  const article = articles[0];
  console.log(`✅ 記事を発見: ${article.fields.Title}`);

  // 2. 予想を抽出（Summaryから）
  const summary = article.fields.Summary || '';
  const mainMatch = summary.match(/本命: (\d+番 \S+)/);
  const subMatch = summary.match(/対抗: (\d+番 \S+)/);
  const hole1Match = summary.match(/単穴: (\d+番 \S+)/);
  const hole2Matches = summary.match(/単穴: (\d+番 \S+)/g);

  const predicted = {
    main: mainMatch ? mainMatch[1] : '',
    sub: subMatch ? subMatch[1] : '',
    hole1: hole1Match ? hole1Match[1] : '',
    hole2: hole2Matches && hole2Matches[1] ? hole2Matches[1].replace('単穴: ', '') : '',
  };

  // 3. 的中判定
  const hits = {
    main: [result1st, result2nd, result3rd].includes(predicted.main),
    sub: [result1st, result2nd, result3rd].includes(predicted.sub),
    hole1: [result1st, result2nd, result3rd].includes(predicted.hole1),
    hole2: [result1st, result2nd, result3rd].includes(predicted.hole2),
  };

  console.log(`\n📊 的中判定:`);
  console.log(`   本命: ${predicted.main} → ${hits.main ? '✅的中' : '❌不的中'}`);
  console.log(`   対抗: ${predicted.sub} → ${hits.sub ? '✅的中' : '❌不的中'}`);
  console.log(`   単穴1: ${predicted.hole1} → ${hits.hole1 ? '✅的中' : '❌不的中'}`);
  console.log(`   単穴2: ${predicted.hole2} → ${hits.hole2 ? '✅的中' : '❌不的中'}\n`);

  // 4. RaceResultsテーブルに登録
  await base('RaceResults').create({
    ArticleID: [article.id],
    RaceDate: article.fields.RaceDate,
    RaceName: article.fields.RaceName,
    Track: article.fields.Track,
    Grade: article.fields.Grade,
    Result1st: result1st,
    Result2nd: result2nd,
    Result3rd: result3rd,
    PredictedMain: predicted.main,
    PredictedSub: predicted.sub,
    PredictedHole1: predicted.hole1,
    PredictedHole2: predicted.hole2,
    IsMainHit: hits.main,
    IsSubHit: hits.sub,
    IsHole1Hit: hits.hole1,
    IsHole2Hit: hits.hole2,
  });

  // 5. Articlesテーブルを更新（HasResult = true）
  await base('Articles').update(article.id, {
    HasResult: true,
  });

  console.log('✅ レース結果を登録しました！\n');
}

main().catch(console.error);
```

---

## フロントエンド表示

### src/pages/stats.astro

的中率統計ページを作成します。

```astro
---
export const prerender = true;

import BaseLayout from '../layouts/BaseLayout.astro';
import { getAllArticles } from '../lib/airtable';

// 的中率統計を取得
const articles = await getAllArticles();
const articlesWithResults = articles.filter(a => a.hasResult);

// 全体的中率
const totalHits = articlesWithResults.reduce((sum, a) => sum + (a.hitRate || 0), 0);
const averageHitRate = articlesWithResults.length > 0
  ? Math.round(totalHits / articlesWithResults.length)
  : 0;

// カテゴリ別的中率
const chuouArticles = articlesWithResults.filter(a => a.category === '中央重賞');
const nankanArticles = articlesWithResults.filter(a => a.category === '南関重賞' || a.category === '南関メイン');

const chuouHitRate = chuouArticles.length > 0
  ? Math.round(chuouArticles.reduce((sum, a) => sum + (a.hitRate || 0), 0) / chuouArticles.length)
  : 0;

const nankanHitRate = nankanArticles.length > 0
  ? Math.round(nankanArticles.reduce((sum, a) => sum + (a.hitRate || 0), 0) / nankanArticles.length)
  : 0;
---

<BaseLayout title="的中率統計">
  <h1>🎯 予想的中率統計</h1>

  <div style="background: #fff; padding: 20px; border: 1px solid #999; margin-bottom: 20px;">
    <h2>全体統計</h2>
    <p>対象レース数: {articlesWithResults.length}件</p>
    <p>平均的中率: <strong>{averageHitRate}%</strong></p>
  </div>

  <div style="background: #fff; padding: 20px; border: 1px solid #999; margin-bottom: 20px;">
    <h2>カテゴリ別統計</h2>
    <p>中央重賞: <strong>{chuouHitRate}%</strong> ({chuouArticles.length}件)</p>
    <p>南関重賞: <strong>{nankanHitRate}%</strong> ({nankanArticles.length}件)</p>
  </div>

  <div style="background: #fff; padding: 20px; border: 1px solid #999;">
    <h2>最近の的中結果</h2>
    {articlesWithResults.slice(0, 10).map(article => (
      <div style="border-bottom: 1px solid #ddd; padding: 10px;">
        <strong>{article.title}</strong>
        <span style="margin-left: 10px; color: #666;">的中率: {article.hitRate}%</span>
      </div>
    ))}
  </div>
</BaseLayout>
```

---

## 次のステップ

1. [ ] Airtableで RaceResults テーブル作成
2. [ ] Articles テーブルに HasResult, HitRate フィールド追加
3. [ ] register-race-result.cjs 作成
4. [ ] stats.astro ページ作成
5. [ ] ナビゲーションに統計ページリンク追加

レース結果登録後、自動的に的中率が計算され、統計ページに反映されます！
