/**
 * ユーザーコメントの承認スクリプト
 * - IsOP=true のコメント → IsOP=false に修正
 * - スパムでないコメント → IsApproved=true に設定
 *
 * 使い方:
 * AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/approve-user-comments.cjs
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

/**
 * スパム判定（簡易版）
 */
function isSpam(content, userName) {
  // URLが含まれている
  if (content.match(/https?:\/\//)) {
    return true;
  }

  // 同じ文字の繰り返し（10文字以上）
  if (content.match(/(.)\1{9,}/)) {
    return true;
  }

  // 極端に短い（2文字以下）
  if (content.length <= 2) {
    return true;
  }

  // 極端に長い（500文字以上）
  if (content.length > 500) {
    return true;
  }

  // 宣伝っぽいワード
  const spamKeywords = [
    '無料登録',
    '今すぐクリック',
    '稼げる',
    '副業',
    '在宅ワーク',
    '簡単に稼ぐ',
  ];

  for (const keyword of spamKeywords) {
    if (content.includes(keyword)) {
      return true;
    }
  }

  return false;
}

async function main() {
  try {
    console.log('🚀 ユーザーコメントの承認処理を開始...\n');

    // 全コメントを取得
    const records = await base('Comments').select().all();

    console.log(`📊 対象コメント: ${records.length}件\n`);

    if (records.length === 0) {
      console.log('ℹ️  コメントがありません');
      return;
    }

    let fixedIsOP = 0;
    let approved = 0;
    let rejected = 0;
    let skipped = 0;

    const updates = [];

    for (const record of records) {
      const content = record.fields.Content || '';
      const userName = record.fields.UserName || '名無しさん';
      const isOP = record.fields.IsOP === true;
      const isApproved = record.fields.IsApproved === true;

      const fields = {};

      // IsOPがtrueの場合、falseに修正
      if (isOP) {
        fields.IsOP = false;
        fixedIsOP++;
      }

      // まだ承認されていないコメントの場合
      if (!isApproved) {
        if (isSpam(content, userName)) {
          console.log(`🚫 スパム判定: "${content.substring(0, 30)}..."`);
          rejected++;
          // IsApproved=falseのまま（何もしない）
        } else {
          fields.IsApproved = true;
          approved++;
        }
      } else {
        skipped++;
      }

      // 更新が必要な場合のみバッチに追加
      if (Object.keys(fields).length > 0) {
        updates.push({
          id: record.id,
          fields,
        });
      }
    }

    // 10件ずつバッチ更新
    if (updates.length > 0) {
      for (let i = 0; i < updates.length; i += 10) {
        const batch = updates.slice(i, i + 10);
        await base('Comments').update(batch);
        console.log(`✅ ${Math.min(i + 10, updates.length)}/${updates.length}件 更新完了`);

        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`\n📊 処理結果:`);
    console.log(`  - IsOP修正: ${fixedIsOP}件`);
    console.log(`  - 承認: ${approved}件`);
    console.log(`  - スパム判定（承認しない）: ${rejected}件`);
    console.log(`  - スキップ（既に承認済み）: ${skipped}件`);
    console.log(`\n🎉 処理が完了しました！`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main();
