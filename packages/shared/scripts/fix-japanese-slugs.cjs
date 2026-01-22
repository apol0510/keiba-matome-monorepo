/**
 * 既存記事の日本語Slug一括修正スクリプト
 *
 * 使い方:
 * AIRTABLE_API_KEY="xxx" node fix-japanese-slugs.cjs --project=chihou-keiba-matome
 *
 * 対象:
 * - chihou-keiba-matome (appt25zmKxQDiSCwh)
 * - keiba-matome (appdHJSC4F9pTIoDj)
 * - yosou-keiba-matome (appKPasSpjpTtabnv)
 */

const Airtable = require('airtable');
const { generateSlug, cleanTitle } = require('../lib/scraping-utils.cjs');

// 環境変数チェック
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
if (!AIRTABLE_API_KEY) {
  console.error('❌ Error: AIRTABLE_API_KEY is required');
  process.exit(1);
}

// プロジェクト設定
const PROJECTS = {
  'chihou-keiba-matome': 'appt25zmKxQDiSCwh',
  'keiba-matome': 'appdHJSC4F9pTIoDj',
  'yosou-keiba-matome': 'appKPasSpjpTtabnv',
};

// コマンドライン引数パース
const args = process.argv.slice(2);
const projectArg = args.find(arg => arg.startsWith('--project='));
const projectName = projectArg ? projectArg.split('=')[1] : null;

// プロジェクト指定チェック
if (!projectName) {
  console.error('❌ Error: --project=<name> is required');
  console.log('\n使用可能なプロジェクト:');
  Object.keys(PROJECTS).forEach(name => console.log(`  - ${name}`));
  process.exit(1);
}

const BASE_ID = PROJECTS[projectName];
if (!BASE_ID) {
  console.error(`❌ Error: Unknown project "${projectName}"`);
  console.log('\n使用可能なプロジェクト:');
  Object.keys(PROJECTS).forEach(name => console.log(`  - ${name}`));
  process.exit(1);
}

console.log(`\n🔧 ${projectName} の日本語Slug修正開始\n`);
console.log(`Base ID: ${BASE_ID}\n`);

// Airtable初期化
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(BASE_ID);

/**
 * 日本語文字を含むかチェック
 */
function hasJapanese(str) {
  return /[ぁ-んァ-ヶー一-龠]/.test(str);
}

/**
 * 日本語Slug記事を取得して修正
 */
async function fixJapaneseSlugs() {
  console.log('📋 日本語Slugの記事を取得中...\n');

  try {
    // 全記事取得
    const records = await base('News').select({
      maxRecords: 500,
      sort: [{ field: 'PublishedAt', direction: 'desc' }],
      view: 'Grid view'
    }).all();

    // 日本語Slugを持つ記事をフィルタ
    const japaneseSlugRecords = records.filter(r => {
      const slug = r.get('Slug');
      return slug && hasJapanese(slug);
    });

    console.log(`✅ 全記事数: ${records.length}件`);
    console.log(`🔍 日本語Slug記事: ${japaneseSlugRecords.length}件\n`);

    if (japaneseSlugRecords.length === 0) {
      console.log('✨ 修正対象の記事はありません。すべて英数字Slugです。\n');
      return;
    }

    // プレビュー表示
    console.log('=== 修正対象（最大10件表示）===\n');
    japaneseSlugRecords.slice(0, 10).forEach((r, i) => {
      const oldSlug = r.get('Slug');
      const title = r.get('SourceTitle') || r.get('Title');
      const newSlug = generateSlug(title);

      console.log(`${i + 1}. ${title?.substring(0, 40)}...`);
      console.log(`   旧Slug: ${oldSlug?.substring(0, 50)}...`);
      console.log(`   新Slug: ${newSlug}`);
      console.log('');
    });

    // 確認プロンプト（--dry-runオプションがない場合のみ）
    const dryRunArg = args.find(arg => arg === '--dry-run');
    if (dryRunArg) {
      console.log('🔍 --dry-run モード: 実際の更新は行いません\n');
      return;
    }

    console.log(`\n⚠️  ${japaneseSlugRecords.length}件の記事Slugを修正します`);
    console.log('⚠️  この処理は元に戻せません\n');

    // 自動実行（--autoオプションがある場合）
    const autoArg = args.find(arg => arg === '--auto');
    if (!autoArg) {
      console.log('--auto オプションを追加して実行してください\n');
      console.log('例: AIRTABLE_API_KEY="xxx" node fix-japanese-slugs.cjs --project=chihou-keiba-matome --auto\n');
      return;
    }

    console.log('🚀 修正開始...\n');

    let successCount = 0;
    let errorCount = 0;

    // 一括更新（10件ずつバッチ処理）
    for (let i = 0; i < japaneseSlugRecords.length; i += 10) {
      const batch = japaneseSlugRecords.slice(i, i + 10);

      const updates = batch.map(r => {
        const title = r.get('SourceTitle') || r.get('Title');
        const newSlug = generateSlug(title);

        return {
          id: r.id,
          fields: {
            Slug: newSlug
          }
        };
      });

      try {
        await base('News').update(updates);
        successCount += updates.length;
        console.log(`✅ ${i + 1}-${i + updates.length}件目 更新完了`);

        // レート制限対策（200ms待機）
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        errorCount += updates.length;
        console.error(`❌ エラー: ${error.message}`);
      }
    }

    console.log('\n=== 修正完了 ===\n');
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`❌ 失敗: ${errorCount}件\n`);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

// 実行
fixJapaneseSlugs();
