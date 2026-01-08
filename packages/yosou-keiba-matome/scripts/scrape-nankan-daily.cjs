#!/usr/bin/env node
/**
 * nankan-analytics 平日メインレース予想取得スクリプト
 *
 * 機能:
 * 1. nankan-analyticsのallRacesPrediction.jsonからメインレース予想を取得
 * 2. yosou-keiba-matome用に整形してAirtableに保存
 * 3. 予想がない日は自動的にスキップ
 *
 * 使い方:
 * AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/scrape-nankan-daily.cjs
 */

const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

/**
 * 南関重賞リスト（2026年版）
 * レース名の一部でもマッチするように簡略化
 */
const NANKAN_GRADED_RACES = {
  // GI / JpnI
  'JpnI': [
    '川崎記念', '羽田盃', 'かしわ記念', '東京ダービー', 'さきたま杯', '帝王賞',
    'ジャパンダートクラシック', '全日本２歳優駿'
  ],
  // JpnII
  'JpnII': [
    'ダイオライト記念', '京浜盃', 'エンプレス杯', '関東オークス',
    'レディスプレリュード', '東京盃', '浦和記念', '日本テレビ盃'
  ],
  // JpnIII
  'JpnIII': [
    'ブルーバードカップ', 'クイーン賞', '雲取賞', '東京スプリント',
    'スパーキングレディーカップ', 'オーバルスプリント', 'マリーンカップ'
  ],
  // GI (東京大賞典)
  'GI': ['東京大賞典'],
  // SI
  'SI': [
    '桜花賞', '京成盃グランドマイラーズ', '東京プリンセス賞', '大井記念',
    '戸塚記念', 'ロジータ記念', 'ハイセイコー記念', 'ゴールドカップ',
    '東京２歳優駿牝馬'
  ],
  // SII
  'SII': [
    '金盃', 'ユングフラウ賞', '東京湾カップ', '優駿スプリント',
    '習志野きらっとスプリント', 'スパーキングサマーカップ', '東京記念',
    '鎌倉記念', 'マイルグランプリ', '平和賞', 'ローレル賞', '勝島王冠'
  ],
  // SIII
  'SIII': [
    '川崎マイラーズ', 'ニューイヤーカップ', '報知グランプリカップ', '報知オールスターカップ',
    'フジノウェーブ記念', 'ネクストスター東日本', 'クラウンカップ', 'ブリリアントカップ',
    'しらさぎ賞', 'プラチナカップ', '若潮スプリント', '川崎スパーキングスプリント',
    'サンタアニタトロフィー', 'ルーキーズサマーカップ', '黒潮盃', 'フリオーソレジェンドカップ',
    'アフター５スター賞', '若武者賞', 'ゴールドジュニア', '埼玉栄冠',
    '船橋記念', 'サザンスタースプリント', 'ジェムストーン賞', '東京シンデレラマイル'
  ]
};

/**
 * レース名から格付けを判定
 * @param {string} raceName - レース名
 * @returns {object} { grade: string, isGraded: boolean }
 */
function detectGrade(raceName) {
  // 各グレードのリストをチェック
  for (const [grade, raceList] of Object.entries(NANKAN_GRADED_RACES)) {
    for (const race of raceList) {
      // レース名に含まれるかチェック（部分一致）
      if (raceName.includes(race)) {
        return { grade, isGraded: true };
      }
    }
  }

  // 重賞ではない場合
  return { grade: 'メインレース', isGraded: false };
}

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

// nankan-analyticsのJSONファイルパス
// 環境変数で上書き可能（GitHub Actions用）
const NANKAN_JSON_PATH = process.env.NANKAN_JSON_PATH || path.join(
  __dirname,
  '../../../../nankan-analytics/astro-site/src/data/allRacesPrediction.json'
);

/**
 * nankan-analyticsのJSONからメインレース予想を取得
 */
function getMainRacePrediction() {
  try {
    // JSONファイル読み込み
    if (!fs.existsSync(NANKAN_JSON_PATH)) {
      console.error(`❌ JSONファイルが見つかりません: ${NANKAN_JSON_PATH}`);
      return null;
    }

    const data = JSON.parse(fs.readFileSync(NANKAN_JSON_PATH, 'utf-8'));

    // メインレースを検索
    const mainRace = data.races.find(race => race.isMainRace === true);

    if (!mainRace) {
      console.log('ℹ️  今日のメインレース予想はありません（スキップ）');
      return null;
    }

    return {
      raceDate: data.raceDate,
      track: data.track,
      race: mainRace,
    };
  } catch (error) {
    console.error('❌ JSON読み込みエラー:', error.message);
    return null;
  }
}

/**
 * yosou-keiba-matome用に記事データを整形
 */
function formatArticle(prediction) {
  const { raceDate, track, race } = prediction;
  const { raceInfo, horses, raceNumber } = race;

  // 競馬場名から短縮名を取得（例: 浦和競馬 → 浦和）
  const trackShort = track.replace('競馬', '');

  // 日付フォーマット（月/日形式）
  const dateObj = new Date(raceDate);
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const dateStr = `${month}/${day}`;

  // タイトル生成（2ch風・詳細・日付付き）
  const raceName = raceInfo.raceName.split('（')[0];
  const mainHorse = horses.main.name;
  const subHorse = horses.sub.name;
  const title = `【${trackShort} ${raceNumber}】${raceName} 本命◎${mainHorse} 対抗○${subHorse}で勝負！【${dateStr}】`;

  // Slug生成
  const slug = `${trackShort}-${raceDate}-${raceNumber}`;

  // 予想サマリー生成（シンプルに）
  let summary = `
${trackShort} ${raceNumber} ${raceInfo.raceName}

本命: ${horses.main.number}番 ${horses.main.name}
対抗: ${horses.sub.number}番 ${horses.sub.name}
単穴: ${horses.hole1.number}番 ${horses.hole1.name}`;

  // hole2が存在する場合は追加
  if (horses.hole2) {
    summary += `\n単穴: ${horses.hole2.number}番 ${horses.hole2.name}`;
  }

  summary += `\n\n発走時刻: ${raceInfo.startTime}`;
  summary = summary.trim();

  // レース名から格付けを判定
  const gradeInfo = detectGrade(raceName);

  return {
    Title: title,
    Slug: slug,
    RaceName: raceInfo.raceName.split('（')[0], // カッコ前まで
    RaceDate: raceDate,
    Track: trackShort,
    Grade: gradeInfo.grade,
    Category: gradeInfo.isGraded ? '南関重賞' : '南関メイン',
    SourceURL: 'https://nankan-analytics.keiba.link/free-prediction/',
    SourceSite: 'その他',
    Summary: summary,
    Status: 'draft',
    ViewCount: 0,
    CommentCount: 0,
    PublishedAt: new Date().toISOString(),
  };
}

/**
 * Airtableに記事を保存
 */
async function saveToAirtable(article) {
  try {
    // 既存記事チェック（同じSlugがないか）
    const existingRecords = await base('News')
      .select({
        filterByFormula: `{Slug} = '${article.Slug}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (existingRecords.length > 0) {
      console.log(`ℹ️  既に投稿済み: ${article.Title}`);
      console.log(`   Slug: ${article.Slug}\n`);
      return null;
    }

    // 新規作成
    const record = await base('News').create(article);
    console.log(`✅ 記事を投稿しました: ${article.Title}`);
    console.log(`   Slug: ${article.Slug}`);
    console.log(`   レース日: ${article.RaceDate}`);
    console.log(`   競馬場: ${article.Track}\n`);

    return record;
  } catch (error) {
    console.error(`❌ Airtable保存エラー:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🏇 nankan-analytics 平日メインレース予想取得\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. nankan-analyticsからメインレース予想を取得
    console.log('📊 メインレース予想を確認中...');
    const prediction = getMainRacePrediction();

    if (!prediction) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ 処理完了（予想なし）');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(0);
    }

    console.log(`   競馬場: ${prediction.track}`);
    console.log(`   レース: ${prediction.race.raceNumber}`);
    console.log(`   本命: ${prediction.race.horses.main.number}番 ${prediction.race.horses.main.name}\n`);

    // 2. 記事データに整形
    console.log('📝 記事データを整形中...');
    const article = formatArticle(prediction);
    console.log(`   タイトル: ${article.Title}`);
    console.log(`   Slug: ${article.Slug}\n`);

    // 3. Airtableに保存
    console.log('💾 Airtableに保存中...');
    const record = await saveToAirtable(article);

    // 4. サマリー
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (record) {
      console.log('✅ 処理完了（記事投稿成功）');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📝 次のステップ');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('1. 2ch風コメント自動生成:');
      console.log('   ANTHROPIC_API_KEY=xxx AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx \\');
      console.log('   node ../shared/scripts/generate-2ch-comments.cjs\n');
      console.log('2. 開発サーバーで確認:');
      console.log('   npm run dev\n');
      console.log('3. ブラウザで確認:');
      console.log('   http://localhost:4325/\n');
    } else {
      console.log('✅ 処理完了（既に投稿済み）');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ エラーが発生しました');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error(error.message);
    console.error('\n');
    process.exit(1);
  }
}

main();
