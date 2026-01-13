#!/usr/bin/env node

/**
 * 汚れデータクレンジングスクリプト
 *
 * 実行内容:
 * 1. SourceURLがhochi/sponichiの記事を削除
 * 2. 「東京大賞典」など明らかに古い記事を検出して削除
 *
 * 使い方:
 * AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/cleanup-contaminated-data.cjs
 */

const Airtable = require('airtable');

// 環境変数チェック
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appt25zmKxQDiSCwh';

if (!AIRTABLE_API_KEY) {
  console.error('❌ Error: AIRTABLE_API_KEY is required');
  process.exit(1);
}

// Airtable初期化
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

/**
 * 除外ドメインチェック
 */
function isExcludedDomain(url) {
  const excludedDomains = ['hochi.news', 'hochi.co.jp', 'sponichi.co.jp'];
  return excludedDomains.some(domain => url.includes(domain));
}

/**
 * 古い記事キーワードチェック（2025年12月の記事を検出）
 */
function isOldArticle(title, publishedAt) {
  // 東京大賞典は2025年12月29日
  const oldKeywords = ['東京大賞典', '大井競馬12月', '川崎記念2025年'];

  const hasOldKeyword = oldKeywords.some(keyword => title.includes(keyword));

  // PublishedAtが2026年1月以降なのに古いキーワードが含まれている
  if (hasOldKeyword && publishedAt) {
    const pubDate = new Date(publishedAt);
    return pubDate >= new Date('2026-01-01');
  }

  return false;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🧹 汚れデータクレンジング開始\n');

  try {
    // 全記事を取得
    console.log('📋 全記事を取得中...');
    const allRecords = await base('News').select({ maxRecords: 1000 }).all();
    console.log(`   取得: ${allRecords.length}件\n`);

    let deletedCount = 0;
    const deleteReasons = {
      excludedDomain: 0,
      oldArticle: 0,
    };

    for (const record of allRecords) {
      const title = record.get('Title') || '';
      const sourceURL = record.get('SourceURL') || '';
      const publishedAt = record.get('PublishedAt');

      let shouldDelete = false;
      let reason = '';

      // チェック1: 除外ドメイン
      if (isExcludedDomain(sourceURL)) {
        shouldDelete = true;
        reason = '除外ドメイン';
        deleteReasons.excludedDomain++;
      }

      // チェック2: 古い記事（明らかな日付不整合）
      if (!shouldDelete && isOldArticle(title, publishedAt)) {
        shouldDelete = true;
        reason = '古い記事（日付不整合）';
        deleteReasons.oldArticle++;
      }

      if (shouldDelete) {
        try {
          await base('News').destroy([record.id]);
          console.log(`🗑️  削除: ${title}`);
          console.log(`   理由: ${reason}`);
          console.log(`   URL: ${sourceURL}\n`);
          deletedCount++;

          // レート制限対策
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`❌ 削除エラー: ${title}`, error.message);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 クレンジング完了');
    console.log('='.repeat(60));
    console.log(`削除件数: ${deletedCount}件`);
    console.log(`  - 除外ドメイン（hochi/sponichi）: ${deleteReasons.excludedDomain}件`);
    console.log(`  - 古い記事（日付不整合）: ${deleteReasons.oldArticle}件`);
    console.log(`残存件数: ${allRecords.length - deletedCount}件`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
