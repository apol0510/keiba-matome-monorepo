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
  console.error('使い方: AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/register-race-result.cjs <slug> <1着> <2着> <3着>');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

// コマンドライン引数
const [, , slug, result1st, result2nd, result3rd] = process.argv;

if (!slug || !result1st || !result2nd || !result3rd) {
  console.error('❌ 引数が不足しています');
  console.error('使い方: node scripts/register-race-result.cjs <slug> <1着> <2着> <3着>');
  console.error('例: node scripts/register-race-result.cjs 浦和-2025-12-22-11R "2 ブレイジングヒート" "1 エドノバンザイ" "6 ケンキートス"');
  process.exit(1);
}

async function main() {
  console.log('🏇 レース結果登録\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. 記事を検索
    console.log(`🔍 記事を検索中: ${slug}`);
    const articles = await base('Articles')
      .select({ filterByFormula: `{Slug} = '${slug}'`, maxRecords: 1 })
      .firstPage();

    if (articles.length === 0) {
      console.error(`\n❌ 記事が見つかりません: ${slug}`);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(1);
    }

    const article = articles[0];
    console.log(`✅ 記事を発見: ${article.fields.Title}\n`);

    // 2. 予想を抽出（Summaryから）
    const summary = article.fields.Summary || '';
    const mainMatch = summary.match(/本命:\s*(\d+番\s+\S+)/);
    const subMatch = summary.match(/対抗:\s*(\d+番\s+\S+)/);
    const hole1Match = summary.match(/単穴:\s*(\d+番\s+\S+)/);
    // 単穴は2つある可能性があるので、すべてマッチさせて2つ目を取得
    const holeMatches = [...summary.matchAll(/単穴:\s*(\d+番\s+\S+)/g)];

    const predicted = {
      main: mainMatch ? mainMatch[1].trim() : '',
      sub: subMatch ? subMatch[1].trim() : '',
      hole1: hole1Match ? hole1Match[1].trim() : '',
      hole2: holeMatches.length > 1 ? holeMatches[1][1].trim() : '',
    };

    console.log('📋 予想内容:');
    console.log(`   本命: ${predicted.main || '（なし）'}`);
    console.log(`   対抗: ${predicted.sub || '（なし）'}`);
    console.log(`   単穴1: ${predicted.hole1 || '（なし）'}`);
    console.log(`   単穴2: ${predicted.hole2 || '（なし）'}\n`);

    console.log('🏁 レース結果:');
    console.log(`   1着: ${result1st}`);
    console.log(`   2着: ${result2nd}`);
    console.log(`   3着: ${result3rd}\n`);

    // 3. 的中判定
    const results = [result1st, result2nd, result3rd];
    const hits = {
      main: results.some(r => predicted.main && r.includes(predicted.main.split(' ')[0])),
      sub: results.some(r => predicted.sub && r.includes(predicted.sub.split(' ')[0])),
      hole1: results.some(r => predicted.hole1 && r.includes(predicted.hole1.split(' ')[0])),
      hole2: results.some(r => predicted.hole2 && r.includes(predicted.hole2.split(' ')[0])),
    };

    console.log('📊 的中判定:');
    console.log(`   本命: ${predicted.main || '（なし）'} → ${hits.main ? '✅的中' : '❌不的中'}`);
    console.log(`   対抗: ${predicted.sub || '（なし）'} → ${hits.sub ? '✅的中' : '❌不的中'}`);
    console.log(`   単穴1: ${predicted.hole1 || '（なし）'} → ${hits.hole1 ? '✅的中' : '❌不的中'}`);
    console.log(`   単穴2: ${predicted.hole2 || '（なし）'} → ${hits.hole2 ? '✅的中' : '❌不的中'}\n`);

    // 4. RaceResultsテーブルに登録
    console.log('💾 RaceResultsテーブルに登録中...');
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
    console.log('📝 Articlesテーブルを更新中...');
    await base('Articles').update(article.id, {
      HasResult: true,
    });

    console.log('✅ レース結果を登録しました！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 処理完了');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 的中率の計算結果を表示
    const hitCount = [hits.main, hits.sub, hits.hole1, hits.hole2].filter(Boolean).length;
    const hitRate = (hitCount / 4) * 100;
    console.log(`📈 的中率: ${hitRate}% (${hitCount}/4)\n`);

  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ エラーが発生しました');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error(error.message);
    if (error.statusCode) {
      console.error(`HTTP Status: ${error.statusCode}`);
    }
    console.error('\n');
    process.exit(1);
  }
}

main();
