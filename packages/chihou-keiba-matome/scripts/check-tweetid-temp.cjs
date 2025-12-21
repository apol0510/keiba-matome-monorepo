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
    console.log('📰 最新のpublished記事とTweetIDを確認中...\n');

    const records = await base('News')
      .select({
        filterByFormula: "{Status} = 'published'",
        sort: [{ field: 'PublishedAt', direction: 'desc' }],
        maxRecords: 10
      })
      .all();

    console.log('✅ 最新10件の記事:\n');

    records.forEach((record, idx) => {
      const title = record.get('Title');
      const slug = record.get('Slug');
      const tweetID = record.get('TweetID');
      const tweetedAt = record.get('TweetedAt');
      const publishedAt = record.get('PublishedAt');

      console.log((idx + 1) + '. ' + title);
      console.log('   Slug: ' + (slug ? slug.substring(0, 60) : 'なし'));
      console.log('   TweetID: ' + (tweetID || '❌ 未投稿'));
      if (tweetedAt) {
        console.log('   TweetedAt: ' + tweetedAt);
      }
      console.log('   PublishedAt: ' + publishedAt + '\n');
    });
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
})();
