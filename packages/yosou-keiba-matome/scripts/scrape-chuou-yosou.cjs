#!/usr/bin/env node
/**
 * 中央競馬（JRA）重賞予想スクレイピング
 *
 * 機能:
 * 1. netkeibaの予想コラムから週末の重賞レース予想を取得
 * 2. G1/G2/G3レースのみ対象
 * 3. yosou-keiba-matome用に整形してAirtableに保存
 *
 * 使い方:
 * AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx node scripts/scrape-chuou-yosou.cjs
 */

const Airtable = require('airtable');
const puppeteer = require('puppeteer');

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

/**
 * netkeibaから今週末の重賞レース一覧を取得
 */
async function fetchWeekendGradeRaces() {
  console.log('🔍 netkeiba 重賞レース情報取得中...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // netkeiba 重賞レースカレンダー
    await page.goto('https://race.netkeiba.com/top/calendar.html', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // 今週末の重賞レースを抽出
    const races = await page.evaluate(() => {
      const raceElements = document.querySelectorAll('.RaceCalendar_LabelGrade');
      const results = [];

      raceElements.forEach(el => {
        const gradeText = el.textContent.trim();
        const isGrade = /^(G[123]|Jpn[123])$/.test(gradeText);

        if (isGrade) {
          const raceLink = el.closest('a');
          if (raceLink) {
            const raceName = raceLink.querySelector('.RaceCalendar_RaceName')?.textContent.trim();
            const trackInfo = raceLink.querySelector('.RaceCalendar_Place')?.textContent.trim();
            const dateInfo = raceLink.querySelector('.RaceCalendar_Date')?.textContent.trim();
            const raceUrl = raceLink.href;

            if (raceName && trackInfo && raceUrl) {
              results.push({
                raceName,
                grade: gradeText,
                track: trackInfo.split(/\d/)[0], // 競馬場名のみ抽出
                date: dateInfo,
                url: raceUrl
              });
            }
          }
        }
      });

      return results;
    });

    console.log(`   取得したレース数: ${races.length}件`);
    races.forEach(race => {
      console.log(`   - ${race.raceName} (${race.grade}・${race.track})`);
    });

    return races;

  } catch (error) {
    console.error('❌ スクレイピングエラー:', error.message);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * yosou-keiba-matome用に記事データを整形
 */
function formatArticle(race) {
  const today = new Date();
  const weekendDate = getNextWeekendDate();

  // タイトル生成
  const title = `【${race.track} ${race.grade}】${race.raceName}`;

  // Slug生成
  const slug = `${race.track}-${formatDate(weekendDate)}-${race.raceName.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '')}`;

  // 予想サマリー生成（後でスクレイピングで充実させる）
  const summary = `
${race.track} ${race.raceName}（${race.grade}）

開催日: ${race.date}
競馬場: ${race.track}

※ 予想詳細はnetkeiba予想コラムをご確認ください
  `.trim();

  return {
    Title: title,
    Slug: slug,
    RaceName: race.raceName,
    RaceDate: formatDate(weekendDate),
    Track: race.track,
    Grade: race.grade,
    Category: '中央重賞',
    SourceURL: race.url,
    SourceSite: 'netkeiba',
    Summary: summary,
    Status: 'published',
    ViewCount: 0,
    CommentCount: 0,
    PublishedAt: new Date().toISOString(),
  };
}

/**
 * 次の週末の日付を取得
 */
function getNextWeekendDate() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0(日)〜6(土)

  // 土曜日までの日数を計算
  let daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  if (daysUntilSaturday === 0 && today.getHours() >= 18) {
    // 土曜日18時以降は次の土曜日
    daysUntilSaturday = 7;
  }

  const weekendDate = new Date(today);
  weekendDate.setDate(today.getDate() + daysUntilSaturday);

  return weekendDate;
}

/**
 * 日付フォーマット (YYYY-MM-DD)
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Airtableに記事を保存
 */
async function saveToAirtable(article) {
  try {
    // 既存記事チェック（同じSlugがないか）
    const existingRecords = await base('Articles')
      .select({
        filterByFormula: `{Slug} = '${article.Slug}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (existingRecords.length > 0) {
      console.log(`ℹ️  既に投稿済み: ${article.Title}`);
      return null;
    }

    // 新規作成
    const record = await base('Articles').create(article);
    console.log(`✅ 記事を投稿しました: ${article.Title}`);
    console.log(`   Slug: ${article.Slug}`);
    console.log(`   レース日: ${article.RaceDate}\n`);

    return record;
  } catch (error) {
    console.error(`❌ Airtable保存エラー:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🏇 中央競馬重賞予想取得\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. netkeibaから今週末の重賞レース取得
    const races = await fetchWeekendGradeRaces();

    if (races.length === 0) {
      console.log('\nℹ️  今週末の重賞レースはありません（スキップ）');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(0);
    }

    console.log(`\n📝 ${races.length}件の重賞レース記事を作成中...\n`);

    let savedCount = 0;

    // 2. 各レースを記事化してAirtableに保存
    for (const race of races) {
      const article = formatArticle(race);
      const record = await saveToAirtable(article);
      if (record) {
        savedCount++;
      }
    }

    // 3. サマリー
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 処理完了（${savedCount}/${races.length}件 新規投稿）`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (savedCount > 0) {
      console.log('📝 次のステップ');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('1. 2ch風コメント自動生成:');
      console.log('   ANTHROPIC_API_KEY=xxx AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=xxx \\');
      console.log('   node scripts/generate-2ch-comments.cjs\n');
      console.log('2. 開発サーバーで確認:');
      console.log('   npm run dev\n');
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
