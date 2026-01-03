const Airtable = require('airtable');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

const sites = [
  {
    name: 'keiba-matome (中央競馬)',
    baseId: 'appdHJSC4F9pTIoDj'
  },
  {
    name: 'chihou-keiba-matome (地方競馬)',
    baseId: 'appt25zmKxQDiSCwh'
  },
  {
    name: 'yosou-keiba-matome (競馬予想)',
    baseId: 'appKPasSpjpTtabnv'
  }
];

async function checkPostCount(site) {
  const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(site.baseId);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let totalPosts = 0;
  let recentPosts = 0;

  try {
    const records = await base('Articles').select({
      fields: ['Title', 'isPostedToX', 'CreatedAt', 'PostedToXAt']
    }).all();

    records.forEach(record => {
      const isPosted = record.get('isPostedToX');
      const postedAt = record.get('PostedToXAt');
      const createdAt = record.get('CreatedAt');

      if (isPosted) {
        totalPosts++;

        // PostedToXAtがあればそれを使用、なければCreatedAtで判定
        const postDate = new Date(postedAt || createdAt);
        if (postDate >= thirtyDaysAgo) {
          recentPosts++;
        }
      }
    });

    return {
      site: site.name,
      totalPosts,
      recentPosts,
      remaining: 500 - recentPosts
    };
  } catch (error) {
    return {
      site: site.name,
      error: error.message
    };
  }
}

async function main() {
  console.log('📊 X投稿数レポート（過去30日間）\n');
  console.log('='.repeat(60));

  let grandTotal = 0;
  let grandRecent = 0;

  for (const site of sites) {
    const result = await checkPostCount(site);

    if (result.error) {
      console.log(`\n❌ ${result.site}:`);
      console.log(`   エラー: ${result.error}`);
    } else {
      console.log(`\n✅ ${result.site}:`);
      console.log(`   過去30日間の投稿数: ${result.recentPosts}件`);
      console.log(`   累計投稿数: ${result.totalPosts}件`);
      console.log(`   残り投稿可能数: ${result.remaining}件/月`);

      grandTotal += result.totalPosts;
      grandRecent += result.recentPosts;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📈 合計:`);
  console.log(`   過去30日間: ${grandRecent}件 / 1,500件`);
  console.log(`   累計: ${grandTotal}件`);
  console.log(`   残り投稿可能数: ${1500 - grandRecent}件/月`);
  console.log(`\n💡 投稿頻度を上げる余裕: ${grandRecent < 750 ? 'あり（2倍以上可能）' : grandRecent < 1200 ? '少しあり' : 'ほぼなし'}`);
}

main().catch(console.error);
