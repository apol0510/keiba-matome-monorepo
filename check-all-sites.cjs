#!/usr/bin/env node

const Airtable = require('airtable');

// 環境変数から統一APIキーを取得
const UNIFIED_API_KEY = process.env.AIRTABLE_API_KEY;

if (!UNIFIED_API_KEY) {
  console.error('❌ AIRTABLE_API_KEY environment variable is required');
  process.exit(1);
}

const SITES = [
  {
    name: 'keiba-matome (中央競馬)',
    apiKey: UNIFIED_API_KEY,
    baseId: 'appdHJSC4F9pTIoDj',
    siteUrl: 'https://keiba-matome.jp'
  },
  {
    name: 'chihou-keiba-matome (地方競馬)',
    apiKey: UNIFIED_API_KEY,
    baseId: 'appt25zmKxQDiSCwh',
    siteUrl: 'https://chihou.keiba-matome.jp'
  },
  {
    name: 'yosou-keiba-matome (競馬予想)',
    apiKey: UNIFIED_API_KEY,
    baseId: 'appKPasSpjpTtabnv',
    siteUrl: 'https://yosou.keiba-matome.jp'
  }
];

async function checkSite(site) {
  console.log('');
  console.log('='.repeat(70));
  console.log(`📊 ${site.name}`);
  console.log('='.repeat(70));

  const base = new Airtable({ apiKey: site.apiKey }).base(site.baseId);

  try {
    const records = [];
    await base('News').select({
      filterByFormula: "Status = 'published'",
      maxRecords: 5,
      sort: [{ field: 'PublishedAt', direction: 'desc' }]
    }).eachPage((r, fetchNextPage) => {
      records.push(...r);
      fetchNextPage();
    });

    console.log('');
    console.log(`✅ Published記事数: ${records.length}件`);
    console.log('');

    if (records.length === 0) {
      console.log('🚨 問題: published記事が0件です！');
    } else {
      console.log('最新5件:');
      records.forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.get('Title')}`);
        console.log(`   Slug: ${r.get('Slug')}`);
        console.log(`   URL: ${site.siteUrl}/news/${encodeURIComponent(r.get('Slug'))}`);
        console.log(`   PublishedAt: ${r.get('PublishedAt')}`);
        console.log(`   CommentCount: ${r.get('CommentCount') || 0}`);
      });
    }
  } catch (error) {
    console.error('');
    console.error('🚨 エラー:', error.message);
  }
}

async function main() {
  console.log('');
  console.log('🔍 全サイトのAirtableデータチェック');

  for (const site of SITES) {
    await checkSite(site);
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('✅ チェック完了');
  console.log('='.repeat(70));
  console.log('');
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
