/**
 * 記事のCommentCountを実際のコメント数に基づいて更新
 */

const Airtable = require('airtable');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

async function main() {
  try {
    console.log('🚀 CommentCount修正開始...\n');

    // 全記事を取得
    const newsRecords = await base('News').select().all();
    console.log(`📊 対象記事: ${newsRecords.length}件\n`);

    // 全コメントを取得
    const allComments = await base('Comments').select().all();
    console.log(`📊 総コメント数: ${allComments.length}件\n`);

    const updates = [];

    for (const newsRecord of newsRecords) {
      const newsId = newsRecord.id;
      const title = newsRecord.fields.Title || '無題';

      // この記事に紐づくコメント数をカウント
      const relatedComments = allComments.filter(comment => {
        const newsIdArray = comment.fields.NewsID;
        return newsIdArray && newsIdArray.includes(newsId);
      });

      const actualCount = relatedComments.length;
      const currentCount = newsRecord.fields.CommentCount || 0;

      if (actualCount !== currentCount) {
        updates.push({
          id: newsId,
          fields: {
            CommentCount: actualCount,
          },
        });

        console.log(`📝 "${title.substring(0, 30)}..." → ${currentCount}件 → ${actualCount}件`);
      }
    }

    if (updates.length === 0) {
      console.log('✅ 全ての記事のCommentCountは正しいです');
      return;
    }

    console.log(`\n🔄 ${updates.length}件の記事を更新中...\n`);

    // 10件ずつバッチ更新
    for (let i = 0; i < updates.length; i += 10) {
      const batch = updates.slice(i, i + 10);
      await base('News').update(batch);
      console.log(`✅ ${Math.min(i + 10, updates.length)}/${updates.length}件 更新完了`);

      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n🎉 CommentCountの修正が完了しました！`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main();
