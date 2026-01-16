#!/usr/bin/env node
/**
 * 中央競馬（JRA）重賞予想スクレイピング - Yahoo!スポーツ版
 *
 * 機能:
 * 1. Yahoo!スポーツ競馬ページから重賞予想記事を取得
 * 2. G1/G2/G3を含む記事のみ対象
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
 * Yahoo!スポーツから重賞予想記事を取得
 */
async function fetchGradeRacePredictions() {
  console.log('🔍 Yahoo!スポーツ競馬 重賞予想取得中...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    await page.goto('https://sports.yahoo.co.jp/keiba/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 記事リストを取得
    const articles = await page.evaluate(() => {
      const items = [];
      const articleItems = Array.from(document.querySelectorAll('.sn-timeLine__item'));

      articleItems.forEach((item) => {
        const titleEl = item.querySelector('.sn-timeLine__itemTitle');
        const linkEl = item.querySelector('.sn-timeLine__itemArticleLink');

        if (titleEl && linkEl) {
          const title = titleEl.textContent?.trim() || '';
          const url = linkEl.href || '';

          // G1/G2/G3または重賞キーワードを含む記事のみ
          const isGradeRace = /G[123]|GⅠ|GⅡ|GⅢ|金杯|重賞|予想/.test(title);

          if (title && url && isGradeRace) {
            items.push({
              title: title,
              url: url
            });
          }
        }
      });

      return items.slice(0, 5); // 最大5件
    });

    console.log(`   取得した重賞予想記事: ${articles.length}件`);
    articles.forEach(article => {
      console.log(`   - ${article.title}`);
    });

    return articles;

  } catch (error) {
    console.error('❌ スクレイピングエラー:', error.message);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * Slug生成（英数字のみ、日付+トラック+グレード）
 */
function generateSlug(track, grade, date) {
  // トラック名をローマ字に変換
  const trackMap = {
    '中山': 'nakayama',
    '京都': 'kyoto',
    '阪神': 'hanshin',
    '中京': 'chukyo',
    '東京': 'tokyo',
    '新潟': 'niigata',
    '福島': 'fukushima',
    '小倉': 'kokura',
    '札幌': 'sapporo',
    '函館': 'hakodate',
    '中央競馬場': 'chuou'
  };

  const trackSlug = trackMap[track] || 'chuou';
  const gradeSlug = grade.toLowerCase();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  return `${trackSlug}-${gradeSlug}-${dateStr}`;
}

/**
 * グレード判定
 */
function detectGrade(title) {
  if (/GⅠ|GI/.test(title)) return 'GI';
  if (/GⅡ|GII/.test(title)) return 'GII';
  if (/GⅢ|GIII|G3|金杯/.test(title)) return 'GIII';
  return 'GIII'; // デフォルト
}

/**
 * レース名抽出
 */
function extractRaceName(title) {
  // 「中山金杯」「京都金杯」などのレース名を抽出
  const raceMatches = title.match(/(中山|京都|阪神|中京|東京|新潟|福島|小倉|札幌|函館)(金杯|記念|大賞典|ステークス|カップ|杯|賞)/);
  if (raceMatches) return raceMatches[0];

  // G1/G2/G3の前後からレース名を推測
  const gradeMatches = title.match(/(\w+)(G[123]|GⅠ|GⅡ|GⅢ)/);
  if (gradeMatches) return gradeMatches[1];

  return '重賞レース';
}

/**
 * 競馬場抽出
 */
function extractTrack(title) {
  const trackMatches = title.match(/(中山|京都|阪神|中京|東京|新潟|福島|小倉|札幌|函館)/);
  return trackMatches ? trackMatches[1] : '中央競馬場';
}

/**
 * yosou-keiba-matome用に記事データを整形
 */
function formatArticle(article) {
  const today = new Date();

  const raceName = extractRaceName(article.title);
  const track = extractTrack(article.title);
  const grade = detectGrade(article.title);

  // 日付フォーマット（月/日形式）
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const dateStr = `${month}/${day}`;

  // タイトル生成（2ch風、日付付き）
  const title = `【${track} ${grade}】${raceName} 予想スレ【${dateStr}】`;

  // Slug生成（英数字のみ）
  const slug = generateSlug(track, grade, today);

  // 要約生成
  const summary = `${raceName}（${grade}）の予想情報\n\n※ 詳細はYahoo!スポーツをご確認ください`;

  return {
    Title: title,
    Slug: slug,
    RaceName: raceName,
    RaceDate: today.toISOString().split('T')[0],
    Track: track,
    Grade: grade,
    Category: '中央重賞',
    SourceURL: article.url,
    SourceSite: 'その他',  // 既存の選択肢を使用
    Summary: summary,
    Status: 'draft',  // コメント生成前はdraft
    PublishedAt: today.toISOString()
  };
}

/**
 * Airtable重複チェック
 */
async function isDuplicate(slug) {
  try {
    const records = await base('News')
      .select({
        filterByFormula: `{Slug} = '${slug}'`,
        maxRecords: 1
      })
      .firstPage();

    return records.length > 0;
  } catch (error) {
    console.error('重複チェックエラー:', error.message);
    return false;
  }
}

/**
 * Airtableに保存
 */
async function saveToAirtable(article) {
  try {
    await base('News').create(article);
    console.log(`   ✅ 保存成功: ${article.Title}`);
    return true;
  } catch (error) {
    console.error(`   ❌ 保存エラー: ${article.Title}`, error.message);
    return false;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🏇 中央競馬重賞予想取得\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Yahoo!スポーツから記事取得
  const articles = await fetchGradeRacePredictions();

  if (articles.length === 0) {
    console.log('\nℹ️  今週末の重賞予想記事はありません（スキップ）');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }

  // 2. 記事を整形
  const formattedArticles = articles.map(formatArticle);

  // 3. Airtableに保存
  let savedCount = 0;
  let skippedCount = 0;

  for (const article of formattedArticles) {
    const duplicate = await isDuplicate(article.Slug);

    if (duplicate) {
      console.log(`   ⏭️  スキップ（重複）: ${article.Title}`);
      skippedCount++;
      continue;
    }

    const saved = await saveToAirtable(article);
    if (saved) savedCount++;

    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 完了: ${savedCount}件保存、${skippedCount}件スキップ`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// 実行
main().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
