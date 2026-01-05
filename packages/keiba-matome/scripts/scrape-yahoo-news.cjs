/**
 * Yahoo!ニュース（競馬カテゴリ）取得スクリプト
 *
 * 使い方:
 * AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/scrape-yahoo-news.cjs
 */

const Airtable = require('airtable');
const puppeteer = require('puppeteer');

// 環境変数チェック
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required');
  process.exit(1);
}

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
 * 2ch風スレタイ生成
 */
function generate2chTitle(originalTitle, category) {
  const prefix = {
    '速報': '【速報】',
    '炎上': '【悲報】',
    'まとめ': '【議論】',
    'ランキング': '【朗報】',
  }[category] || '【ニュース】';

  return `${prefix}${originalTitle}`;
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
  if (title.match(/G1|G2|G3|GⅠ|GⅡ|GⅢ|レース|勝利|優勝|着順|騎手|コメント|結果|有馬記念|ダービー|ジュベナイル|スプリント|カペラ|取りやめ|中止|延期|開催|出走|馬場|スタート|全着順/)) {
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
 * Yahoo!ニュース取得（Puppeteer実装）
 */
async function scrapeYahooNews() {
  console.log('📰 Yahoo!ニュース取得開始...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('🌐 https://sports.yahoo.co.jp/keiba/ にアクセス中...');
    await page.goto('https://sports.yahoo.co.jp/keiba/', { waitUntil: 'networkidle2', timeout: 60000 });

    // JavaScriptレンダリング完了を待つ
    await page.waitForSelector('.sn-timeLine__item', { timeout: 10000 }).catch(() => {
      console.log('⚠️  記事リストが見つかりません。');
    });

    // 記事リストを取得
    const articles = await page.evaluate(() => {
      const items = [];

      // 記事一覧を取得
      const articleItems = Array.from(document.querySelectorAll('.sn-timeLine__item'));

      articleItems.slice(0, 5).forEach((item) => {
        const titleEl = item.querySelector('.sn-timeLine__itemTitle');
        const linkEl = item.querySelector('.sn-timeLine__itemArticleLink');
        const creditEl = item.querySelector('.sn-timeLine__itemCredit');

        if (titleEl && linkEl) {
          const title = titleEl.textContent?.trim() || '';
          const url = linkEl.href || '';
          const credit = creditEl?.textContent?.trim() || '';

          if (title && url) {
            items.push({
              sourceTitle: title,
              sourceURL: url,
              sourceSite: 'Yahoo', // Airtableの既存オプション「Yahoo」に統一
            });
          }
        }
      });

      return items;
    });

    await browser.close();

    if (articles.length === 0) {
      console.log('⚠️  記事が見つかりませんでした。モックデータを使用します。');
      return getFallbackArticles();
    }

    // カテゴリ・タグ・要約を付与
    const enrichedArticles = articles.map(article => {
      const category = detectCategory(article.sourceTitle);
      const tags = detectTags(article.sourceTitle, category);

      return {
        ...article,
        summary: article.sourceTitle, // 要約はタイトルと同じ
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
 * 地方競馬記事の判定（chihou-keiba-matomeで扱うべき記事）
 */
function isChihouKeiba(title) {
  const chihouKeywords = [
    // 南関東4競馬
    '大井', 'TCK', '東京シティ競馬',
    '船橋',
    '川崎',
    '浦和',
    '南関',

    // 全国地方競馬場
    '門別', '盛岡', '水沢', '金沢', '笠松', '名古屋',
    '園田', '姫路', '高知', '佐賀', 'ホッカイドウ',

    // 地方競馬ワード
    '地方競馬', '地方重賞', 'NAR', 'nar',

    // 地方G1・重賞
    '東京大賞典', '川崎記念', '帝王賞', 'ジャパンダートダービー',
    'かしわ記念', 'JBC', 'トゥインクル', '羽田盃', '黒潮盃',
    '兵庫ゴールドトロフィー', '東京記念'
  ];

  return chihouKeywords.some(keyword => title.includes(keyword));
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
      // 地方競馬記事をフィルタリング（chihou-keiba-matomeで扱う）
      if (isChihouKeiba(article.sourceTitle)) {
        console.log(`⏭️  スキップ: ${title} (地方競馬記事 - chihou.keiba-matome.jpで扱います)`);
        skipped++;
        continue;
      }

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
            SourceSite: 'netkeiba', // 既存のオプション「netkeiba」を使用（Yahoo記事も一旦これで保存）
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
    console.log('🚀 Yahoo!ニュース取得スクリプト開始\n');

    // 1. ニュース取得
    const articles = await scrapeYahooNews();

    // 2. Airtableに保存
    await saveToAirtable(articles);

    console.log('\n✅ 完了しました！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
