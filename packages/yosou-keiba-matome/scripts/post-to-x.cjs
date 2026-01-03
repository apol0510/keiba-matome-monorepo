/**
 * X (Twitter) 自動投稿スクリプト
 *
 * 新規作成されたニュース記事をXに自動投稿します。
 *
 * 環境変数:
 * - AIRTABLE_API_KEY: AirtableのAPIキー
 * - AIRTABLE_BASE_ID: AirtableのBase ID
 * - X_API_KEY: X API Consumer Key (API Key)
 * - X_API_SECRET: X API Consumer Secret (API Secret)
 * - X_ACCESS_TOKEN: X API Access Token
 * - X_ACCESS_SECRET: X API Access Token Secret
 * - SITE_URL: サイトURL（デフォルト: https://keiba-matome.jp）
 */

const Airtable = require('airtable');
const { TwitterApi } = require('twitter-api-v2');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 環境変数チェック
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const requiredEnvVars = [
  { name: 'AIRTABLE_API_KEY', value: AIRTABLE_API_KEY },
  { name: 'AIRTABLE_BASE_ID', value: AIRTABLE_BASE_ID },
  { name: 'X_API_KEY', value: process.env.X_API_KEY },
  { name: 'X_API_SECRET', value: process.env.X_API_SECRET },
  { name: 'X_ACCESS_TOKEN', value: process.env.X_ACCESS_TOKEN },
  { name: 'X_ACCESS_SECRET', value: process.env.X_ACCESS_SECRET }
];

for (const { name, value } of requiredEnvVars) {
  if (!value) {
    console.error(`❌ エラー: 環境変数 ${name} が設定されていません`);
    process.exit(1);
  }
}

// Airtable設定
const base = new Airtable({ apiKey: AIRTABLE_API_KEY })
  .base(AIRTABLE_BASE_ID);

// X API クライアント（OAuth 1.0a User Context）
const twitterClient = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

const SITE_URL = process.env.SITE_URL || 'https://yosou.keiba-matome.jp';

/**
 * 投稿テキスト生成
 */
function generateTweetText(news) {
  const title = news.Title || news.SourceTitle;
  const slug = news.Slug;

  // SlugがURLエンコードされている場合は、そのまま使用
  // されていない場合は、エンコード（念のため）
  const encodedSlug = slug.includes('%') ? slug : encodeURIComponent(slug);
  const url = `${SITE_URL}/news/${encodedSlug}/`;

  // カテゴリに応じた絵文字
  const categoryEmoji = {
    '速報': '🚨',
    '炎上': '🔥',
    'まとめ': '📋',
    'ランキング': '📊',
    '質問': '❓',
    '議論': '💬',
    '予想': '🎯'
  };
  const emoji = categoryEmoji[news.Category] || '🐴';

  // ハッシュタグ
  const hashtags = ['#競馬'];
  if (news.Tags && news.Tags.length > 0) {
    // 最大2つまでのタグを追加
    news.Tags.slice(0, 2).forEach(tag => {
      hashtags.push(`#${tag}`);
    });
  }

  // ツイート本文作成（280文字制限）
  // XのURL文字数カウント: URLは長さに関わらず23文字としてカウントされる
  const URL_CHAR_COUNT = 23;

  // 固定部分の文字数を計算（URLは23文字としてカウント）
  const fixedPartsLength =
    emoji.length +           // 絵文字（通常2文字）
    1 +                      // スペース
    2 +                      // \n\n
    9 +                      // 👉 詳細はこちら
    1 +                      // \n
    URL_CHAR_COUNT +         // URL（23文字固定）
    2 +                      // \n\n
    hashtags.join(' ').length; // ハッシュタグ

  const maxTitleLength = 280 - fixedPartsLength;

  // タイトルを短縮
  let displayTitle = title;
  if (title.length > maxTitleLength) {
    displayTitle = title.substring(0, maxTitleLength - 3) + '...';
  }

  return `${emoji} ${displayTitle}\n\n👉 詳細はこちら\n${url}\n\n${hashtags.join(' ')}`;
}

/**
 * 画像をダウンロード
 */
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

/**
 * Xに投稿（画像付き）
 */
async function postToX(news) {
  try {
    const tweetText = generateTweetText(news);
    console.log(`\n📝 投稿内容:\n${tweetText}\n`);

    // OG画像をダウンロード
    const imageUrl = `${SITE_URL}/og/default.png`;
    const tempImagePath = path.join('/tmp', 'og-image.png');

    console.log(`📥 画像をダウンロード中: ${imageUrl}`);
    await downloadImage(imageUrl, tempImagePath);

    // 画像をアップロード
    console.log(`📤 画像をXにアップロード中...`);
    const mediaId = await twitterClient.v1.uploadMedia(tempImagePath);

    // ツイート投稿（画像付き）
    const tweet = await twitterClient.v2.tweet(tweetText, {
      media: { media_ids: [mediaId] }
    });

    // 一時ファイルを削除
    fs.unlinkSync(tempImagePath);

    console.log(`✅ Xに投稿しました: https://twitter.com/user/status/${tweet.data.id}`);

    return tweet.data.id;
  } catch (error) {
    console.error('❌ X投稿エラー:', error);
    throw error;
  }
}

/**
 * AirtableのNewsレコードにXのツイートIDを記録
 */
async function updateNewsWithTweetId(recordId, tweetId) {
  try {
    const now = new Date().toISOString();
    await base('News').update(recordId, {
      TweetID: tweetId,
      TweetedAt: now,
      PublishedAt: now  // 公開日時をX投稿時刻に更新
    });
    console.log(`✅ Airtableを更新しました（RecordID: ${recordId}）`);
  } catch (error) {
    console.error('❌ Airtable更新エラー:', error);
    // Airtableの更新に失敗してもツイートは成功しているのでエラーは投げない
  }
}

/**
 * まだXに投稿していない最新記事を取得
 * FREE API対応: 1日の投稿上限を考慮
 */
async function getUnpostedNews() {
  // FREE API制限: 1日50ツイート、月1500ツイート
  // 安全のため1回の実行で最大3件まで投稿
  const MAX_POSTS_PER_RUN = 3;

  try {
    const records = await base('News')
      .select({
        filterByFormula: "AND({Status} = 'published', {TweetID} = '')",
        sort: [{ field: 'PublishedAt', direction: 'desc' }],
        maxRecords: MAX_POSTS_PER_RUN
      })
      .all();

    return records.map(record => ({
      id: record.id,
      Title: record.get('Title'),
      SourceTitle: record.get('SourceTitle'),
      Slug: record.get('Slug'),
      Category: record.get('Category'),
      Tags: record.get('Tags'),
      PublishedAt: record.get('PublishedAt')
    }));
  } catch (error) {
    console.error('❌ Airtable取得エラー:', error);
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 X自動投稿スクリプト開始...\n');

  // 未投稿の記事を取得
  const unpostedNews = await getUnpostedNews();

  if (unpostedNews.length === 0) {
    console.log('ℹ️ 投稿する記事がありません');
    return;
  }

  console.log(`📋 ${unpostedNews.length}件の未投稿記事が見つかりました\n`);

  // 各記事をXに投稿
  for (const news of unpostedNews) {
    console.log(`\n📰 記事: ${news.Title}`);

    try {
      // Xに投稿
      const tweetId = await postToX(news);

      // Airtableを更新
      await updateNewsWithTweetId(news.id, tweetId);

      // レート制限対策（15秒待機）
      console.log('⏱️  15秒待機中...');
      await new Promise(resolve => setTimeout(resolve, 15000));

    } catch (error) {
      console.error(`❌ 投稿失敗: ${news.Title}`);
      console.error(error);
      // エラーが発生しても次の記事の投稿を続行
      continue;
    }
  }

  console.log('\n✅ X自動投稿スクリプト完了');
}

// スクリプト実行
main().catch(error => {
  console.error('❌ スクリプト実行エラー:', error);
  process.exit(1);
});
