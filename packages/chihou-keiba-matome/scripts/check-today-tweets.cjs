/**
 * 今日のX投稿数を確認
 */

const Airtable = require('airtable');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

(async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split('T')[0];

    console.log(`📅 今日の日付: ${todayISO}\n`);

    const records = await base('News')
      .select({
        filterByFormula: `AND({Status} = 'published', NOT({TweetID} = ''), DATETIME_FORMAT({TweetedAt}, 'YYYY-MM-DD') = '${todayISO}')`,
      })
      .all();

    console.log(`✅ 今日X投稿済みの記事: ${records.length}件\n`);

    if (records.length > 0) {
      records.forEach(record => {
        console.log(`- ${record.get('Title')}`);
        console.log(`  投稿時間: ${record.get('TweetedAt')}`);
        console.log(`  TweetID: ${record.get('TweetID')}\n`);
      });
    }

    console.log(`📊 本日の残り投稿可能数: ${50 - records.length}件（Free枠: 50件/日）`);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
})();
