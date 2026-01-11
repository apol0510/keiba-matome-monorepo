#!/usr/bin/env node
/**
 * 不正Slug記事の一括修正スクリプト
 *
 * 使い方:
 *   AIRTABLE_API_KEY="xxx" node packages/shared/scripts/fix-invalid-slugs.cjs --project=chihou-keiba-matome
 */

const Airtable = require('airtable');
const { generateSlug } = require('../lib/scraping-utils.cjs');

// コマンドライン引数
const args = process.argv.slice(2);
const projectArg = args.find(arg => arg.startsWith('--project='));
const dryRunArg = args.includes('--dry-run');

if (!projectArg) {
  console.error('❌ エラー: --project=<name> を指定してください');
  console.log('例: node fix-invalid-slugs.cjs --project=chihou-keiba-matome');
  process.exit(1);
}

const projectName = projectArg.split('=')[1];

// プロジェクト設定
const projectConfig = {
  'keiba-matome': { baseId: 'appdHJSC4F9pTIoDj', siteName: '中央競馬' },
  'chihou-keiba-matome': { baseId: 'appt25zmKxQDiSCwh', siteName: '地方競馬' },
  'yosou-keiba-matome': { baseId: 'appKPasSpjpTtabnv', siteName: '競馬予想' },
};

const config = projectConfig[projectName];
if (!config) {
  console.error(`❌ エラー: プロジェクト "${projectName}" が見つかりません`);
  process.exit(1);
}

// 環境変数チェック
if (!process.env.AIRTABLE_API_KEY) {
  console.error('❌ エラー: AIRTABLE_API_KEY が設定されていません');
  process.exit(1);
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(config.baseId);

async function main() {
  console.log(`\n=== 不正Slug修正: ${config.siteName} ===\n`);

  if (dryRunArg) {
    console.log('⚠️  DRY RUNモード（実際には更新しません）\n');
  }

  try {
    // 全記事を取得（published記事のみ）
    console.log('📖 Airtableから記事を取得中...\n');
    const records = await base('News')
      .select({
        filterByFormula: `{Status} = 'published'`,
        fields: ['Title', 'Slug'],
      })
      .all();

    console.log(`✅ ${records.length}件の記事を取得しました\n`);

    // 不正Slug記事を検出
    const invalidRecords = [];
    const invalidCharsRegex = /[\/:#&%?=+@]/;

    for (const record of records) {
      const slug = record.fields.Slug || '';
      const title = record.fields.Title || '';

      // 不正文字チェック
      if (invalidCharsRegex.test(slug)) {
        invalidRecords.push({
          record,
          reason: 'Slugにスラッシュ、コロン等のURL不適切文字が含まれる',
          oldSlug: slug,
        });
      }
      // 空Slugチェック
      else if (!slug || slug.trim().length === 0) {
        invalidRecords.push({
          record,
          reason: 'Slugが空',
          oldSlug: slug,
        });
      }
    }

    if (invalidRecords.length === 0) {
      console.log('✅ 不正Slug記事は見つかりませんでした');
      return;
    }

    console.log(`🚨 ${invalidRecords.length}件の不正Slug記事を検出:\n`);

    // 修正処理
    let fixedCount = 0;
    let errorCount = 0;

    for (const item of invalidRecords) {
      const { record, reason, oldSlug } = item;
      const title = record.fields.Title;

      // 新しいSlugを生成
      const newSlug = generateSlug(title);

      console.log(`記事ID: ${record.id}`);
      console.log(`  タイトル: ${title}`);
      console.log(`  旧Slug:   ${oldSlug}`);
      console.log(`  新Slug:   ${newSlug}`);
      console.log(`  理由:     ${reason}`);

      if (!dryRunArg) {
        try {
          // Airtableを更新
          await base('News').update(record.id, {
            Slug: newSlug,
          });

          console.log(`  ✅ 修正完了\n`);
          fixedCount++;

          // レート制限対策（200ms待機）
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          console.log(`  ❌ エラー: ${err.message}\n`);
          errorCount++;
        }
      } else {
        console.log(`  ⏭️  スキップ（DRY RUNモード）\n`);
      }
    }

    // サマリー
    console.log('=== サマリー ===');
    console.log(`不正Slug記事: ${invalidRecords.length}件`);

    if (!dryRunArg) {
      console.log(`修正成功: ${fixedCount}件`);
      console.log(`修正失敗: ${errorCount}件`);
    } else {
      console.log('⚠️  DRY RUNモードのため、実際には更新されていません');
      console.log('実際に修正するには、--dry-run を外して再実行してください');
    }

  } catch (err) {
    console.error(`❌ エラー: ${err.message}`);
    process.exit(1);
  }
}

main();
