/**
 * コメント品質大規模分析スクリプト
 *
 * 過去記事のコメントを分析し、以下を検証:
 * - 不自然なコメント検出（事実誤認、文脈の断絶など）
 * - 南関導線コメント出現率（ファネル戦略の実効性）
 * - コメント品質スコア算出
 * - 改善提案の自動生成
 *
 * 使い方:
 * ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" node packages/shared/scripts/analyze-comment-quality.cjs
 *
 * オプション:
 * --project=<name>     対象プロジェクト（keiba-matome, chihou-keiba-matome, yosou-keiba-matome）
 * --limit=<num>        分析する記事数（デフォルト: 50）
 * --full               全記事分析（最大200記事）
 */

const Anthropic = require('@anthropic-ai/sdk');
const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

// プロジェクト設定
const PROJECTS = {
  'keiba-matome': {
    baseId: 'appdHJSC4F9pTIoDj',
    newsTable: 'News',
    commentsTable: 'Comments',
    siteName: '競馬ニュースまとめ（中央競馬）',
    type: 'CHUOU', // 中央競馬
  },
  'chihou-keiba-matome': {
    baseId: 'appt25zmKxQDiSCwh',
    newsTable: 'News',
    commentsTable: 'Comments',
    siteName: '地方競馬ニュースまとめ',
    type: 'CHIHOU', // 地方競馬
  },
  'yosou-keiba-matome': {
    baseId: 'appKPasSpjpTtabnv',
    newsTable: 'Articles',
    commentsTable: 'Comments',
    siteName: '競馬予想まとめ',
    type: 'YOSOU', // 予想
  },
};

/**
 * 記事とコメントを取得
 */
async function fetchArticlesWithComments(base, projectConfig, limit) {
  console.log(`📥 記事とコメントを取得中...`);

  const articles = await base(projectConfig.newsTable)
    .select({
      fields: ['Title', 'Slug', 'PublishedAt'],
      filterByFormula: '{IsApproved} = TRUE()',
      maxRecords: limit,
      sort: [{ field: 'PublishedAt', direction: 'desc' }],
    })
    .all();

  console.log(`   ✅ ${articles.length}件の記事を取得\n`);

  const articlesWithComments = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const articleId = article.id;

    const comments = await base(projectConfig.commentsTable)
      .select({
        fields: ['CommentNumber', 'Content', 'IsApproved'],
        filterByFormula: `AND({ArticleId} = "${articleId}", {IsApproved} = TRUE())`,
        sort: [{ field: 'CommentNumber', direction: 'asc' }],
      })
      .all();

    if (comments.length > 0) {
      articlesWithComments.push({
        id: articleId,
        title: article.fields.Title,
        slug: article.fields.Slug,
        publishedAt: article.fields.PublishedAt,
        comments: comments.map(c => ({
          number: c.fields.CommentNumber,
          content: c.fields.Content,
        })),
      });
    }

    if ((i + 1) % 10 === 0) {
      console.log(`   進捗: ${i + 1}/${articles.length}`);
    }
  }

  console.log(`   ✅ コメント付き記事: ${articlesWithComments.length}件\n`);

  return articlesWithComments;
}

/**
 * Claude APIでコメント品質分析
 */
async function analyzeCommentQuality(article, projectConfig, client) {
  const commentsText = article.comments
    .map(c => `${c.number}: ${c.content}`)
    .join('\n');

  const projectTypeContext = {
    'CHUOU': `中央競馬（JRA）のニュース記事です。
南関東4競馬場（大井・船橋・川崎・浦和）や地方競馬への自然な話題誘導が3-5件含まれているか確認してください。
不自然な例: 記事が芝レースなのに「いきなり浦和の馬場が重い」など文脈なく地方競馬場の話が出る
自然な例: 「ダート馬なら南関でも走れそうだな」「地方G1も盛り上がるぞ」など記事内容から自然に派生`,

    'CHIHOU': `地方競馬のニュース記事です。
南関東4競馬場（大井・船橋・川崎・浦和）に関する事実誤認がないか確認してください。
例: 船橋に坂は存在しない（船橋は平坦なコース）`,

    'YOSOU': `競馬予想記事です。
予想の根拠や馬券戦略に関するコメントが自然か確認してください。`,
  };

  const prompt = `以下の競馬記事のコメントを分析し、品質を評価してください。

【記事タイトル】
${article.title}

【プロジェクト種別】
${projectTypeContext[projectConfig.type]}

【コメント一覧】
${commentsText}

【評価項目】
1. **不自然なコメント検出**: 以下のような問題を指摘
   - 事実誤認（例: 存在しないコース特徴への言及）
   - 文脈の断絶（記事内容と無関係な話題の突然の出現）
   - 不自然な繰り返し
   - スパムパターン

2. **南関導線コメント出現率**（中央競馬の場合のみ）:
   - 自然な形で地方競馬・南関への誘導コメントが3-5件含まれているか
   - 含まれている場合、そのコメント番号をリストアップ

3. **全体的な品質スコア**: 0-100点で評価
   - 90-100点: 非常に自然で高品質
   - 70-89点: 概ね良好、一部改善余地あり
   - 50-69点: 問題が複数あり、改善必要
   - 0-49点: 品質に重大な問題あり

【出力形式】
JSON形式で以下を出力してください:
{
  "qualityScore": 85,
  "unnaturalComments": [
    {
      "commentNumber": 12,
      "issue": "船橋に坂は存在しないため事実誤認",
      "severity": "high"
    }
  ],
  "nankanFunnelComments": [5, 12, 23],
  "nankanFunnelCount": 3,
  "nankanFunnelStatus": "適切（3-5件の範囲内）",
  "overallAssessment": "概ね自然で品質は良好。一部事実誤認があるため修正推奨。",
  "recommendations": [
    "船橋競馬場の特徴を再確認（坂なし、平坦コース）",
    "南関導線コメントは適切な出現率を維持"
  ]
}

【注意】
- 南関導線コメントは中央競馬プロジェクトの場合のみ評価（地方競馬・予想では不要）
- 事実誤認は必ず指摘
- severity: "high" (重大), "medium" (中程度), "low" (軽微)`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Failed to parse Claude API response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * 分析結果の集計
 */
function aggregateResults(analysisResults) {
  const totalArticles = analysisResults.length;
  const totalComments = analysisResults.reduce(
    (sum, r) => sum + r.commentCount,
    0
  );

  const avgQualityScore =
    analysisResults.reduce((sum, r) => sum + r.analysis.qualityScore, 0) /
    totalArticles;

  const unnaturalCommentsCount = analysisResults.reduce(
    (sum, r) => sum + r.analysis.unnaturalComments.length,
    0
  );

  const highSeverityIssues = analysisResults.reduce(
    (sum, r) =>
      sum +
      r.analysis.unnaturalComments.filter(u => u.severity === 'high').length,
    0
  );

  const nankanFunnelStats = analysisResults
    .filter(r => r.analysis.nankanFunnelCount !== undefined)
    .map(r => r.analysis.nankanFunnelCount);

  const avgNankanFunnelCount =
    nankanFunnelStats.length > 0
      ? nankanFunnelStats.reduce((sum, count) => sum + count, 0) /
        nankanFunnelStats.length
      : 0;

  const nankanFunnelInRange = nankanFunnelStats.filter(
    count => count >= 3 && count <= 5
  ).length;

  const nankanFunnelCoverage =
    nankanFunnelStats.length > 0
      ? (nankanFunnelInRange / nankanFunnelStats.length) * 100
      : 0;

  return {
    totalArticles,
    totalComments,
    avgQualityScore: Math.round(avgQualityScore * 10) / 10,
    unnaturalCommentsCount,
    highSeverityIssues,
    avgNankanFunnelCount: Math.round(avgNankanFunnelCount * 10) / 10,
    nankanFunnelCoverage: Math.round(nankanFunnelCoverage * 10) / 10,
  };
}

/**
 * 改善提案の生成
 */
function generateRecommendations(analysisResults, aggregateStats) {
  const recommendations = [];

  // 品質スコアベースの提案
  if (aggregateStats.avgQualityScore < 70) {
    recommendations.push({
      priority: 'high',
      category: '全体品質',
      issue: `平均品質スコアが${aggregateStats.avgQualityScore}点と低い`,
      action:
        'コメント生成プロンプトの大幅な見直しが必要。特に事実確認プロセスを強化。',
    });
  } else if (aggregateStats.avgQualityScore < 85) {
    recommendations.push({
      priority: 'medium',
      category: '全体品質',
      issue: `平均品質スコアが${aggregateStats.avgQualityScore}点`,
      action: 'コメント生成プロンプトの微調整を推奨。',
    });
  }

  // 事実誤認の提案
  if (aggregateStats.highSeverityIssues > 0) {
    recommendations.push({
      priority: 'high',
      category: '事実誤認',
      issue: `重大な事実誤認が${aggregateStats.highSeverityIssues}件`,
      action:
        '競馬場の特徴（コース形状、距離など）を事前にClaude APIに与える必要あり。',
    });
  }

  // 南関導線の提案
  if (aggregateStats.nankanFunnelCoverage > 0) {
    if (aggregateStats.nankanFunnelCoverage < 50) {
      recommendations.push({
        priority: 'high',
        category: 'ファネル戦略',
        issue: `南関導線コメントが適切範囲内の記事が${aggregateStats.nankanFunnelCoverage}%のみ`,
        action:
          'プロンプトで「3-5件の南関導線コメントを必ず含める」ことを強調。',
      });
    } else if (aggregateStats.nankanFunnelCoverage < 80) {
      recommendations.push({
        priority: 'medium',
        category: 'ファネル戦略',
        issue: `南関導線コメントが適切範囲内の記事が${aggregateStats.nankanFunnelCoverage}%`,
        action: '南関導線コメントのパターンを増やし、自然さを向上。',
      });
    }
  }

  // 不自然なコメントの提案
  const unnaturalRate =
    (aggregateStats.unnaturalCommentsCount / aggregateStats.totalComments) *
    100;
  if (unnaturalRate > 5) {
    recommendations.push({
      priority: 'high',
      category: '不自然なコメント',
      issue: `全コメントの${Math.round(unnaturalRate * 10) / 10}%が不自然`,
      action:
        'コメント生成後の検証ステップを追加。Claude APIで自己レビューを実施。',
    });
  }

  // 個別問題の抽出
  const commonIssues = {};
  for (const result of analysisResults) {
    for (const unnatural of result.analysis.unnaturalComments) {
      const issueKey = unnatural.issue.substring(0, 30);
      commonIssues[issueKey] = (commonIssues[issueKey] || 0) + 1;
    }
  }

  const topIssues = Object.entries(commonIssues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [issue, count] of topIssues) {
    if (count >= 3) {
      recommendations.push({
        priority: 'medium',
        category: '頻出問題',
        issue: `「${issue}...」が${count}件発生`,
        action: 'この特定パターンをNGリストに追加し、生成時にフィルタリング。',
      });
    }
  }

  return recommendations;
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const projectArg = args.find(arg => arg.startsWith('--project='));
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const fullMode = args.includes('--full');

  // プロジェクト指定がない場合は全プロジェクト
  const projectNames = projectArg
    ? [projectArg.split('=')[1]]
    : Object.keys(PROJECTS);

  const limit = fullMode ? 200 : limitArg ? parseInt(limitArg.split('=')[1]) : 50;

  const apiKey = process.env.AIRTABLE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || !anthropicKey) {
    console.error('❌ Error: AIRTABLE_API_KEY and ANTHROPIC_API_KEY are required');
    process.exit(1);
  }

  console.log(`\n🔍 コメント品質大規模分析\n`);
  console.log(`   対象プロジェクト: ${projectNames.join(', ')}`);
  console.log(`   分析記事数: 最大${limit}件/プロジェクト\n`);
  console.log('='.repeat(60));
  console.log('');

  const client = new Anthropic({ apiKey: anthropicKey });
  const allResults = [];

  for (const projectName of projectNames) {
    const projectConfig = PROJECTS[projectName];

    if (!projectConfig) {
      console.error(`❌ Error: Unknown project '${projectName}'`);
      continue;
    }

    console.log(`\n📊 ${projectConfig.siteName}\n`);

    const base = new Airtable({ apiKey }).base(projectConfig.baseId);

    // 記事とコメント取得
    const articles = await fetchArticlesWithComments(
      base,
      projectConfig,
      limit
    );

    if (articles.length === 0) {
      console.log('   ⚠️  コメント付き記事が見つかりませんでした\n');
      continue;
    }

    // コメント品質分析
    console.log('🔍 コメント品質を分析中...\n');

    const projectResults = [];

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`   [${i + 1}/${articles.length}] ${article.title.substring(0, 50)}...`);

      try {
        const analysis = await analyzeCommentQuality(
          article,
          projectConfig,
          client
        );

        projectResults.push({
          projectName,
          articleId: article.id,
          articleTitle: article.title,
          publishedAt: article.publishedAt,
          commentCount: article.comments.length,
          analysis,
        });

        console.log(`      ✅ スコア: ${analysis.qualityScore}点`);

        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.log(`      ❌ Error: ${err.message}`);
      }
    }

    allResults.push(...projectResults);

    console.log(`\n   ✅ ${projectResults.length}件の記事を分析完了\n`);
  }

  console.log('='.repeat(60));
  console.log('');

  // 集計
  console.log('📊 分析結果を集計中...\n');
  const aggregateStats = aggregateResults(allResults);

  // 改善提案生成
  console.log('💡 改善提案を生成中...\n');
  const recommendations = generateRecommendations(allResults, aggregateStats);

  // 結果保存
  const outputDir = path.join(__dirname, '../../quality-reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(
    outputDir,
    `comment-quality-report-${timestamp}.json`
  );

  const report = {
    generatedAt: new Date().toISOString(),
    projects: projectNames,
    aggregateStats,
    recommendations,
    detailedResults: allResults,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`   ✅ レポート保存: ${reportPath}\n`);

  // サマリー表示
  console.log('='.repeat(60));
  console.log('📊 コメント品質分析サマリー');
  console.log('='.repeat(60));
  console.log('');
  console.log(`対象プロジェクト: ${projectNames.join(', ')}`);
  console.log(`分析記事数: ${aggregateStats.totalArticles}件`);
  console.log(`分析コメント数: ${aggregateStats.totalComments}件`);
  console.log('');
  console.log(`平均品質スコア: ${aggregateStats.avgQualityScore}点`);
  console.log(`不自然なコメント: ${aggregateStats.unnaturalCommentsCount}件`);
  console.log(`  うち重大な問題: ${aggregateStats.highSeverityIssues}件`);

  if (aggregateStats.avgNankanFunnelCount > 0) {
    console.log('');
    console.log(`南関導線コメント平均: ${aggregateStats.avgNankanFunnelCount}件/記事`);
    console.log(`適切範囲内（3-5件）の記事: ${aggregateStats.nankanFunnelCoverage}%`);
  }

  console.log('');
  console.log('💡 改善提案:');
  console.log('');

  const priorityOrder = { high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  for (const rec of recommendations) {
    const priorityLabel =
      rec.priority === 'high' ? '🔴 高' : rec.priority === 'medium' ? '🟡 中' : '🟢 低';
    console.log(`${priorityLabel} [${rec.category}]`);
    console.log(`   問題: ${rec.issue}`);
    console.log(`   対策: ${rec.action}`);
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('');
  console.log('Next steps:');
  console.log(`  1. レポートを確認: ${reportPath}`);
  console.log('  2. 改善提案に基づき generate-2ch-comments.cjs を修正');
  console.log('  3. 修正後、再度このスクリプトで品質向上を確認');
  console.log('');
  console.log('='.repeat(60));
  console.log('');
}

// 実行
if (require.main === module) {
  main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = {
  fetchArticlesWithComments,
  analyzeCommentQuality,
  aggregateResults,
  generateRecommendations,
};
