/**
 * 長すぎるSlugを修正するスクリプト
 * （100文字で切れて不正なURLになっている記事を修正）
 */

const Airtable = require('airtable');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

/**
 * 改善されたSlug生成（日本語20文字制限）
 */
function generateSlug(title) {
  // 記号を削除・正規化
  let cleaned = title
    .replace(/【|】|\[|\]|「|」|『|』/g, '')  // 括弧を削除
    .replace(/[　\s]+/g, '-')  // スペースをハイフンに
    .replace(/[!！?？。、，,\.]/g, '')  // 句読点を削除
    .trim();

  // 日本語文字数で20文字に制限（エンコード前）
  if (cleaned.length > 20) {
    cleaned = cleaned.substring(0, 20);
  }

  // URLエンコード（日本語をそのまま使用）
  let slug = encodeURIComponent(cleaned)
    .toLowerCase()
    .replace(/%20/g, '-')  // スペース → ハイフン
    .replace(/\-\-+/g, '-')  // 連続ハイフンを1つに
    .replace(/^-+/, '')  // 先頭のハイフン削除
    .replace(/-+$/, '');  // 末尾のハイフン削除

  return slug;
}

async function fixLongSlugs() {
  console.log('🔍 長すぎるSlugを検索中...\n');

  const records = await base('News')
    .select({
      filterByFormula: "{Status} = 'published'",
      fields: ['Title', 'Slug'],
    })
    .all();

  // 90文字以上のSlugを持つ記事（100文字で切れている可能性）
  const longSlugRecords = records.filter(r => {
    const slug = r.get('Slug') || '';
    return slug.length >= 90;
  });

  console.log(`⚠️  長すぎるSlug: ${longSlugRecords.length}件\n`);

  let fixed = 0;

  for (const record of longSlugRecords) {
    const oldSlug = record.get('Slug');
    const title = record.get('Title');
    const newSlug = generateSlug(title);

    console.log(`修正: ${record.id}`);
    console.log(`  Title: ${title}`);
    console.log(`  旧Slug: ${oldSlug} (${oldSlug.length}文字)`);
    console.log(`  新Slug: ${newSlug} (${newSlug.length}文字)`);
    console.log('');

    await base('News').update(record.id, {
      Slug: newSlug
    });

    fixed++;
  }

  console.log(`\n✅ 完了: ${fixed}件のSlugを修正しました`);
}

fixLongSlugs().catch(error => {
  console.error('❌ エラー:', error.message);
  process.exit(1);
});
