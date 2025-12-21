const Airtable = require('airtable');

async function fixSlashSlugs() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    console.error('❌ AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
    process.exit(1);
  }

  const base = new Airtable({ apiKey }).base(baseId);

  console.log('🔍 スラッシュを含むSlugを検索中...');

  const records = await base('News')
    .select({
      filterByFormula: '{Status} = "published"',
    })
    .all();

  console.log(`\n📊 全published記事数: ${records.length}件`);

  const invalidRecords = records.filter(record => {
    const slug = record.fields.Slug || '';
    return slug.includes('/');
  });

  if (invalidRecords.length === 0) {
    console.log('\n✅ スラッシュを含むSlugを持つ記事はありません');
    return;
  }

  console.log(`\n🚨 スラッシュを含むSlug: ${invalidRecords.length}件`);

  for (const record of invalidRecords) {
    console.log(`\n📝 記事: ${record.fields.Title}`);
    console.log(`   Slug: ${record.fields.Slug}`);
    console.log(`   → draftに変更`);

    await base('News').update(record.id, {
      Status: 'draft',
    });
  }

  console.log(`\n🎉 ${invalidRecords.length}件の記事をdraftに変更しました`);
}

fixSlashSlugs().catch(console.error);
