/**
 * Yahoo!ニュース 地方競馬ニュース取得スクリプト
 *
 * 使い方:
 * AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/scrape-yahoo-chihou.cjs
 */

const Airtable = require('airtable');
const puppeteer = require('puppeteer');

// 環境変数チェック
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
const ARTICLE_COUNT = parseInt(process.env.ARTICLE_COUNT || '4', 10); // デフォルト4件

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
  let cleaned = title
    .replace(/【|】|\[|\]|「|」|『|』/g, '')
    .replace(/[　\s]+/g, '')
    .replace(/[!！?？。、，,\.]/g, '')
    .replace(/\-/g, '')
    .replace(/…/g, '')  // 三点リーダー削除
    .trim();

  // 50文字以内に切り詰め（URL長対策）
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 50);
  }

  return cleaned;
}

/**
 * 2ch風スレタイ生成
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
    ],
    'まとめ': [
      `【議論】${originalTitle}`,
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
  if (title.match(/詐欺|炎上|閉鎖|返金|被害|告発|悪質|トラブル|問題|批判|非難/)) {
    return '炎上';
  }

  if (title.match(/ランキング|TOP\d+|おすすめ|人気|ベスト|比較/)) {
    return 'ランキング';
  }

  if (title.match(/大井|船橋|川崎|浦和|南関|地方|レース|勝利|優勝|着順|騎手|コメント|結果|東京大賞典|川崎記念|帝王賞|ジャパンダートダービー|取りやめ|中止|延期|開催|出走|馬場/)) {
    return '速報';
  }

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

  if (tags.length === 0) {
    if (category === '速報') tags.push('南関東');
    else tags.push('地方競馬');
  }

  return tags;
}

/**
 * Yahoo!ニュース 地方競馬ニュース取得
 * 検索クエリで地方競馬ニュースを取得
 */
async function scrapeYahooChihouNews() {
  console.log('📰 Yahoo!ニュース 地方競馬ニュース取得開始...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // 地方競馬の検索結果ページにアクセス
    console.log('🌐 Yahoo!ニュース（地方競馬検索）にアクセス中...');
    await page.goto('https://news.yahoo.co.jp/search?p=%E5%9C%B0%E6%96%B9%E7%AB%B6%E9%A6%AC&ei=UTF-8', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await page.waitForSelector('a', { timeout: 10000 }).catch(() => {
      console.log('⚠️  セレクタが見つかりません。');
    });

    // 記事リストを取得
    const articles = await page.evaluate(() => {
      const items = [];

      // 記事リンクを取得
      const links = Array.from(document.querySelectorAll('a'));

      // 除外ドメインリスト（hochiとsponichiを除外）
      const excludedDomains = ['hochi.news', 'hochi.co.jp', 'sponichi.co.jp'];

      // 除外メディア名リスト（記事タイトルから検出）
      const excludedMedia = ['スポーツ報知', '報知', 'スポニチ', 'スポニチアネックス', 'Sponichi', 'Hochi'];

      links.forEach((link) => {
        let title = link.textContent?.trim() || '';
        const url = link.href || '';
        const rawText = link.textContent?.trim() || '';

        // 日付情報を抽出（例: "3日前", "12時間前"）
        let daysAgo = null;
        const dayMatch = rawText.match(/(\d+)日前/);
        if (dayMatch) {
          daysAgo = parseInt(dayMatch[1], 10);
        }

        // タイトルクリーンアップ
        title = title
          .replace(/\n.*$/s, '')
          .replace(/\s+\d+分前.*$/, '')
          .replace(/\s+\d+時間前.*$/, '')
          .replace(/\s+\d+日前.*$/, '')
          .trim();

        // 除外ドメインチェック
        const isExcluded = excludedDomains.some(domain => url.includes(domain));

        // 除外メディアチェック（タイトルのみで判定、fullText不要）
        const isExcludedMedia = excludedMedia.some(media => title.includes(media));

        // 14日以上前の記事を除外（daysAgo取れない場合は古い扱い）
        const safeDaysAgo = Number.isFinite(daysAgo) && daysAgo !== null ? daysAgo : 9999;
        const isTooOld = safeDaysAgo > 14;

        // 記事URLパターン（除外ドメイン・除外メディア・古い記事を弾く）
        if (title && url && url.includes('news.yahoo.co.jp/articles/') && title.length > 10 && !isExcluded && !isExcludedMedia && !isTooOld) {
          items.push({
            sourceTitle: title,
            sourceURL: url,
            sourceSite: 'yahoo',
            daysAgo: daysAgo,
          });
        }
      });

      return items;
    });

    if (articles.length === 0) {
      await browser.close();
      console.log('⚠️  記事が見つかりませんでした。モックデータを使用します。');
      return getFallbackArticles();
    }

    const filteredArticles = articles.slice(0, ARTICLE_COUNT);

    // リダイレクト先URLを確認して除外ドメインをフィルタ
    console.log('🔍 リダイレクト先URLを確認中...');
    const excludedDomains = ['hochi.news', 'hochi.co.jp', 'sponichi.co.jp'];
    const validArticles = [];

    for (const article of filteredArticles) {
      try {
        const redirectPage = await browser.newPage();
        await redirectPage.goto(article.sourceURL, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const finalURL = redirectPage.url();
        await redirectPage.close();

        // 最終URLが除外ドメインかチェック
        const isExcluded = excludedDomains.some(domain => finalURL.includes(domain));

        if (isExcluded) {
          console.log(`⏭️  スキップ（除外ドメイン）: ${article.sourceTitle} (${finalURL})`);
        } else {
          // 最終URLを記録
          validArticles.push({
            ...article,
            sourceURL: finalURL, // リダイレクト先URLに更新
          });
        }
      } catch (error) {
        console.error(`⚠️  URL確認エラー: ${article.sourceTitle}`, error.message);
        // 混入ゼロを最優先するため、エラー時は除外（取りこぼしより混入の方がダメージ大）
        console.log(`⏭️  スキップ（URL確認エラー）: ${article.sourceTitle}`);
        continue;
      }
    }

    await browser.close();

    const enrichedArticles = validArticles.map(article => {
      const category = detectCategory(article.sourceTitle);
      const tags = detectTags(article.sourceTitle, category);

      return {
        ...article,
        summary: article.sourceTitle,
        category,
        tags,
      };
    });

    console.log(`✅ ${enrichedArticles.length}件の記事を取得しました（${filteredArticles.length - validArticles.length}件を除外）`);
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
      // SourceURLで重複チェック（過去記事の再スクレイピングを防止）
      const escapedURL = article.sourceURL.replace(/'/g, "\\'");
      const existingURL = await base('News')
        .select({
          filterByFormula: `{SourceURL} = '${escapedURL}'`,
          maxRecords: 1,
        })
        .firstPage();

      if (existingURL.length > 0) {
        console.log(`⏭️  スキップ: ${title} (既存URL)`);
        skipped++;
        continue;
      }

      // Slugで重複チェック（同じネタの異なるURLを検出）
      const escapedSlug = slug.replace(/'/g, "\\'");
      const existingSlug = await base('News')
        .select({
          filterByFormula: `{Slug} = '${escapedSlug}'`,
          maxRecords: 1,
        })
        .firstPage();

      if (existingSlug.length > 0) {
        console.log(`⏭️  スキップ: ${title} (類似記事あり)`);
        skipped++;
        continue;
      }

      // PublishedAtは元記事の公開日時（daysAgoから逆算）
      let publishedAt;
      if (Number.isFinite(article.daysAgo) && article.daysAgo !== null) {
        // daysAgo日前の日時を計算
        const date = new Date();
        date.setDate(date.getDate() - article.daysAgo);
        publishedAt = date.toISOString();
      } else {
        // daysAgo取れない記事は保存しない（新着誤爆防止）
        console.log(`⏭️  スキップ: ${title} (公開日時不明)`);
        skipped++;
        continue;
      }

      await base('News').create([
        {
          fields: {
            Title: title,
            Slug: slug,
            SourceTitle: cleanedTitle,
            SourceURL: article.sourceURL,
            SourceSite: article.sourceSite,
            Summary: summary,
            Category: article.category,
            Tags: article.tags,
            Status: 'draft',
            ViewCount: 0,
            CommentCount: 0,
            PublishedAt: publishedAt, // 元記事の公開日時
          },
        },
      ]);

      console.log(`✅ 作成: ${title}`);
      created++;

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
    console.log('🚀 Yahoo!ニュース地方競馬記事取得スクリプト開始\n');

    const articles = await scrapeYahooChihouNews();
    await saveToAirtable(articles);

    console.log('\n✅ 完了しました！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
