/**
 * monorepo統合監視スクリプト
 *
 * 全サイトの健全性を一括チェックし、問題があればDiscord通知
 *
 * 使い方:
 * AIRTABLE_API_KEY="xxx" DISCORD_WEBHOOK_URL="xxx" node packages/shared/scripts/monitor-all-sites.cjs
 */

const Airtable = require('airtable');

// 環境変数チェック
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (!AIRTABLE_API_KEY) {
  console.error('❌ Error: AIRTABLE_API_KEY is required');
  process.exit(1);
}

// サイト設定
const SITES = [
  {
    name: 'keiba-matome',
    displayName: '中央競馬',
    baseId: 'appdHJSC4F9pTIoDj',
    domain: 'https://keiba-matome.jp',
    expectedType: '中央競馬',
    excludeKeywords: [
      '大井', 'TCK', '船橋', '川崎', '浦和', '南関',
      '門別', '盛岡', '水沢', '金沢', '笠松', '名古屋',
      '園田', '姫路', '高知', '佐賀', 'ホッカイドウ',
      '地方競馬', '地方重賞', 'NAR',
      '東京大賞典', '川崎記念', '帝王賞', 'ジャパンダートダービー',
      'かしわ記念', 'JBC', 'トゥインクル', '羽田盃', '黒潮盃',
      '兵庫ゴールドトロフィー', '東京記念'
    ]
  },
  {
    name: 'chihou-keiba-matome',
    displayName: '地方競馬',
    baseId: 'appt25zmKxQDiSCwh',
    domain: 'https://chihou.keiba-matome.jp',
    expectedType: '地方競馬',
    excludeKeywords: [] // 地方競馬サイトは除外キーワードなし
  },
  {
    name: 'yosou-keiba-matome',
    displayName: '競馬予想',
    baseId: 'appKPasSpjpTtabnv',
    domain: 'https://yosou.keiba-matome.jp',
    expectedType: '競馬予想',
    excludeKeywords: [] // 予想サイトは除外キーワードなし
  }
];

/**
 * サイトの健全性をチェック
 */
async function checkSiteHealth(site) {
  console.log(`\n🔍 ${site.displayName}（${site.name}）をチェック中...`);

  const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(site.baseId);
  const issues = [];

  try {
    // 1. 過去24時間の記事を取得
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const records = await base('News')
      .select({
        filterByFormula: `AND({Status} = 'published', IS_AFTER({PublishedAt}, '${yesterday}'))`,
        sort: [{ field: 'PublishedAt', direction: 'desc' }]
      })
      .all();

    console.log(`  📰 過去24時間の記事数: ${records.length}件`);

    // 2. 記事数の異常チェック
    if (records.length === 0) {
      issues.push({
        severity: '🚨 重大',
        type: '記事数異常',
        message: '過去24時間に新規記事が0件（スクレイピング停止の可能性）'
      });
    } else if (records.length < 3) {
      issues.push({
        severity: '⚠️ 警告',
        type: '記事数低下',
        message: `過去24時間の記事が${records.length}件のみ（通常9-27件）`
      });
    }

    // 3. 各記事の詳細チェック
    for (const record of records) {
      const fields = record.fields;
      const title = fields.Title || '';
      const slug = fields.Slug || '';
      const sourceURL = fields.SourceURL || '';

      // 3-1. Slug検証（日本語が含まれているか）
      const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(slug);
      if (!hasJapanese) {
        issues.push({
          severity: '🚨 重大',
          type: '404リンク',
          message: `不正なSlug: "${slug}" - タイトル: "${title}"`,
          url: `${site.domain}/news/${slug}/`
        });
      }

      // 3-2. フィルタリング漏れチェック（除外キーワードが含まれていないか）
      if (site.excludeKeywords.length > 0) {
        const foundKeyword = site.excludeKeywords.find(keyword => title.includes(keyword));
        if (foundKeyword) {
          issues.push({
            severity: '⚠️ 警告',
            type: 'フィルタリング漏れ',
            message: `地方競馬記事が混入: "${title}" - キーワード: "${foundKeyword}"`,
            url: `${site.domain}/news/${slug}/`
          });
        }
      }

      // 3-3. SourceURL検証（外部リンクが存在するか）
      if (!sourceURL || sourceURL.length < 10) {
        issues.push({
          severity: '⚠️ 警告',
          type: 'SourceURL欠損',
          message: `元記事URLが不正: "${title}"`
        });
      }
    }

    // 4. 全体統計
    console.log(`  ✅ チェック完了: ${issues.length}件の問題を検出`);

  } catch (error) {
    console.error(`  ❌ エラー: ${error.message}`);
    issues.push({
      severity: '🚨 重大',
      type: 'システムエラー',
      message: `Airtable接続エラー: ${error.message}`
    });
  }

  return { site, issues };
}

/**
 * Discord通知を送信
 */
async function sendDiscordNotification(results) {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('⚠️ DISCORD_WEBHOOK_URLが設定されていないため、通知をスキップします');
    return;
  }

  // 問題があるサイトのみ抽出
  const sitesWithIssues = results.filter(r => r.issues.length > 0);

  if (sitesWithIssues.length === 0) {
    console.log('✅ 全サイト正常 - Discord通知不要');
    return;
  }

  // Embed作成
  const embeds = sitesWithIssues.map(({ site, issues }) => {
    const criticalCount = issues.filter(i => i.severity === '🚨 重大').length;
    const warningCount = issues.filter(i => i.severity === '⚠️ 警告').length;

    const color = criticalCount > 0 ? 0xff0000 : 0xffa500; // 赤 or オレンジ

    return {
      title: `${site.displayName}（${site.name}）`,
      description: `**${criticalCount}件の重大エラー、${warningCount}件の警告**`,
      color,
      fields: issues.slice(0, 5).map(issue => ({
        name: `${issue.severity} ${issue.type}`,
        value: issue.url
          ? `${issue.message}\n[リンク](${issue.url})`
          : issue.message,
        inline: false
      })),
      footer: {
        text: issues.length > 5
          ? `他${issues.length - 5}件の問題があります`
          : `全${issues.length}件の問題`
      },
      timestamp: new Date().toISOString()
    };
  });

  const payload = {
    content: '🔍 **monorepo統合監視レポート**',
    embeds
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('✅ Discord通知を送信しました');
  } catch (error) {
    console.error('❌ Discord通知の送信に失敗:', error.message);
  }
}

/**
 * サマリーレポート生成
 */
function generateSummary(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 monorepo統合監視レポート');
  console.log('='.repeat(60));

  let totalCritical = 0;
  let totalWarning = 0;

  for (const { site, issues } of results) {
    const critical = issues.filter(i => i.severity === '🚨 重大').length;
    const warning = issues.filter(i => i.severity === '⚠️ 警告').length;

    totalCritical += critical;
    totalWarning += warning;

    const status = issues.length === 0
      ? '✅ 正常'
      : critical > 0
        ? '🚨 重大エラー'
        : '⚠️ 警告あり';

    console.log(`\n${site.displayName}（${site.name}）: ${status}`);
    console.log(`  重大エラー: ${critical}件`);
    console.log(`  警告: ${warning}件`);

    if (issues.length > 0) {
      console.log('  問題の詳細:');
      for (const issue of issues.slice(0, 3)) {
        console.log(`    ${issue.severity} ${issue.type}: ${issue.message}`);
      }
      if (issues.length > 3) {
        console.log(`    ... 他${issues.length - 3}件`);
      }
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`合計: 🚨 ${totalCritical}件の重大エラー、⚠️ ${totalWarning}件の警告`);
  console.log('='.repeat(60) + '\n');

  return { totalCritical, totalWarning };
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 monorepo統合監視スクリプト開始\n');

  const results = [];

  // 全サイトを並列チェック
  for (const site of SITES) {
    const result = await checkSiteHealth(site);
    results.push(result);
  }

  // サマリー表示
  const { totalCritical, totalWarning } = generateSummary(results);

  // Discord通知
  await sendDiscordNotification(results);

  // 終了ステータス
  if (totalCritical > 0) {
    console.log('❌ 重大エラーが検出されました');
    process.exit(1);
  } else if (totalWarning > 0) {
    console.log('⚠️ 警告がありますが、処理は正常終了しました');
    process.exit(0);
  } else {
    console.log('✅ すべてのサイトが正常です');
    process.exit(0);
  }
}

main();
