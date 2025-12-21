/**
 * Comments table field test - verify all fields can be saved
 */

const Airtable = require('airtable');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

async function testCommentSave() {
  console.log('🧪 Comments table field test...\n');

  try {
    // 1. Get a published article
    const newsRecords = await base('News')
      .select({
        filterByFormula: `{Status} = 'published'`,
        maxRecords: 1,
      })
      .firstPage();

    if (newsRecords.length === 0) {
      console.log('⚠️  No published articles found');
      return;
    }

    const newsRecord = newsRecords[0];
    console.log(`📰 Test article: ${newsRecord.fields.Title}`);
    console.log(`   Record ID: ${newsRecord.id}\n`);

    // 2. Try to save a test comment
    const testComment = {
      NewsID: [newsRecord.id],
      Number: 999,
      UserID: 'ID:test123',
      Content: 'テストコメント - このコメントは削除してください',
      IsOP: false,
    };

    console.log('💾 Saving test comment...');
    const createdRecord = await base('Comments').create([
      {
        fields: testComment,
      },
    ]);

    console.log('✅ Comment saved successfully!');
    console.log(`   Comment ID: ${createdRecord[0].id}\n`);

    // 3. Delete test comment
    console.log('🗑️  Deleting test comment...');
    await base('Comments').destroy([createdRecord[0].id]);
    console.log('✅ Test comment deleted\n');

    console.log('✅ All Comments table fields are configured correctly!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.statusCode) {
      console.error(`   Status: ${error.statusCode}`);
    }
  }
}

testCommentSave();
