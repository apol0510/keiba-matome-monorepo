const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base('appt25zmKxQDiSCwh');

// 404エラーのURLから記事タイトル（の一部）を抽出
const errorUrls = [
  'AJCCプロキオンSなど3重賞',
  'TCK御神本訓史騎手の3000勝達成表彰式が中止',
  '金沢競馬栗原大河騎手が地方通算800勝',
  '東京大賞典４番人気のアウトレンジ',
  '地方競馬大井競馬12Rでベストフィールド号が競走除外',
  '名古屋大賞典復調気配を示した前走',
  '飲ませたか覚えていない金沢競馬調教師'
];

async function checkSlugs() {
  console.log('=== 404エラー記事のSlug確認 ===\n');

  const records = await base('News').select({
    maxRecords: 100,
    sort: [{ field: 'PublishedAt', direction: 'desc' }],
    view: 'Grid view'
  }).all();

  let foundCount = 0;

  for (const keyword of errorUrls) {
    const found = records.find(r => r.get('Title')?.includes(keyword.substring(0, 20)));

    if (found) {
      foundCount++;
      console.log(`【記事 ${foundCount}】`);
      console.log(`タイトル: ${found.get('Title')?.substring(0, 60)}...`);
      console.log(`Slug: ${found.get('Slug')}`);
      console.log(`Slug長: ${found.get('Slug')?.length || 0}文字`);
      console.log(`PublishedAt: ${found.get('PublishedAt')}`);
      console.log(`---\n`);
    }
  }

  console.log(`\n見つかった記事: ${foundCount}/${errorUrls.length}`);

  // 日本語Slugの記事をすべて表示
  console.log('\n=== 日本語Slugの記事（全件）===\n');
  const japaneseSlugRecords = records.filter(r => {
    const slug = r.get('Slug');
    return slug && /[ぁ-んァ-ヶー一-龠]/.test(slug);
  });

  console.log(`合計: ${japaneseSlugRecords.length}件\n`);
  japaneseSlugRecords.slice(0, 10).forEach((r, i) => {
    console.log(`${i + 1}. ${r.get('Title')?.substring(0, 40)}...`);
    console.log(`   Slug: ${r.get('Slug')?.substring(0, 60)}...`);
    console.log('');
  });
}

checkSlugs().catch(console.error);
