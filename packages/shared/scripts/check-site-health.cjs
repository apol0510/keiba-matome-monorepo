#!/usr/bin/env node

/**
 * サイト健全性チェック - シンプル版
 *
 * 実際に起きている問題を検知：
 * 1. 定期投稿後にトップページにスレッドが表示されない
 * 2. スレにコメントができない
 * 3. エラーが発生しても気づけない
 */

const Airtable = require('airtable');

// 環境変数チェック
if (!process.env.AIRTABLE_API_KEY) {
  console.error('❌ AIRTABLE_API_KEY が設定されていません');
  process.exit(1);
}

// プロジェクト設定
const PROJECTS = {
  'keiba-matome': {
    baseId: 'appdHJSC4F9pTIoDj',
    siteUrl: 'https://keiba-matome.jp'
  },
  'chihou-keiba-matome': {
    baseId: 'appt25zmKxQDiSCwh',
    siteUrl: 'https://chihou.keiba-matome.jp'
  },
  'yosou-keiba-matome': {
    baseId: 'appKPasSpjpTtabnv',
    siteUrl: 'https://yosou.keiba-matome.jp'
  }
};

async function checkSite(projectName, config) {
  console.log('');
  console.log('='.repeat(60));
  console.log(`🔍 ${projectName} をチェック中...`);
  console.log('='.repeat(60));

  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(config.baseId);
  const errors = [];

  try {
    // 1. 最新記事を取得（過去24時間）
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    console.log('');
    console.log('1️⃣ 過去24時間の記事をチェック...');

    const recentNews = [];
    await base('News').select({
      filterByFormula: `AND(
        Status = 'published',
        IS_AFTER({PublishedAt}, '${oneDayAgo.toISOString()}')
      )`,
      sort: [{ field: 'PublishedAt', direction: 'desc' }]
    }).eachPage((records, fetchNextPage) => {
      records.forEach(record => recentNews.push(record));
      fetchNextPage();
    });

    if (recentNews.length === 0) {
      errors.push('⚠️  過去24時間に新しい記事がありません');
    } else {
      console.log(`   ✅ ${recentNews.length}件の記事を発見`);

      // 各記事の詳細チェック
      for (const news of recentNews) {
        const title = news.get('Title');
        const slug = news.get('Slug');
        const status = news.get('Status');
        const publishedAt = news.get('PublishedAt');
        const commentCount = news.get('CommentCount') || 0;

        console.log('');
        console.log(`   📄 記事: ${title}`);
        console.log(`      Slug: ${slug}`);
        console.log(`      Status: ${status}`);
        console.log(`      PublishedAt: ${publishedAt}`);
        console.log(`      CommentCount: ${commentCount}`);

        // 問題チェック
        if (!slug) {
          errors.push(`❌ Slugが空: ${title}`);
        }
        if (slug && slug.includes('/')) {
          errors.push(`❌ Slugにスラッシュ含む: ${slug}`);
        }
        if (status !== 'published') {
          errors.push(`⚠️  Status='${status}': ${title}`);
        }
        if (commentCount === 0) {
          errors.push(`⚠️  コメント0件: ${title}`);
        }

        // URL生成テスト
        const url = `${config.siteUrl}/news/${encodeURIComponent(slug)}`;
        console.log(`      URL: ${url}`);
      }
    }

    // 2. 全published記事数をチェック
    console.log('');
    console.log('2️⃣ 全published記事数をチェック...');

    let totalPublished = 0;
    await base('News').select({
      filterByFormula: `Status = 'published'`
    }).eachPage((records, fetchNextPage) => {
      totalPublished += records.length;
      fetchNextPage();
    });

    console.log(`   ✅ 全published記事: ${totalPublished}件`);

    if (totalPublished === 0) {
      errors.push('🚨 published記事が1件もありません！');
    }

    // 3. 最新10記事のコメント数をチェック
    console.log('');
    console.log('3️⃣ 最新10記事のコメント数をチェック...');

    const latest10 = [];
    await base('News').select({
      filterByFormula: `Status = 'published'`,
      sort: [{ field: 'PublishedAt', direction: 'desc' }],
      maxRecords: 10
    }).eachPage((records, fetchNextPage) => {
      records.forEach(record => latest10.push(record));
      fetchNextPage();
    });

    for (const news of latest10) {
      const title = news.get('Title');
      const commentCount = news.get('CommentCount') || 0;

      if (commentCount === 0) {
        console.log(`   ⚠️  コメント0件: ${title}`);
      } else {
        console.log(`   ✅ コメント${commentCount}件: ${title}`);
      }
    }

    // 4. コメント投稿機能のチェック（最新コメント確認）
    console.log('');
    console.log('4️⃣ コメント投稿機能をチェック...');

    const latestComments = [];
    await base('Comments').select({
      sort: [{ field: 'CreatedAt', direction: 'desc' }],
      maxRecords: 5
    }).eachPage((records, fetchNextPage) => {
      records.forEach(record => latestComments.push(record));
      fetchNextPage();
    });

    if (latestComments.length === 0) {
      errors.push('🚨 コメントが1件もありません！');
    } else {
      console.log(`   ✅ 最新5件のコメントを確認:`);
      for (const comment of latestComments) {
        const content = comment.get('Content');
        const createdAt = comment.get('CreatedAt');
        const isApproved = comment.get('IsApproved');
        console.log(`      ${createdAt}: ${isApproved ? '✅' : '❌'} ${content.substring(0, 30)}...`);
      }
    }

  } catch (error) {
    errors.push(`🚨 エラー発生: ${error.message}`);
    console.error('');
    console.error('❌ エラー詳細:');
    console.error(error);
  }

  // 結果サマリー
  console.log('');
  console.log('='.repeat(60));
  if (errors.length === 0) {
    console.log('✅ すべて正常です');
  } else {
    console.log(`🚨 ${errors.length}件の問題を発見:`);
    errors.forEach(err => console.log(`   ${err}`));
  }
  console.log('='.repeat(60));

  return errors;
}

async function main() {
  console.log('');
  console.log('📊 サイト健全性チェック開始');
  console.log('');

  const allErrors = {};

  for (const [projectName, config] of Object.entries(PROJECTS)) {
    const errors = await checkSite(projectName, config);
    if (errors.length > 0) {
      allErrors[projectName] = errors;
    }
  }

  // 最終サマリー
  console.log('');
  console.log('');
  console.log('━'.repeat(60));
  console.log('📋 最終サマリー');
  console.log('━'.repeat(60));
  console.log('');

  if (Object.keys(allErrors).length === 0) {
    console.log('✅ 全サイト正常です！');
  } else {
    console.log('🚨 以下のサイトで問題を発見:');
    console.log('');
    for (const [projectName, errors] of Object.entries(allErrors)) {
      console.log(`【${projectName}】`);
      errors.forEach(err => console.log(`  ${err}`));
      console.log('');
    }
  }

  console.log('');
}

main().catch(error => {
  console.error('');
  console.error('💥 致命的なエラー:');
  console.error(error);
  process.exit(1);
});
