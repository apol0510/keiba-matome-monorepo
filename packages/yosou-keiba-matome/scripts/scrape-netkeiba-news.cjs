/**
 * netkeiba ニュース取得スクリプト
 *
 * 使い方:
 * AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/scrape-netkeiba-news.cjs
 */

const Airtable = require('airtable');
const puppeteer = require('puppeteer');

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
 * スラッグ生成（日本語そのまま使用）
 */
function generateSlug(title) {
  // 記号を削除・正規化
  let cleaned = title
    .replace(/【|】|\[|\]|「|」|『|』/g, '')  // 括弧を削除
    .replace(/[　\s]+/g, '')  // スペースを削除
    .replace(/[!！?？。、，,\.]/g, '')  // 句読点を削除
    .replace(/\-/g, '')  // ハイフンを削除
    .trim();

  // 日本語をそのまま返す（URLエンコードはpost-to-x.cjsで行う）
  return cleaned;
}

/**
 * 2ch風スレタイ生成（SEO強化版）
 */
function generate2chTitle(originalTitle, category) {
  const patterns = {
    '速報': [
      `【速報】${originalTitle}`,
      `【速報】${originalTitle} - みんなの反応は？`,
    ],
    '炎上': [
      `【悲報】${originalTitle}`,
      `【炎上】${originalTitle} - 被害者続出`,
      `【詐欺？】${originalTitle}`,
    ],
    'まとめ': [
      `【議論】${originalTitle}`,
      `【質問】${originalTitle} - 詳しい人教えて`,
      `【まとめ】${originalTitle}`,
    ],
    'ランキング': [
      `【朗報】${originalTitle}`,
      `【必見】${originalTitle}`,
    ],
  };

  const categoryPatterns = patterns[category] || [`【ニュース】${originalTitle}`];
  const randomIndex = Math.floor(Math.random() * categoryPatterns.length);

  return categoryPatterns[randomIndex];
}

/**
 * カテゴリ判定（優先順位付き）
 */
function detectCategory(title) {
  // 1. 炎上・ネガティブ系（最優先）
  if (title.match(/詐欺|炎上|閉鎖|返金|被害|告発|悪質|トラブル|問題|批判|非難/)) {
    return '炎上';
  }

  // 2. ランキング・まとめ系
  if (title.match(/ランキング|TOP\d+|おすすめ|人気|ベスト|比較/)) {
    return 'ランキング';
  }

  // 3. レース速報系（広範囲にマッチ）
  if (title.match(/G1|G2|G3|GⅠ|GⅡ|GⅢ|レース|勝利|優勝|着順|騎手|コメント|結果|有馬記念|ダービー|ジュベナイル|スプリント|カペラ|取りやめ|中止|延期|開催|出走|馬場/)) {
    return '速報';
  }

  // 4. 議論・まとめ系（デフォルト）
  return 'まとめ';
}

/**
 * タグ判定
 */
function detectTags(title, category) {
  const tags = [];
  if (title.match(/G1|G2|G3|レース/)) tags.push('G1');
  if (title.match(/予想サイト|予想|的中/)) tags.push('予想サイト');
  if (title.match(/詐欺|悪質/)) tags.push('詐欺');
  if (title.match(/炎上|批判/)) tags.push('炎上');

  // 最低1つはタグを付与
  if (tags.length === 0) {
    if (category === '速報') tags.push('G1');
    else if (category === '炎上') tags.push('予想サイト');
    else tags.push('予想サイト');
  }

  return tags;
}

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
  console.log('⚠️  フォールバックは無効化されています。空配列を返します。');
  return [];
}

/**
 * Airtableに記事を保存
 */
async function saveToAirtable(articles) {
  console.log('💾 Airtableに記事を保存中...');

  let created = 0;
  let skipped = 0;

  for (const article of articles) {
    const slug = generateSlug(article.sourceTitle);
    const title = generate2chTitle(article.sourceTitle, article.category);

    try {
      // 既存チェック
      const existing = await base('News')
        .select({
          filterByFormula: `{Slug} = '${slug}'`,
          maxRecords: 1,
        })
        .firstPage();

      if (existing.length > 0) {
        console.log(`⏭️  スキップ: ${title} (既存)`);
        skipped++;
        continue;
      }

      // 新規作成
      await base('News').create([
        {
          fields: {
            Title: title,
            Slug: slug,
            SourceTitle: article.sourceTitle,
            SourceURL: article.sourceURL,
            SourceSite: article.sourceSite,
            Summary: article.summary,
            Category: article.category,
            Tags: article.tags,
            Status: 'draft', // コメント生成前はdraft
            ViewCount: 0,
            CommentCount: 0,
            PublishedAt: new Date().toISOString(),
          },
        },
      ]);

      console.log(`✅ 作成: ${title}`);
      created++;

      // レート制限対策（1秒待機）
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
