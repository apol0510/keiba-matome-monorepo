/**
 * 不正なSlugを持つ記事を削除するスクリプト
 */

const Airtable = require('airtable');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ 環境変数が設定されていません');
  console.error('AIRTABLE_API_KEY:', AIRTABLE_API_KEY ? '設定済み' : '未設定');
  console.error('AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID ? '設定済み' : '未設定');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

/**
 * Slugが不正かどうかチェック
 * 不正なSlugの特徴：
 * - 日本語（ひらがな、カタカナ、漢字）が含まれていない
 * - URLエンコード済み（%を含む）も不正とする（旧バージョン）
 * - 正しいSlugは日本語そのまま（例: 朝日杯FS展望無傷の3連勝...）
 */
function isInvalidSlug(slug) {
  if (!slug) return true;

  // 日本語（ひらがな、カタカナ、漢字）を含んでいれば正常
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(slug)) {
    return false;
  }

  // 日本語がない = 不正Slug
  return true;
}

async function main() {
  console.log('🔍 不正なSlugを持つ記事を検索中...\n');

  try {
    // 全ての記事を取得（publishedとdraftの両方）
    const records = await base('News')
      .select({
        fields: ['Title', 'Slug', 'Status', 'PublishedAt']
      })
      .all();

    console.log(`📊 全記事数: ${records.length}件\n`);

    const invalidRecords = [];

    // 不正なSlugを持つ記事を抽出
    records.forEach(record => {
      const slug = record.get('Slug');
      if (isInvalidSlug(slug)) {
        invalidRecords.push({
          id: record.id,
          title: record.get('Title'),
          slug: slug,
          publishedAt: record.get('PublishedAt')
        });
      }
    });

    if (invalidRecords.length === 0) {
      console.log('✅ 不正なSlugを持つ記事はありません');
      return;
    }

    console.log(`⚠️  不正なSlugを持つ記事: ${invalidRecords.length}件\n`);

    // 不正な記事を表示
    invalidRecords.forEach((rec, i) => {
      console.log(`${i + 1}. Slug: ${rec.slug}`);
      console.log(`   Title: ${rec.title?.substring(0, 60)}...`);
      console.log('');
    });

    console.log(`\n🗑️  これら${invalidRecords.length}件の記事を削除します...\n`);

    // 記事を削除
    let deleted = 0;
    for (const rec of invalidRecords) {
      try {
        await base('News').destroy(rec.id);
        console.log(`✅ 削除: ${rec.slug}`);
        deleted++;
      } catch (error) {
        console.error(`❌ 削除失敗 (${rec.slug}):`, error.message);
      }
    }

    console.log(`\n✅ 完了: ${deleted}/${invalidRecords.length}件を削除しました`);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

main();
