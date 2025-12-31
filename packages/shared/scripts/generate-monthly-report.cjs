#!/usr/bin/env node

/**
 * 月次レポート自動生成スクリプト
 *
 * 機能:
 * - GA4データの取得（ページビュー、ユーザー数、コンバージョン）
 * - Airtableデータの集計（記事数、コメント数）
 * - ファネル分析（サイト間遷移率）
 * - レポート生成（Markdown形式）
 * - Discord通知（月次サマリー）
 *
 * 使い方:
 * DISCORD_WEBHOOK_URL="xxx" node packages/shared/scripts/generate-monthly-report.cjs
 *
 * オプション:
 * --project=<name>  特定プロジェクトのみ
 * --year=2026       対象年（デフォルト: 現在の年）
 * --month=1         対象月（デフォルト: 先月）
 */

const fs = require('fs');
const path = require('path');

// プロジェクト設定
const PROJECTS = {
  'keiba-matome': {
    name: '競馬ニュースまとめ',
    baseId: 'appdHJSC4F9pTIoDj',
    gaPropertyId: 'G-HMBYF1PJ5K', // TODO: 独自プロパティ作成後に更新
    domain: 'keiba-matome.jp',
  },
  'chihou-keiba-matome': {
    name: '地方競馬ニュースまとめ',
    baseId: 'appt25zmKxQDiSCwh',
    gaPropertyId: 'G-HMBYF1PJ5K',
    domain: 'chihou.keiba-matome.jp',
  },
  'yosou-keiba-matome': {
    name: '競馬予想まとめ',
    baseId: 'appKPasSpjpTtabnv',
    gaPropertyId: 'G-K7N8XDHHQJ',
    domain: 'yosou.keiba-matome.jp',
  },
};

// コマンドライン引数の解析
const args = process.argv.slice(2);
const options = {
  project: null,
  year: new Date().getFullYear(),
  month: new Date().getMonth(), // 0-11, デフォルト: 先月
};

args.forEach(arg => {
  const [key, value] = arg.split('=');
  if (key === '--project') options.project = value;
  if (key === '--year') options.year = parseInt(value);
  if (key === '--month') options.month = parseInt(value) - 1; // 1-12 → 0-11
});

// 対象プロジェクトの決定
const targetProjects = options.project
  ? { [options.project]: PROJECTS[options.project] }
  : PROJECTS;

// Airtable設定
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (!AIRTABLE_API_KEY) {
  console.error('❌ AIRTABLE_API_KEY is required');
  process.exit(1);
}

// Discord通知関数
async function sendDiscordNotification(title, description, fields, color = 0xea8b00) {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('⚠️ Discord通知スキップ（DISCORD_WEBHOOK_URL未設定）');
    return;
  }

  const payload = {
    embeds: [{
      title,
      description,
      fields,
      color,
      timestamp: new Date().toISOString(),
    }],
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('❌ Discord通知失敗:', response.status, await response.text());
    } else {
      console.log('✅ Discord通知送信完了');
    }
  } catch (error) {
    console.error('❌ Discord通知エラー:', error.message);
  }
}

// Airtableデータ取得関数
async function fetchAirtableData(baseId, tableName, filterFormula = '') {
  const url = `https://api.airtable.com/v0/${baseId}/${tableName}?${filterFormula}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.records;
}

// 月次データ集計関数
async function aggregateMonthlyData(projectId, config, year, month) {
  console.log(`\n📊 ${config.name} (${year}年${month + 1}月) のデータ集計中...`);

  // 対象期間の計算
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`期間: ${startDateStr} 〜 ${endDateStr}`);

  // Airtableから記事データ取得
  const newsTableName = projectId === 'yosou-keiba-matome' ? 'Articles' : 'News';
  const filterFormula = `filterByFormula=AND(IS_AFTER({PublishedAt}, '${startDateStr}'), IS_BEFORE({PublishedAt}, '${endDateStr}'))`;

  let articles = [];
  try {
    articles = await fetchAirtableData(config.baseId, newsTableName, filterFormula);
  } catch (error) {
    console.error(`❌ 記事データ取得エラー: ${error.message}`);
  }

  // Airtableからコメントデータ取得
  let comments = [];
  try {
    comments = await fetchAirtableData(config.baseId, 'Comments', filterFormula);
  } catch (error) {
    console.error(`❌ コメントデータ取得エラー: ${error.message}`);
  }

  // 集計結果
  const stats = {
    articles: {
      total: articles.length,
      byCategory: {},
      avgCommentsPerArticle: 0,
    },
    comments: {
      total: comments.length,
      aiGenerated: comments.filter(c => c.fields.IsApproved).length,
      userSubmitted: comments.filter(c => !c.fields.IsApproved).length,
    },
    // GA4データは後で手動で追加（GA4 API連携は別途実装）
    ga4: {
      pageviews: 'N/A',
      users: 'N/A',
      sessions: 'N/A',
      avgSessionDuration: 'N/A',
      bounceRate: 'N/A',
      nankanCtaClicks: 'N/A',
      conversionRate: 'N/A',
    },
  };

  // カテゴリ別集計
  articles.forEach(article => {
    const category = article.fields.Category || 'その他';
    stats.articles.byCategory[category] = (stats.articles.byCategory[category] || 0) + 1;
  });

  // 記事あたりの平均コメント数
  if (articles.length > 0) {
    stats.articles.avgCommentsPerArticle = (comments.length / articles.length).toFixed(1);
  }

  return stats;
}

// Markdownレポート生成関数
function generateMarkdownReport(projectId, config, stats, year, month) {
  const monthStr = `${year}年${month + 1}月`;
  const date = new Date().toISOString().split('T')[0];

  let report = `# ${config.name} - ${monthStr}レポート\n\n`;
  report += `**生成日**: ${date}\n`;
  report += `**ドメイン**: https://${config.domain}\n\n`;

  report += `---\n\n`;

  // コンテンツ統計
  report += `## 📝 コンテンツ統計\n\n`;
  report += `| 項目 | 数値 |\n`;
  report += `|------|------|\n`;
  report += `| 記事数 | ${stats.articles.total}件 |\n`;
  report += `| コメント数（総計） | ${stats.comments.total}件 |\n`;
  report += `| AI生成コメント | ${stats.comments.aiGenerated}件 |\n`;
  report += `| ユーザー投稿コメント | ${stats.comments.userSubmitted}件 |\n`;
  report += `| 記事あたり平均コメント数 | ${stats.articles.avgCommentsPerArticle}件 |\n\n`;

  // カテゴリ別記事数
  if (Object.keys(stats.articles.byCategory).length > 0) {
    report += `### カテゴリ別記事数\n\n`;
    report += `| カテゴリ | 記事数 |\n`;
    report += `|----------|--------|\n`;
    Object.entries(stats.articles.byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        report += `| ${category} | ${count}件 |\n`;
      });
    report += `\n`;
  }

  // GA4統計（手動入力用）
  report += `## 📊 GA4統計\n\n`;
  report += `**⚠️ GA4データは手動で入力してください**\n\n`;
  report += `| 指標 | 数値 | 備考 |\n`;
  report += `|------|------|------|\n`;
  report += `| ページビュー | ${stats.ga4.pageviews} | GA4で確認 |\n`;
  report += `| ユーザー数 | ${stats.ga4.users} | GA4で確認 |\n`;
  report += `| セッション数 | ${stats.ga4.sessions} | GA4で確認 |\n`;
  report += `| 平均セッション時間 | ${stats.ga4.avgSessionDuration} | GA4で確認 |\n`;
  report += `| 直帰率 | ${stats.ga4.bounceRate} | GA4で確認 |\n`;
  report += `| nankan CTA クリック数 | ${stats.ga4.nankanCtaClicks} | イベント: click_nankan_cta |\n`;
  report += `| コンバージョン率 | ${stats.ga4.conversionRate} | CTAクリック ÷ ユーザー数 |\n\n`;

  // 手動確認手順
  report += `### GA4データの確認手順\n\n`;
  report += `1. https://analytics.google.com/ にアクセス\n`;
  report += `2. プロパティ「${config.gaPropertyId}」を選択\n`;
  report += `3. レポート → エンゲージメント → ページとスクリーン\n`;
  report += `4. 期間を${monthStr}に設定\n`;
  report += `5. 各指標を確認して、このレポートに手動で記入\n\n`;

  // アクションアイテム
  report += `## 🎯 アクションアイテム（次月の改善）\n\n`;
  report += `- [ ] GA4で前月比の増減を確認\n`;
  report += `- [ ] nankan CTA のクリック率を確認（目標: 5-10%）\n`;
  report += `- [ ] 人気カテゴリの記事を増やす\n`;
  report += `- [ ] コメント生成プロンプトの改善検討\n`;
  report += `- [ ] SEO施策の効果測定\n\n`;

  report += `---\n\n`;
  report += `**次回レポート生成**: ${year}年${month + 2}月1日\n`;

  return report;
}

// メイン処理
async function main() {
  const year = options.year;
  const month = options.month;
  const monthStr = `${year}年${month + 1}月`;

  console.log(`\n🔍 ${monthStr} の月次レポート生成開始...\n`);

  // 出力ディレクトリ作成
  const outputDir = path.join(__dirname, '../../monthly-reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const allStats = {};

  // 各プロジェクトのレポート生成
  for (const [projectId, config] of Object.entries(targetProjects)) {
    try {
      // データ集計
      const stats = await aggregateMonthlyData(projectId, config, year, month);
      allStats[projectId] = stats;

      // Markdownレポート生成
      const report = generateMarkdownReport(projectId, config, stats, year, month);

      // ファイル保存
      const filename = `${projectId}-${year}-${String(month + 1).padStart(2, '0')}.md`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, report, 'utf-8');

      console.log(`✅ ${config.name}: レポート生成完了 → ${filepath}`);
    } catch (error) {
      console.error(`❌ ${config.name}: エラー - ${error.message}`);
    }
  }

  // Discord通知（サマリー）
  if (Object.keys(allStats).length > 0) {
    const totalArticles = Object.values(allStats).reduce((sum, s) => sum + s.articles.total, 0);
    const totalComments = Object.values(allStats).reduce((sum, s) => sum + s.comments.total, 0);

    const fields = Object.entries(allStats).map(([projectId, stats]) => {
      const config = targetProjects[projectId];
      return {
        name: config.name,
        value: `記事: ${stats.articles.total}件 | コメント: ${stats.comments.total}件 | 平均: ${stats.articles.avgCommentsPerArticle}件/記事`,
        inline: false,
      };
    });

    await sendDiscordNotification(
      `📊 ${monthStr} 月次レポート`,
      `全${Object.keys(allStats).length}サイトの運用レポートを生成しました。`,
      [
        { name: '📝 総記事数', value: `${totalArticles}件`, inline: true },
        { name: '💬 総コメント数', value: `${totalComments}件`, inline: true },
        { name: '📁 保存先', value: `packages/monthly-reports/`, inline: false },
        ...fields,
      ],
      0x00ff00 // 緑色
    );
  }

  console.log(`\n✅ 月次レポート生成完了！`);
  console.log(`📁 出力先: ${outputDir}\n`);
  console.log(`⚠️ GA4データは手動で確認して、各レポートファイルに記入してください。`);
  console.log(`📖 確認手順: GA4_SETUP_GUIDE.md → ステップ6 参照\n`);
}

main().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
