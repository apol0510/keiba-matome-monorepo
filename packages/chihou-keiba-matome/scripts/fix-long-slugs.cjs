/**
 * 長すぎるSlugを修正するスクリプト
 */

const Airtable = require('airtable');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Error: Required environment variables are missing');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

function generateSlug(title) {
  let cleaned = title
    .replace(/【|】|[|]|「|」|『|』/g, '')
    .replace(/[　s]+/g, '')
    .replace(/[!！?？。、，,.]/g, '')
    .replace(/-/g, '')
    .trim();

  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 50);
  }

  return cleaned;
}

async function fixLongSlugs() {
  console.log('🔧 長すぎるSlugを修正します...\n');

  try {
    const records = await base('News')
      .select({
        filterByFormula: '{Status} = "published"',
        maxRecords: 100,
      })
      .firstPage();

    console.log(`📊 全${records.length}件の記事を確認中...\n`);

    let fixed = 0;
    let skipped = 0;

    for (const record of records) {
      const fields = record.fields;
      const currentSlug = fields.Slug || '';
      const sourceTitle = fields.SourceTitle || '';

      if (currentSlug.length > 50) {
        const newSlug = generateSlug(sourceTitle);

        console.log(`🔄 修正中: ${fields.Title}`);
        console.log(`   旧Slug: ${currentSlug.substring(0, 60)}... (${currentSlug.length}文字)`);
        console.log(`   新Slug: ${newSlug} (${newSlug.length}文字)`);

        await base('News').update([
          {
            id: record.id,
            fields: {
              Slug: newSlug,
            },
          },
        ]);

        console.log('   ✅ 更新完了\n');
        fixed++;
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        skipped++;
      }
    }

    console.log('\n✅ 処理完了！');
    console.log(`   - 修正: ${fixed}件`);
    console.log(`   - スキップ: ${skipped}件`);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

fixLongSlugs();
