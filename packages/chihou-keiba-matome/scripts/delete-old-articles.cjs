const Airtable = require("airtable");

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  console.error("❌ 環境変数が設定されていません");
  process.exit(1);
}

const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);

// 古い記事のキーワード
const oldKeywords = ["有馬記念", "JBC", "ジェイビーシー", "レディスクラシック", "ハルウララ"];

console.log("🔍 古い記事を検索中...");

base("News")
  .select({
    fields: ["Title", "SourceTitle", "PublishedAt", "SourceURL"],
    sort: [{field: "PublishedAt", direction: "desc"}],
    maxRecords: 30
  })
  .firstPage((err, records) => {
    if (err) { console.error("❌ エラー:", err.message); return; }

    const oldArticles = records.filter(record => {
      const title = record.fields.SourceTitle || record.fields.Title || "";
      return oldKeywords.some(keyword => title.includes(keyword));
    });

    console.log(`\n=== 削除対象: ${oldArticles.length}件 ===\n`);

    oldArticles.forEach((record, i) => {
      const pub = record.fields.PublishedAt;
      const title = (record.fields.SourceTitle || record.fields.Title).substring(0, 70);
      const url = record.fields.SourceURL;
      console.log(`${i+1}. ID: ${record.id}`);
      console.log(`   PublishedAt: ${pub}`);
      console.log(`   Title: ${title}`);
      console.log(`   URL: ${url}`);
      console.log(``);
    });

    // 削除を実行
    if (oldArticles.length > 0) {
      console.log("🗑️  削除を実行します...\n");

      const deletePromises = oldArticles.map(record => {
        return base("News").destroy(record.id);
      });

      Promise.all(deletePromises)
        .then(() => {
          console.log(`✅ ${oldArticles.length}件の古い記事を削除しました`);
          console.log(`\n次のGitHub Actions実行（6AM/12PM/6PM）で、SourceURL重複チェックにより再度取得されることはありません。`);
        })
        .catch(err => {
          console.error("❌ 削除エラー:", err.message);
        });
    } else {
      console.log("✅ 削除対象の記事はありません");
    }
  });
