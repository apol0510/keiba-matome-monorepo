/**
 * netkeiba 地方競馬ニュース取得スクリプト
 *
 * 使い方:
 * AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/scrape-netkeiba-chihou.cjs
 */

const Airtable = require('airtable');
const puppeteer = require('puppeteer');

// 環境変数チェック
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
const ARTICLE_COUNT = parseInt(process.env.ARTICLE_COUNT || '5', 10); // デフォルト5件（メインソース）

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required');
  process.exit(1);
}

console.log(`📰 記事取得数: ${ARTICLE_COUNT}件`);

// Airtable初期化
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

/**
 * タイトルクリーンアップ（メディア名+日時削除、50文字前後）
 */
function cleanTitle(title) {
  let cleaned = title
    // メディア名+日時パターンを削除
    .replace(/[^\s]+競馬\d+\/\d+\(.+?\)\s+\d+:\d+$/, '')
    .replace(/デイリースポーツ競馬.*$/, '')
    .replace(/スポニチアネックス競馬.*$/, '')
    .replace(/競馬のおはなし競馬.*$/, '')
    .replace(/netkeiba競馬.*$/, '')
    .replace(/スポーツ報知.*$/, '')
    .replace(/Yahoo!ニュース.*$/, '')
    // 余分な記号・空白を削除
    .replace(/…+$/, '')  // 末尾の三点リーダー
    .replace(/\s+$/, '')  // 末尾の空白
    .trim();

  // 50文字前後に調整（完全な文で終わるように）
  if (cleaned.length > 60) {
    cleaned = cleaned.substring(0, 50) + '...';
  }

  return cleaned;
}

/**
 * スラッグ生成（日本語、50文字以内）
 */
function generateSlug(title) {
  // 記号を削除・正規化
  let cleaned = title
    .replace(/【|】|\[|\]|「|」|『|』/g, '')  // 括弧を削除
    .replace(/[　\s]+/g, '')  // スペースを削除
    .replace(/[!！?？。、，,\.]/g, '')  // 句読点を削除
    .replace(/\-/g, '')  // ハイフンを削除
    .replace(/…/g, '')  // 三点リーダー削除
    .trim();

  // 50文字以内に切り詰め（URL長対策）
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 50);
  }

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
 * カテゴリ判定（地方競馬特化）
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

  // 3. レース速報系（地方競馬特化）
  if (title.match(/大井|船橋|川崎|浦和|南関|地方|レース|勝利|優勝|着順|騎手|コメント|結果|東京大賞典|川崎記念|帝王賞|ジャパンダートダービー|取りやめ|中止|延期|開催|出走|馬場/)) {
    return '速報';
  }

  // 4. 議論・まとめ系（デフォルト）
  return 'まとめ';
}

/**
 * タグ判定（地方競馬特化）
 */
function detectTags(title, category) {
  const tags = [];
  if (title.match(/大井|TCK|東京シティ競馬/)) tags.push('大井競馬');
  if (title.match(/船橋/)) tags.push('船橋競馬');
  if (title.match(/川崎/)) tags.push('川崎競馬');
  if (title.match(/浦和/)) tags.push('浦和競馬');
  if (title.match(/南関/)) tags.push('南関東');
  if (title.match(/予想サイト|予想|的中/)) tags.push('予想サイト');
  if (title.match(/詐欺|悪質/)) tags.push('詐欺');
  if (title.match(/炎上|批判/)) tags.push('炎上');

  // 最低1つはタグを付与
  if (tags.length === 0) {
    if (category === '速報') tags.push('南関東');
    else if (category === '炎上') tags.push('予想サイト');
    else tags.push('地方競馬');
  }

  return tags;
}

/**
 * netkeiba 地方競馬ニュース取得（Puppeteer実装）
 */
async function scrapeNetkeibaChihouNews() {
  console.log('📰 netkeiba 地方競馬ニュース取得開始...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // 地方競馬ニュースページにアクセス
    console.log('🌐 https://nar.netkeiba.com/top/news_list.html にアクセス中...');
    await page.goto('https://nar.netkeiba.com/top/news_list.html', { waitUntil: 'networkidle2', timeout: 60000 });

    // JavaScriptレンダリング完了を待つ
    await page.waitForSelector('.NewsTitle, a', { timeout: 10000 }).catch(() => {
      console.log('⚠️  セレクタが見つかりません。全てのaタグを試します...');
    });

    // 記事リストを取得
    const articles = await page.evaluate(() => {
      const items = [];

      // ニュース記事タイトルを取得
      const newsTitles = Array.from(document.querySelectorAll('h2.NewsTitle, h3.NewsTitle, .news-title'));

      newsTitles.slice(0, 10).forEach((h2) => {
        // h2の中または直後のaタグを探す
        const link = h2.querySelector('a') || h2.closest('a') || h2.nextElementSibling?.querySelector('a');

        if (link) {
          // aタグのテキストだけを取得
          let title = link.textContent?.trim() || '';
          const url = link.href || '';

          // タイトルから余計な情報を削除
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
              sourceSite: 'netkeiba-chihou',
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

          // ニュース記事のURLパターン（地方競馬用）
          if (title && url && (url.includes('nar.netkeiba.com') || url.includes('news.netkeiba.com')) && title.length > 10) {
            items.push({
              sourceTitle: title,
              sourceURL: url,
              sourceSite: 'netkeiba-chihou',
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
      sourceTitle: '【大井競馬】東京大賞典、地方競馬の頂点を決める一戦',
      sourceURL: 'https://nar.netkeiba.com/news/?pid=news_view&no=999991',
      sourceSite: 'netkeiba-chihou',
      summary: '東京大賞典が大井競馬場で開催。地方競馬のチャンピオンを決める重要なG1レースとなる。',
      category: '速報',
      tags: ['大井競馬', '南関東'],
    },
    {
      sourceTitle: '【川崎競馬】川崎記念で注目の逃げ馬が勝利',
      sourceURL: 'https://nar.netkeiba.com/news/?pid=news_view&no=999992',
      sourceSite: 'netkeiba-chihou',
      summary: '川崎記念で逃げ馬が見事な勝利。南関東競馬の注目レースで大波乱。',
      category: '速報',
      tags: ['川崎競馬', '南関東'],
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
    // タイトルをクリーンアップ（50文字前後）
    const cleanedTitle = cleanTitle(article.sourceTitle);
    const slug = generateSlug(cleanedTitle);
    const title = generate2chTitle(cleanedTitle, article.category);

    // Summaryを150文字前後に調整
    let summary = article.summary || cleanedTitle;
    if (summary.length > 160) {
      summary = summary.substring(0, 150) + '...';
    }

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
            SourceTitle: cleanedTitle,  // クリーンアップ済み
            SourceURL: article.sourceURL,
            SourceSite: article.sourceSite,
            Summary: summary,  // 150文字前後
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
    console.log('🚀 netkeiba地方競馬記事取得スクリプト開始\n');

    // 1. ニュース取得
    const articles = await scrapeNetkeibaChihouNews();

    // 2. Airtableに保存
    await saveToAirtable(articles);

    console.log('\n✅ 完了しました！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
