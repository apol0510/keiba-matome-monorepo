/**
 * 既存の全コメントにIsApproved=trueを一括設定
 *
 * 使い方:
 * AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/approve-all-comments.cjs
 */

const Airtable = require('airtable');

// 環境変数チェック
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required');
  process.exit(1);
}

// Airtable初期化
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

async function main() {
  try {
    console.log('🚀 全コメントを承認中...\n');

    // 全コメントを取得
    const records = await base('Comments').select().all();

    console.log(`📊 対象コメント: ${records.length}件\n`);

    if (records.length === 0) {
      console.log('ℹ️  コメントがありません');
      return;
    }

    // 10件ずつ一括更新（Airtable APIの制限）
    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10);
      const updates = batch.map(record => ({
        id: record.id,
        fields: {
          IsApproved: true,
        },
      }));

      await base('Comments').update(updates);
      console.log(`✅ ${Math.min(i + 10, records.length)}/${records.length}件 更新完了`);

      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n🎉 全${records.length}件のコメントを承認しました！`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main();
