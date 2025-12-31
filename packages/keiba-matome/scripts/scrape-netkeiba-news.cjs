/**
 * netkeiba ニュース取得スクリプト
 *
 * 使い方:
 * AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/scrape-netkeiba-news.cjs
 */

const Airtable = require('airtable');
const puppeteer = require('puppeteer');
const {
  cleanTitle,
  generateSlug,
  generate2chTitle,
  detectCategory,
  detectTags,
  withRetry,
  isDuplicate,
  saveToAirtableWithRateLimit
} = require('../../shared/lib/scraping-utils.cjs');

// 環境変数チェック
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
const ARTICLE_COUNT = parseInt(process.env.ARTICLE_COUNT || '3', 10); // デフォルト3件

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required');
  process.exit(1);
}

console.log(`📰 記事取得数: ${ARTICLE_COUNT}件`);

// Airtable初期化
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

/**
 * netkeiba ニュース取得（Puppeteer実装）
 */
async function scrapeNetkeibaNews() {
  console.log('📰 netkeiba ニュース取得開始...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('🌐 https://news.netkeiba.com/ にアクセス中...');
    await page.goto('https://news.netkeiba.com/', { waitUntil: 'networkidle2', timeout: 60000 });

    // JavaScriptレンダリング完了を待つ
    await page.waitForSelector('.NewsTitle', { timeout: 10000 }).catch(() => {
      console.log('⚠️  NewsTitleが見つかりません。別のセレクタを試します...');
    });

    // 記事リストを取得
    const articles = await page.evaluate(() => {
      const items = [];

      // ニュース記事タイトルを取得
      const newsTitles = Array.from(document.querySelectorAll('h2.NewsTitle'));

      newsTitles.slice(0, 10).forEach((h2) => {
        // h2の中または直後のaタグを探す
        const link = h2.querySelector('a') || h2.closest('a') || h2.nextElementSibling?.querySelector('a');

        if (link) {
          // aタグのテキストだけを取得（時刻情報を含むh2全体ではなく）
          let title = link.textContent?.trim() || '';
          const url = link.href || '';

          // タイトルから余計な情報を削除
          // （例: 改行以降の時刻情報「35分前 3 0」など）
          title = title
            .replace(/\n.*$/s, '')  // 最初の改行以降を削除
            .replace(/\s+\d+分前.*$/, '')  // 時刻情報を削除
            .replace(/\s+\d+時間前.*$/, '')
            .replace(/\s+\d+日前.*$/, '')
            .trim();

          if (title && url && url.includes('netkeiba.com')) {
            items.push({
              sourceTitle: title,
              sourceURL: url,
              sourceSite: 'netkeiba',
            });
          }
        }
      });

      // 見つからない場合は全てのaタグを試す
      if (items.length === 0) {
        const allLinks = Array.from(document.querySelectorAll('a'));
        allLinks.forEach((link) => {
          let title = link.textContent?.trim() || '';
          const url = link.href || '';

          // タイトルクリーンアップ
          title = title
            .replace(/\n.*$/s, '')
            .replace(/\s+\d+分前.*$/, '')
            .replace(/\s+\d+時間前.*$/, '')
            .replace(/\s+\d+日前.*$/, '')
            .trim();

          // ニュース記事のURLパターン
          if (title && url && url.includes('news.netkeiba.com') && url.includes('?pid=news_view')) {
            items.push({
              sourceTitle: title,
              sourceURL: url,
              sourceSite: 'netkeiba',
            });
          }
        });
      }

      return items; // すべて返す（後でフィルタ）
    });

    await browser.close();

    if (articles.length === 0) {
      console.log('⚠️  記事が見つかりませんでした。モックデータを使用します。');
      return getFallbackArticles();
    }

    // 指定件数にフィルタ
    const filteredArticles = articles.slice(0, ARTICLE_COUNT);

    // カテゴリ・タグ・要約を付与
    const enrichedArticles = filteredArticles.map(article => {
      const category = detectCategory(article.sourceTitle);
      const tags = detectTags(article.sourceTitle, category);

      return {
        ...article,
        summary: article.sourceTitle, // 要約はタイトルと同じ（詳細取得は負荷が高いため）
        category,
        tags,
      };
    });

    console.log(`✅ ${enrichedArticles.length}件の記事を取得しました`);
    return enrichedArticles;

  } catch (error) {
    console.error('❌ スクレイピングエラー:', error.message);
    if (browser) await browser.close();

    console.log('⚠️  フォールバックモードでモックデータを使用します');
    return getFallbackArticles();
  }
}

/**
 * フォールバック用モックデータ
 */
function getFallbackArticles() {
  return [
    {
      sourceTitle: '【阪神JF】2歳牝馬の頂点を決める一戦、注目の出走馬は',
      sourceURL: 'https://news.netkeiba.com/news/?pid=news_view&no=999991',
      sourceSite: 'netkeiba',
      summary: '阪神ジュベナイルフィリーズが阪神競馬場で開催。2歳牝馬のチャンピオンを決める重要なG1レースとなる。',
      category: '速報',
      tags: ['G1'],
    },
    {
      sourceTitle: '競馬予想サイト「的中マスター」が突然サービス終了を発表',
      sourceURL: 'https://news.netkeiba.com/news/?pid=news_view&no=999992',
      sourceSite: 'netkeiba',
      summary: '人気競馬予想サイト「的中マスター」が事前告知なしでサービス終了。会員から返金を求める声が相次いでいる。',
      category: '炎上',
      tags: ['予想サイト', '詐欺', '炎上'],
    },
  ];
}

/**
 * Airtableに記事を保存
 */
async function saveToAirtable(articles) {
  console.log('💾 Airtableに記事を保存中...');

  let created = 0;
  let skipped = 0;

  for (const article of articles) {
    const cleanedTitle = cleanTitle(article.sourceTitle);
    const slug = generateSlug(cleanedTitle);
    const title = generate2chTitle(cleanedTitle, article.category);

    try {
      // 重複チェック（共通ユーティリティ使用）
      if (await isDuplicate(base, 'News', slug)) {
        console.log(`⏭️  スキップ: ${title} (既存)`);
        skipped++;
        continue;
      }

      // Summary長さ調整（150文字前後）
      let summary = article.summary || cleanedTitle;
      if (summary.length > 160) {
        summary = summary.substring(0, 150) + '...';
      }

      // 新規作成（共通ユーティリティ使用）
      await saveToAirtableWithRateLimit(base, 'News', {
        Title: title,
        Slug: slug,
        SourceTitle: cleanedTitle,
        SourceURL: article.sourceURL,
        SourceSite: article.sourceSite,
        Summary: summary,
        Category: article.category,
        Tags: article.tags,
        Status: 'draft', // コメント生成前はdraft
        ViewCount: 0,
        CommentCount: 0,
        PublishedAt: new Date().toISOString(),
      });

      console.log(`✅ 作成: ${title}`);
      created++;
    } catch (error) {
      console.error(`❌ エラー: ${title}`, error.message);
    }
  }

  console.log(`\n📊 結果: ${created}件作成、${skipped}件スキップ`);
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🚀 netkeiba記事取得スクリプト開始\n');

    // 1. ニュース取得
    const articles = await scrapeNetkeibaNews();

    // 2. Airtableに保存
    await saveToAirtable(articles);

    console.log('\n✅ 完了しました！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
