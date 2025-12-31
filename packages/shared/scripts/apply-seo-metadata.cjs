/**
 * apply-seo-metadata.cjs
 *
 * SEO最適化で生成されたメタデータをAirtableに適用するスクリプト
 *
 * 使い方:
 * node packages/shared/scripts/apply-seo-metadata.cjs --project=keiba-matome
 */

const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

// プロジェクト設定
const PROJECT_CONFIG = {
  'keiba-matome': {
    baseId: 'appdHJSC4F9pTIoDj',
    tableName: 'News',
    metadataPath: 'packages/seo-output/keiba-matome/metadata.json'
  },
  'chihou-keiba-matome': {
    baseId: 'appt25zmKxQDiSCwh',
    tableName: 'News',
    metadataPath: 'packages/seo-output/chihou-keiba-matome/metadata.json'
  },
  'yosou-keiba-matome': {
    baseId: 'appKPasSpjpTtabnv',
    tableName: 'Articles',
    metadataPath: 'packages/seo-output/yosou-keiba-matome/metadata.json'
  }
};

async function main() {
  // コマンドライン引数の解析
  const args = process.argv.slice(2);
  const projectArg = args.find(arg => arg.startsWith('--project='));

  if (!projectArg) {
    console.error('❌ エラー: --project=<project-name> を指定してください');
    console.error('例: node apply-seo-metadata.cjs --project=keiba-matome');
    process.exit(1);
  }

  const projectName = projectArg.split('=')[1];
  const config = PROJECT_CONFIG[projectName];

  if (!config) {
    console.error(`❌ エラー: 不明なプロジェクト名 "${projectName}"`);
    console.error(`利用可能: ${Object.keys(PROJECT_CONFIG).join(', ')}`);
    process.exit(1);
  }

  // 環境変数チェック
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  if (!AIRTABLE_API_KEY) {
    console.error('❌ エラー: AIRTABLE_API_KEY環境変数が設定されていません');
    process.exit(1);
  }

  console.log(`\n🚀 ${projectName} のSEOメタデータ適用を開始\n`);

  // メタデータJSONファイルの読み込み
  const metadataFilePath = path.join(process.cwd(), config.metadataPath);
  if (!fs.existsSync(metadataFilePath)) {
    console.error(`❌ エラー: メタデータファイルが見つかりません: ${metadataFilePath}`);
    console.error('先にoptimize-seo.cjsを実行してください');
    process.exit(1);
  }

  const metadataList = JSON.parse(fs.readFileSync(metadataFilePath, 'utf-8'));
  console.log(`📄 メタデータ読み込み: ${metadataList.length}件\n`);

  // Airtable接続
  const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(config.baseId);
  const table = base(config.tableName);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const item of metadataList) {
    const { article, metadata, structuredData } = item;

    try {
      // 既存フィールドの確認
      const existingRecords = await table.select({
        filterByFormula: `RECORD_ID() = '${article.id}'`,
        maxRecords: 1
      }).firstPage();

      if (existingRecords.length === 0) {
        console.log(`⏭️  スキップ: ${article.title}（レコードが見つかりません）`);
        skipCount++;
        continue;
      }

      const record = existingRecords[0];

      // 更新データの準備
      const updateFields = {
        MetaTitle: metadata.metaTitle,
        MetaDescription: metadata.metaDescription,
        OgTitle: metadata.ogTitle,
        OgDescription: metadata.ogDescription,
        Keywords: metadata.keywords.join(', '),
        StructuredData: JSON.stringify(structuredData, null, 2)
      };

      // Airtableに更新
      await table.update(article.id, updateFields);

      console.log(`✅ 成功: ${article.title}`);
      console.log(`   MetaTitle: ${metadata.metaTitle.substring(0, 50)}...`);
      successCount++;

      // レート制限対策（200ms待機）
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`❌ エラー: ${article.title}`);
      console.error(`   ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 実行結果:`);
  console.log(`   成功: ${successCount}件`);
  console.log(`   スキップ: ${skipCount}件`);
  console.log(`   エラー: ${errorCount}件`);
  console.log(`\n✨ SEOメタデータの適用が完了しました！\n`);
}

main().catch(error => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
