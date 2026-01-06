/**
 * monorepo包括的監視スクリプト（全記事スキャン版）
 *
 * 全サイトの全published記事を一括チェックし、1記事のエラーも見逃さない
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
    excludeKeywords: []
  }
  // yosou-keiba-matomeは別のAPI Keyを使用しているため一時的に除外
  // 統一API Keyを作成するか、各サイト専用API Key対応を実装すれば有効化可能
  /*
  {
    name: 'yosou-keiba-matome',
    displayName: '競馬予想',
    baseId: 'appKPasSpjpTtabnv',
    domain: 'https://yosou.keiba-matome.jp',
    expectedType: '競馬予想',
    excludeKeywords: []
  }
  */
];

/**
 * 記事単位の詳細チェック
 */
function checkArticle(record, site) {
  const issues = [];
  const fields = record.fields;
  const recordId = record.id;
  const title = fields.Title || '';
  const slug = fields.Slug || '';
  const sourceURL = fields.SourceURL || '';
  const commentCount = fields.CommentCount || 0;
  const tweetID = fields.TweetID || '';
  const metaTitle = fields.MetaTitle || '';
  const metaDescription = fields.MetaDescription || '';
  const publishedAt = fields.PublishedAt ? new Date(fields.PublishedAt) : null;

  // 1. Slug検証（日本語含有チェック - 404リンク防止）
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(slug);
  if (!hasJapanese) {
    issues.push({
      severity: '🚨 重大',
      type: '404リンク',
      message: `不正なSlug（日本語なし）`,
      detail: `Slug: "${slug}"`,
      recordId,
      title,
      url: `${site.domain}/news/${slug}/`
    });
  }

  // 2. フィルタリング漏れ（地方競馬記事の混入チェック）
  if (site.excludeKeywords.length > 0) {
    const foundKeyword = site.excludeKeywords.find(keyword => title.includes(keyword));
    if (foundKeyword) {
      issues.push({
        severity: '⚠️ 警告',
        type: 'フィルタリング漏れ',
        message: `地方競馬記事が混入`,
        detail: `キーワード: "${foundKeyword}"`,
        recordId,
        title,
        url: `${site.domain}/news/${slug}/`
      });
    }
  }

  // 3. コメント数チェック
  if (commentCount === 0) {
    issues.push({
      severity: '🚨 重大',
      type: 'コメント0件',
      message: `AIコメント生成失敗の可能性`,
      detail: `CommentCount: 0`,
      recordId,
      title,
      url: `${site.domain}/news/${slug}/`
    });
  } else if (commentCount < 15) {
    issues.push({
      severity: '⚠️ 警告',
      type: 'コメント少数',
      message: `通常15-35件のところ${commentCount}件のみ`,
      detail: `CommentCount: ${commentCount}`,
      recordId,
      title,
      url: `${site.domain}/news/${slug}/`
    });
  }

  // 4. X投稿チェック（TweetID未設定）
  if (!tweetID || tweetID.length === 0) {
    issues.push({
      severity: '⚠️ 警告',
      type: 'X投稿未実施',
      message: `TweetIDが未設定`,
      detail: `TweetID: 空`,
      recordId,
      title,
      url: `${site.domain}/news/${slug}/`
    });
  }

  // 5. SourceURL検証（元記事URL）
  if (!sourceURL || sourceURL.length < 10) {
    issues.push({
      severity: '⚠️ 警告',
      type: 'SourceURL不正',
      message: `元記事URLが空または不正`,
      detail: `SourceURL: "${sourceURL}"`,
      recordId,
      title,
      url: `${site.domain}/news/${slug}/`
    });
  }

  // 6. SEOメタデータチェック
  if (!metaTitle || metaTitle.length === 0) {
    issues.push({
      severity: 'ℹ️ 情報',
      type: 'SEOメタデータ未設定',
      message: `MetaTitleが未設定`,
      detail: `MetaTitle: 空`,
      recordId,
      title,
      url: `${site.domain}/news/${slug}/`
    });
  }
  if (!metaDescription || metaDescription.length === 0) {
    issues.push({
      severity: 'ℹ️ 情報',
      type: 'SEOメタデータ未設定',
      message: `MetaDescriptionが未設定`,
      detail: `MetaDescription: 空`,
      recordId,
      title,
      url: `${site.domain}/news/${slug}/`
    });
  }

  // 7. PublishedAt検証（未来の日付チェック）
  if (publishedAt && publishedAt > new Date()) {
    issues.push({
      severity: '⚠️ 警告',
      type: 'PublishedAt異常',
      message: `未来の日付が設定されている`,
      detail: `PublishedAt: ${publishedAt.toISOString()}`,
      recordId,
      title,
      url: `${site.domain}/news/${slug}/`
    });
  }

  // 8. Slugの長さチェック（50文字超）
  if (slug.length > 50) {
    issues.push({
      severity: 'ℹ️ 情報',
      type: 'Slug長すぎ',
      message: `Slugが50文字を超過（SEO非推奨）`,
      detail: `Slug: ${slug.length}文字`,
      recordId,
      title,
      url: `${site.domain}/news/${slug}/`
    });
  }

  return issues;
}

/**
 * サイトの全記事を包括的にチェック
 */
async function checkSiteHealth(site) {
  console.log(`\n🔍 ${site.displayName}（${site.name}）をチェック中...`);

  const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(site.baseId);
  const allIssues = [];
  let totalArticles = 0;
  let recentArticles = 0;

  try {
    // 全published記事を取得（過去24時間だけでなく、全記事）
    console.log(`  📥 全記事を取得中...`);
    const allRecords = await base('News')
      .select({
        filterByFormula: `{Status} = 'published'`,
        sort: [{ field: 'PublishedAt', direction: 'desc' }]
      })
      .all();

    totalArticles = allRecords.length;
    console.log(`  📰 全記事数: ${totalArticles}件`);

    // 過去24時間の記事数もカウント
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    recentArticles = allRecords.filter(r => {
      const publishedAt = r.fields.PublishedAt ? new Date(r.fields.PublishedAt) : null;
      return publishedAt && publishedAt > yesterday;
    }).length;
    console.log(`  🆕 過去24時間の記事数: ${recentArticles}件`);

    // 記事数異常チェック
    if (recentArticles === 0) {
      allIssues.push({
        severity: '🚨 重大',
        type: '記事数異常',
        message: '過去24時間に新規記事が0件（スクレイピング停止の可能性）',
        detail: `期待値: 9-27件、実際: 0件`,
        recordId: null,
        title: null,
        url: null
      });
    } else if (recentArticles < 3) {
      allIssues.push({
        severity: '⚠️ 警告',
        type: '記事数低下',
        message: `過去24時間の記事が${recentArticles}件のみ（通常9-27件）`,
        detail: `期待値: 9-27件、実際: ${recentArticles}件`,
        recordId: null,
        title: null,
        url: null
      });
    }

    // 全記事を詳細チェック
    console.log(`  🔎 全${totalArticles}記事をスキャン中...`);
    let checkedCount = 0;
    for (const record of allRecords) {
      const issues = checkArticle(record, site);
      allIssues.push(...issues);
      checkedCount++;

      // 進捗表示（100記事ごと）
      if (checkedCount % 100 === 0) {
        console.log(`    - ${checkedCount} / ${totalArticles}件チェック完了`);
      }
    }

    console.log(`  ✅ チェック完了: ${allIssues.length}件の問題を検出`);

  } catch (error) {
    console.error(`  ❌ エラー: ${error.message}`);
    allIssues.push({
      severity: '🚨 重大',
      type: 'システムエラー',
      message: `Airtable接続エラー: ${error.message}`,
      detail: null,
      recordId: null,
      title: null,
      url: null
    });
  }

  return {
    site,
    totalArticles,
    recentArticles,
    issues: allIssues
  };
}

/**
 * Discord通知を送信（重大度別）
 */
async function sendDiscordNotification(results) {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('⚠️ DISCORD_WEBHOOK_URLが設定されていないため、通知をスキップします');
    return;
  }

  // 重大エラーのみを抽出
  const criticalIssues = [];
  for (const result of results) {
    const critical = result.issues.filter(i => i.severity === '🚨 重大');
    if (critical.length > 0) {
      criticalIssues.push({ ...result, issues: critical });
    }
  }

  // 重大エラーがない場合は通知不要
  if (criticalIssues.length === 0) {
    console.log('✅ 重大エラーなし - Discord通知不要');
    return;
  }

  // Embed作成（重大エラーのみ）
  const embeds = criticalIssues.map(({ site, issues }) => {
    return {
      title: `🚨 ${site.displayName}（${site.name}）`,
      description: `**${issues.length}件の重大エラー**`,
      color: 0xff0000, // 赤
      fields: issues.slice(0, 10).map(issue => ({
        name: `${issue.severity} ${issue.type}`,
        value: issue.url
          ? `${issue.message}\n${issue.detail || ''}\nタイトル: ${issue.title}\n[リンク](${issue.url})\nRecord ID: ${issue.recordId}`
          : `${issue.message}\n${issue.detail || ''}`,
        inline: false
      })),
      footer: {
        text: issues.length > 10
          ? `他${issues.length - 10}件の重大エラーがあります`
          : `全${issues.length}件の重大エラー`
      },
      timestamp: new Date().toISOString()
    };
  });

  const payload = {
    content: '🚨 **重大エラー検出 - 即座に対応が必要です**',
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

    console.log('✅ Discord通知を送信しました（重大エラーのみ）');
  } catch (error) {
    console.error('❌ Discord通知の送信に失敗:', error.message);
  }
}

/**
 * 詳細レポート生成
 */
function generateDetailedReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 monorepo包括的監視レポート（全記事スキャン）');
  console.log('='.repeat(80));

  let totalArticles = 0;
  let totalCritical = 0;
  let totalWarning = 0;
  let totalInfo = 0;

  for (const { site, totalArticles: siteTotal, recentArticles, issues } of results) {
    totalArticles += siteTotal;

    const critical = issues.filter(i => i.severity === '🚨 重大').length;
    const warning = issues.filter(i => i.severity === '⚠️ 警告').length;
    const info = issues.filter(i => i.severity === 'ℹ️ 情報').length;

    totalCritical += critical;
    totalWarning += warning;
    totalInfo += info;

    const status = critical > 0
      ? '🚨 重大エラー'
      : warning > 0
        ? '⚠️ 警告あり'
        : info > 0
          ? 'ℹ️ 情報あり'
          : '✅ 正常';

    console.log(`\n${site.displayName}（${site.name}）: ${status}`);
    console.log(`  全記事数: ${siteTotal}件`);
    console.log(`  過去24時間: ${recentArticles}件`);
    console.log(`  重大エラー: ${critical}件`);
    console.log(`  警告: ${warning}件`);
    console.log(`  情報: ${info}件`);

    // 重大エラーの詳細（最大5件）
    if (critical > 0) {
      console.log(`  🚨 重大エラーの詳細:`);
      const criticalIssues = issues.filter(i => i.severity === '🚨 重大');
      for (const issue of criticalIssues.slice(0, 5)) {
        console.log(`    - ${issue.type}: ${issue.message}`);
        if (issue.title) console.log(`      タイトル: ${issue.title}`);
        if (issue.url) console.log(`      URL: ${issue.url}`);
      }
      if (critical > 5) {
        console.log(`    ... 他${critical - 5}件`);
      }
    }

    // 警告の詳細（最大3件）
    if (warning > 0) {
      console.log(`  ⚠️ 警告の詳細:`);
      const warningIssues = issues.filter(i => i.severity === '⚠️ 警告');
      for (const issue of warningIssues.slice(0, 3)) {
        console.log(`    - ${issue.type}: ${issue.message}`);
      }
      if (warning > 3) {
        console.log(`    ... 他${warning - 3}件`);
      }
    }
  }

  console.log('\n' + '-'.repeat(80));
  console.log(`全記事数: ${totalArticles}件`);
  console.log(`🚨 重大エラー: ${totalCritical}件`);
  console.log(`⚠️ 警告: ${totalWarning}件`);
  console.log(`ℹ️ 情報: ${totalInfo}件`);

  const healthyArticles = totalArticles - (totalCritical + totalWarning + totalInfo);
  const healthScore = totalArticles > 0
    ? ((healthyArticles / totalArticles) * 100).toFixed(1)
    : 0;

  console.log(`✅ 正常: ${healthyArticles}件`);
  console.log(`\n健全性スコア: ${healthScore}% (${healthyArticles} / ${totalArticles})`);
  console.log('='.repeat(80) + '\n');

  return { totalCritical, totalWarning, totalInfo, healthScore };
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 monorepo包括的監視スクリプト開始（全記事スキャン版）\n');

  const results = [];

  // 全サイトを順次チェック
  for (const site of SITES) {
    const result = await checkSiteHealth(site);
    results.push(result);
  }

  // 詳細レポート生成
  const { totalCritical, totalWarning, totalInfo, healthScore } = generateDetailedReport(results);

  // Discord通知（重大エラーのみ）
  await sendDiscordNotification(results);

  // 終了ステータス
  if (totalCritical > 0) {
    console.log('❌ 重大エラーが検出されました - 即座に対応してください');
    process.exit(1);
  } else if (totalWarning > 0) {
    console.log('⚠️ 警告がありますが、処理は正常終了しました');
    process.exit(0);
  } else {
    console.log('✅ すべての記事が正常です');
    process.exit(0);
  }
}

main();
