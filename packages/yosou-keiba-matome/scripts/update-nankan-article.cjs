#!/usr/bin/env node
/**
 * nankan-analytics 既存記事更新スクリプト
 *
 * 機能:
 * 1. 既存の記事をSlugで検索
 * 2. nankan-analyticsの最新データで更新
 *
 * 使い方:
 * AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/update-nankan-article.cjs <slug>
 * 例: AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/update-nankan-article.cjs 浦和-2025-12-22-11R
 */

const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

// 環境変数チェック
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
const targetSlug = process.argv[2];

if (!apiKey || !baseId) {
  console.error('❌ 環境変数が設定されていません');
  console.error('AIRTABLE_API_KEY と AIRTABLE_BASE_ID を設定してください');
  process.exit(1);
}

if (!targetSlug) {
  console.error('❌ Slugを指定してください');
  console.error('使い方: node scripts/update-nankan-article.cjs <slug>');
  console.error('例: node scripts/update-nankan-article.cjs 浦和-2025-12-22-11R');
  process.exit(1);
}

// Airtable接続
const base = new Airtable({ apiKey }).base(baseId);

// nankan-analyticsのJSONファイルパス
const NANKAN_JSON_PATH = path.join(
  __dirname,
  '../../../../nankan-analytics/astro-site/src/data/allRacesPrediction.json'
);

/**
 * nankan-analyticsのJSONからメインレース予想を取得
 */
function getMainRacePrediction() {
  try {
    if (!fs.existsSync(NANKAN_JSON_PATH)) {
      console.error(`❌ JSONファイルが見つかりません: ${NANKAN_JSON_PATH}`);
      return null;
    }

    const data = JSON.parse(fs.readFileSync(NANKAN_JSON_PATH, 'utf-8'));
    const mainRace = data.races.find(race => race.isMainRace === true);

    if (!mainRace) {
      console.log('ℹ️  今日のメインレース予想はありません');
      return null;
    }

    return {
      raceDate: data.raceDate,
      track: data.track,
      race: mainRace,
    };
  } catch (error) {
    console.error('❌ JSON読み込みエラー:', error.message);
    return null;
  }
}

/**
 * Summaryフィールドを生成
 */
function generateSummary(prediction) {
  const { raceDate, track, race } = prediction;
  const { raceInfo, horses, raceNumber } = race;
  const trackShort = track.replace('競馬', '');

  let summary = `
${trackShort} ${raceNumber} ${raceInfo.raceName}

本命: ${horses.main.number}番 ${horses.main.name}
対抗: ${horses.sub.number}番 ${horses.sub.name}
単穴: ${horses.hole1.number}番 ${horses.hole1.name}`;

  // hole2が存在する場合は追加
  if (horses.hole2) {
    summary += `\n単穴: ${horses.hole2.number}番 ${horses.hole2.name}`;
  }

  summary += `\n\n発走時刻: ${raceInfo.startTime}`;
  return summary.trim();
}

async function main() {
  console.log('🏇 nankan-analytics 記事更新\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. nankan-analyticsから最新データ取得
    console.log('📊 最新の予想データを取得中...');
    const prediction = getMainRacePrediction();

    if (!prediction) {
      console.log('\n❌ 予想データが見つかりません');
      process.exit(1);
    }

    console.log(`   競馬場: ${prediction.track}`);
    console.log(`   レース: ${prediction.race.raceNumber}`);
    console.log(`   本命: ${prediction.race.horses.main.number}番 ${prediction.race.horses.main.name}\n`);

    // 2. Summaryを生成
    const newSummary = generateSummary(prediction);
    console.log('📝 新しいSummary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(newSummary);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 3. 既存記事を検索
    console.log(`🔍 記事を検索中: ${targetSlug}`);
    const records = await base('News')
      .select({
        filterByFormula: `{Slug} = '${targetSlug}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) {
      console.log(`\n❌ 記事が見つかりません: ${targetSlug}`);
      process.exit(1);
    }

    const record = records[0];
    console.log(`   見つかりました: ${record.fields.Title}\n`);

    // 4. 記事を更新
    console.log('💾 記事を更新中...');
    await base('News').update(record.id, {
      Summary: newSummary,
    });

    console.log('✅ 更新完了！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('次のステップ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('ブラウザで確認:');
    console.log(`http://localhost:4325/news/${targetSlug}/\n`);

  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ エラーが発生しました');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error(error.message);
    console.error('\n');
    process.exit(1);
  }
}

main();
