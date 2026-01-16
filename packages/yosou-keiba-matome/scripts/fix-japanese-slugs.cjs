#!/usr/bin/env node
/**
 * 日本語slugを英数字slugに修正するスクリプト
 *
 * 既存の日本語slugを持つ記事を、新しい英数字slugに変更します。
 * - 中央重賞: trackSlug-grade-date (例: nakayama-giii-2026-01-06)
 * - 南関: trackShort-date-raceNumber (例: 浦和-2026-01-16-11R)
 */

const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

/**
 * トラック名をローマ字に変換
 */
const trackMap = {
  '中山': 'nakayama',
  '京都': 'kyoto',
  '阪神': 'hanshin',
  '中京': 'chukyo',
  '東京': 'tokyo',
  '新潟': 'niigata',
  '福島': 'fukushima',
  '小倉': 'kokura',
  '札幌': 'sapporo',
  '函館': 'hakodate',
  '中央競馬場': 'chuou'
};

/**
 * 新しいslugを生成（中央重賞用）
 */
function generateChuouSlug(track, grade, raceDate) {
  const trackSlug = trackMap[track] || 'chuou';
  const gradeSlug = grade.toLowerCase();
  const dateStr = raceDate.split('T')[0]; // YYYY-MM-DD
  return `${trackSlug}-${gradeSlug}-${dateStr}`;
}

/**
 * 新しいslugを生成（南関用）
 */
function generateNankanSlug(track, raceDate, title) {
  const trackShort = track.replace('競馬', '');
  const dateStr = raceDate.split('T')[0]; // YYYY-MM-DD

  // レース番号をタイトルから抽出（例: 【浦和 11R】→ 11R）
  const raceNumberMatch = title.match(/【.+?\s+(\d+R)】/);
  const raceNumber = raceNumberMatch ? raceNumberMatch[1] : 'race';

  return `${trackShort}-${dateStr}-${raceNumber}`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🔧 日本語slug修正スクリプト\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 全記事を取得（日本語を含む可能性があるslug）
    const records = await base('News')
      .select({
        filterByFormula: '{Status} = "published"'
      })
      .all();

    console.log(`📊 取得した記事数: ${records.length}件\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const record of records) {
      const fields = record.fields;
      const oldSlug = fields.Slug;
      const category = fields.Category;
      const track = fields.Track;
      const grade = fields.Grade;
      const raceDate = fields.RaceDate;
      const title = fields.Title;

      // 日本語が含まれているかチェック
      const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(oldSlug);

      if (!hasJapanese) {
        console.log(`⏭️  スキップ（英数字slug）: ${title}`);
        skippedCount++;
        continue;
      }

      let newSlug;

      if (category === '中央重賞') {
        newSlug = generateChuouSlug(track, grade, raceDate);
      } else if (category === '南関重賞' || category === '南関メイン') {
        newSlug = generateNankanSlug(track, raceDate, title);
      } else {
        console.log(`⚠️  不明なカテゴリ: ${category} - ${title}`);
        skippedCount++;
        continue;
      }

      // Airtableを更新
      try {
        await base('News').update(record.id, {
          Slug: newSlug
        });
        console.log(`✅ 更新成功: ${title}`);
        console.log(`   旧: ${oldSlug}`);
        console.log(`   新: ${newSlug}\n`);
        updatedCount++;
      } catch (err) {
        console.error(`❌ 更新失敗: ${title} - ${err.message}\n`);
      }

      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 完了: ${updatedCount}件更新、${skippedCount}件スキップ`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();
