/**
 * 過去7日間の記事数チェック
 */

const Airtable = require('airtable');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appt25zmKxQDiSCwh';

if (!AIRTABLE_API_KEY) {
  console.error('❌ Error: AIRTABLE_API_KEY is required');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

async function checkDailyArticles() {
  console.log('📊 過去7日間の記事数チェック\n');

  const records = await base('News')
    .select({
      fields: ['Title', 'PublishedAt', 'SourceSite'],
      sort: [{ field: 'PublishedAt', direction: 'desc' }],
    })
    .all();

  // 日付ごとに集計
  const dailyStats = {};
  const sourceStats = {};

  for (const record of records) {
    const publishedAt = record.fields.PublishedAt;
    if (!publishedAt) continue;

    const date = publishedAt.split('T')[0]; // YYYY-MM-DD
    const source = record.fields.SourceSite || 'unknown';

    // 過去7日間のみ
    const daysAgo = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo > 7) continue;

    if (!dailyStats[date]) {
      dailyStats[date] = { total: 0, sources: {} };
    }

    dailyStats[date].total++;
    dailyStats[date].sources[source] = (dailyStats[date].sources[source] || 0) + 1;

    sourceStats[source] = (sourceStats[source] || 0) + 1;
  }

  // 日付順にソート
  const sortedDates = Object.keys(dailyStats).sort().reverse();

  console.log('📅 過去7日間の記事数:\n');
  for (const date of sortedDates) {
    const stats = dailyStats[date];
    console.log(`${date}: ${stats.total}件`);
    for (const [source, count] of Object.entries(stats.sources)) {
      console.log(`  - ${source}: ${count}件`);
    }
    console.log('');
  }

  console.log('📊 ソース別合計:\n');
  for (const [source, count] of Object.entries(sourceStats)) {
    console.log(`  ${source}: ${count}件`);
  }

  const totalLast7Days = Object.values(dailyStats).reduce((sum, stat) => sum + stat.total, 0);
  const avgPerDay = (totalLast7Days / 7).toFixed(1);

  console.log(`\n📈 過去7日間合計: ${totalLast7Days}件`);
  console.log(`📈 1日平均: ${avgPerDay}件\n`);
}

checkDailyArticles().catch(console.error);
