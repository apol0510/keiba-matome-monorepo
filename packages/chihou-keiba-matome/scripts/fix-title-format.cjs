/**
 * タイトルから余計な情報を削除するスクリプト
 * （例: 「35分前 3 0 - みんなの反応は？」などの時刻・レス数情報）
 */

const Airtable = require('airtable');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

async function fixTitles() {
  console.log('🔍 問題のあるタイトルを検索中...\n');

  const records = await base('News')
    .select({
      filterByFormula: "{Status} = 'published'",
      fields: ['Title', 'Slug'],
      sort: [{ field: 'PublishedAt', direction: 'desc' }],
      maxRecords: 50
    })
    .all();

  const problematicRecords = records.filter(r => {
    const title = r.get('Title') || '';
    // タイトルに時間表記（分前、時間前）やレス数が含まれている
    return title.match(/\d+分前|\d+時間前|\d+日前/) || title.match(/\d+\s+\d+\s+-\s/);
  });

  console.log(`⚠️  問題のある記事: ${problematicRecords.length}件\n`);

  let fixed = 0;

  for (const record of problematicRecords) {
    const oldTitle = record.get('Title');

    // タイトルから余計な部分を削除
    let newTitle = oldTitle
      .replace(/\n.*$/s, '')  // 最初の改行以降を全て削除
      .replace(/\s+\d+分前.*$/, '')  // 「35分前」以降を削除
      .replace(/\s+\d+時間前.*$/, '')  // 「3時間前」以降を削除
      .replace(/\s+\d+日前.*$/, '')  // 「2日前」以降を削除
      .trim();

    if (newTitle !== oldTitle) {
      console.log(`修正: ${record.id}`);
      console.log(`  旧: ${oldTitle.substring(0, 80)}...`);
      console.log(`  新: ${newTitle}`);
      console.log('');

      await base('News').update(record.id, {
        Title: newTitle
      });

      fixed++;
    }
  }

  console.log(`\n✅ 完了: ${fixed}件のタイトルを修正しました`);
}

fixTitles().catch(error => {
  console.error('❌ エラー:', error.message);
  process.exit(1);
});
