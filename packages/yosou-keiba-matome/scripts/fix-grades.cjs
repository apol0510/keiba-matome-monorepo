#!/usr/bin/env node
/**
 * 既存記事のGrade/Categoryを修正
 *
 * 使い方:
 * AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/fix-grades.cjs
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

// 重賞リスト
const NANKAN_GRADED_RACES = {
  'JpnI': ['川崎記念', '羽田盃', 'かしわ記念', '東京ダービー', 'さきたま杯', '帝王賞', 'ジャパンダートクラシック', '全日本２歳優駿'],
  'JpnII': ['ダイオライト記念', '京浜盃', 'エンプレス杯', '関東オークス', 'レディスプレリュード', '東京盃', '浦和記念', '日本テレビ盃'],
  'JpnIII': ['ブルーバードカップ', 'クイーン賞', '雲取賞', '東京スプリント', 'スパーキングレディーカップ', 'オーバルスプリント', 'マリーンカップ'],
  'GI': ['東京大賞典'],
  'SI': ['桜花賞', '京成盃グランドマイラーズ', '東京プリンセス賞', '大井記念', '戸塚記念', 'ロジータ記念', 'ハイセイコー記念', 'ゴールドカップ', '東京２歳優駿牝馬'],
  'SII': ['金盃', 'ユングフラウ賞', '東京湾カップ', '優駿スプリント', '習志野きらっとスプリント', 'スパーキングサマーカップ', '東京記念', '鎌倉記念', 'マイルグランプリ', '平和賞', 'ローレル賞', '勝島王冠'],
  'SIII': ['川崎マイラーズ', 'ニューイヤーカップ', '報知グランプリカップ', '報知オールスターカップ', 'フジノウェーブ記念', 'ネクストスター東日本', 'クラウンカップ', 'ブリリアントカップ', 'しらさぎ賞', 'プラチナカップ', '若潮スプリント', '川崎スパーキングスプリント', 'サンタアニタトロフィー', 'ルーキーズサマーカップ', '黒潮盃', 'フリオーソレジェンドカップ', 'アフター５スター賞', '若武者賞', 'ゴールドジュニア', '埼玉栄冠', '船橋記念', 'サザンスタースプリント', 'ジェムストーン賞', '東京シンデレラマイル']
};

function detectGrade(raceName) {
  for (const [grade, raceList] of Object.entries(NANKAN_GRADED_RACES)) {
    for (const race of raceList) {
      if (raceName.includes(race)) {
        return { grade, isGraded: true };
      }
    }
  }
  return { grade: 'メインレース', isGraded: false };
}

async function main() {
  try {
    console.log('🔍 全記事のGrade/Categoryを確認中...\n');
    const articles = await base('Articles').select().all();

    console.log(`  全記事数: ${articles.length}`);
    console.log('');

    const toUpdate = [];

    for (const article of articles) {
      const raceName = article.fields.RaceName || '';
      const currentGrade = article.fields.Grade;
      const currentCategory = article.fields.Category;

      const gradeInfo = detectGrade(raceName);

      // 修正が必要かチェック
      if (gradeInfo.isGraded && (currentGrade === 'メインレース' || currentCategory === '南関メイン')) {
        toUpdate.push({
          id: article.id,
          title: article.fields.Title,
          raceName,
          currentGrade,
          currentCategory,
          newGrade: gradeInfo.grade,
          newCategory: '南関重賞'
        });
      }
    }

    console.log(`📊 修正が必要な記事: ${toUpdate.length}件\n`);

    if (toUpdate.length === 0) {
      console.log('✅ すべての記事が正しく分類されています');
      process.exit(0);
    }

    console.log('📝 修正対象:');
    toUpdate.forEach(item => {
      console.log(`  - ${item.title}`);
      console.log(`    Grade: ${item.currentGrade} → ${item.newGrade}`);
      console.log(`    Category: ${item.currentCategory} → ${item.newCategory}`);
      console.log('');
    });

    console.log('🔧 修正中...');

    // 一括更新（最大10件ずつ）
    for (let i = 0; i < toUpdate.length; i += 10) {
      const batch = toUpdate.slice(i, i + 10);

      await base('Articles').update(
        batch.map(item => ({
          id: item.id,
          fields: {
            Grade: item.newGrade,
            Category: item.newCategory
          }
        }))
      );

      console.log(`  ✅ ${Math.min(i + 10, toUpdate.length)}/${toUpdate.length}件を更新`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('');
    console.log('✅ すべての記事のGrade/Categoryを修正しました！');
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

main();
