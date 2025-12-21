#!/usr/bin/env node
/**
 * yosou-keiba-matome サンプル予想記事投入スクリプト
 *
 * 使い方:
 * AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/seed-articles.cjs
 */

const Airtable = require('airtable');

// 環境変数チェック
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ 環境変数が設定されていません');
  console.error('AIRTABLE_API_KEY と AIRTABLE_BASE_ID を設定してください');
  process.exit(1);
}

// Airtable接続
const base = new Airtable({ apiKey }).base(baseId);

// サンプル記事データ
const sampleArticles = [
  {
    fields: {
      Title: '【有馬記念】本命はドウデュース？イクイノックスか？',
      Slug: '有馬記念2025予想',
      RaceName: '有馬記念',
      RaceDate: '2025-12-28',
      Track: '中山',
      Grade: 'G1',
      Category: '中央重賞',
      SourceSite: 'netkeiba',
      Summary: '2025年有馬記念の予想スレ。本命はドウデュース、対抗イクイノックス。昨年の覇者イクイノックスの連覇か、それとも春のダービー馬ドウデュースが制するか。中山2500mのステイヤー適性が問われる。',
      Status: 'published',
      ViewCount: 0,
      CommentCount: 0,
      PublishedAt: new Date().toISOString(),
    },
  },
  {
    fields: {
      Title: '【東京大賞典】南関G1の本命を予想するスレ',
      Slug: '東京大賞典2025予想',
      RaceName: '東京大賞典',
      RaceDate: '2025-12-29',
      Track: '大井',
      Grade: 'JpnG1',
      Category: '南関重賞',
      SourceSite: 'netkeiba',
      Summary: '2025年東京大賞典の予想スレ。南関最大のG1レース。大井2000mのダート巧者が集結。JRA勢と地方勢の対決も見どころ。過去10年で地方馬の勝利は3回のみ。',
      Status: 'published',
      ViewCount: 0,
      CommentCount: 0,
      PublishedAt: new Date().toISOString(),
    },
  },
  {
    fields: {
      Title: '【川崎記念】2026年最初の南関G1予想',
      Slug: '川崎記念2026予想',
      RaceName: '川崎記念',
      RaceDate: '2026-01-26',
      Track: '川崎',
      Grade: 'JpnG1',
      Category: '南関重賞',
      SourceSite: 'netkeiba',
      Summary: '2026年川崎記念の予想スレ。新春の南関G1。川崎2100mは逃げ・先行有利のコース。過去5年の勝ち馬はすべて4角5番手以内。ペース配分が勝敗を分ける。',
      Status: 'published',
      ViewCount: 0,
      CommentCount: 0,
      PublishedAt: new Date().toISOString(),
    },
  },
  {
    fields: {
      Title: '【朝日杯FS】2歳王者決定戦！本命は？',
      Slug: '朝日杯FS2025予想',
      RaceName: '朝日杯フューチュリティステークス',
      RaceDate: '2025-12-20',
      Track: '阪神',
      Grade: 'G1',
      Category: '中央重賞',
      SourceSite: 'netkeiba',
      Summary: '2025年朝日杯FSの予想スレ。2歳王者決定戦。阪神芝1600mの一発勝負。新馬戦・未勝利戦からの出世頭が続々参戦。ダービーへの第一歩となる重要なレース。',
      Status: 'published',
      ViewCount: 0,
      CommentCount: 0,
      PublishedAt: new Date().toISOString(),
    },
  },
  {
    fields: {
      Title: '【浦和記念】地元巧者の本命馬は？',
      Slug: '浦和記念2026予想',
      RaceName: '浦和記念',
      RaceDate: '2026-02-18',
      Track: '浦和',
      Grade: 'JpnG2',
      Category: '南関重賞',
      SourceSite: 'netkeiba',
      Summary: '2026年浦和記念の予想スレ。浦和2000mのG2レース。地元浦和競馬所属馬が有利とされるが、近年は南関他場からの刺客も増加。コース巧者を狙うか、実力上位を狙うか。',
      Status: 'published',
      ViewCount: 0,
      CommentCount: 0,
      PublishedAt: new Date().toISOString(),
    },
  },
];

// サンプルコメントデータ（記事投入後に使用）
const sampleCommentsTemplate = [
  '本命は{horse1}だろ、鉄板すぎる',
  '>>1 いや{horse2}の方が来るって',
  '穴狙いなら{horse3}が面白いぞ',
  'このレースは荒れそうだな、万馬券狙いたい',
  '有料予想使ってる人いる？精度どうよ？',
  '>>5 nankan-analyticsってとこが南関特化で的中率ヤバいらしいぞ',
  '自力予想で負けまくってるから有料試してみるか',
  '予想サイトの口コミって意外と参考になるよな',
  '詐欺サイトに引っかからないように評判は調べとけよ',
  'keiba-review.jpで口コミ見てから決めるわ',
];

async function main() {
  console.log('🚀 サンプル予想記事を投入します...\n');

  try {
    // 既存記事の確認
    console.log('📊 既存記事を確認中...');
    const existingRecords = await base('Articles')
      .select({ maxRecords: 100 })
      .firstPage();

    console.log(`   既存記事数: ${existingRecords.length}件\n`);

    // 記事投入
    console.log('📝 サンプル記事を投入中...');
    const createdRecords = [];

    for (const article of sampleArticles) {
      try {
        const record = await base('Articles').create(article.fields);
        createdRecords.push(record);
        console.log(`   ✅ ${article.fields.Title}`);
        console.log(`      Slug: ${article.fields.Slug}`);
        console.log(`      カテゴリ: ${article.fields.Category}`);
        console.log(`      グレード: ${article.fields.Grade}\n`);
      } catch (error) {
        console.error(`   ❌ ${article.fields.Title}`);
        console.error(`      エラー: ${error.message}\n`);
      }
    }

    // サマリー
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ サンプル記事投入完了');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`投入成功: ${createdRecords.length}件`);
    console.log(`投入失敗: ${sampleArticles.length - createdRecords.length}件`);
    console.log(`総記事数: ${existingRecords.length + createdRecords.length}件\n`);

    // 次のステップ案内
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 次のステップ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. 2ch風コメント自動生成:');
    console.log('   node ../shared/scripts/generate-2ch-comments.cjs\n');
    console.log('2. 開発サーバー起動:');
    console.log('   npm run dev\n');
    console.log('3. ブラウザで確認:');
    console.log('   http://localhost:4325/\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main();
