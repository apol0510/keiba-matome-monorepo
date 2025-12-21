/**
 * 記事のレス数をチェック
 */

const Airtable = require('airtable');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

async function main() {
  try {
    const news = await base('News').select({
      maxRecords: 10,
      sort: [{field: 'CreatedAt', direction: 'desc'}]
    }).all();

    console.log('📊 最新10件の記事のレス数:\n');
    for (const record of news) {
      const title = record.fields.Title || '無題';
      const commentCount = record.fields.CommentCount || 0;
      console.log(`- ${title.substring(0, 40)}... → ${commentCount}件`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
