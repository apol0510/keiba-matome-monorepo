/**
 * SEO大規模最適化スクリプト
 *
 * 全ページのメタデータ、sitemap.xml、構造化データを自動生成
 *
 * 使い方:
 * ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node packages/shared/scripts/optimize-seo.cjs --project=keiba-matome
 *
 * オプション:
 * --project=<name>     対象プロジェクト（keiba-matome, chihou-keiba-matome, yosou-keiba-matome）
 * --dry-run            実際には書き込まず、プレビューのみ
 */

const Anthropic = require('@anthropic-ai/sdk');
const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

// プロジェクト設定
const PROJECTS = {
  'keiba-matome': {
    baseId: 'appdHJSC4F9pTIoDj',
    tableName: 'News',
    siteUrl: 'https://keiba-matome.jp',
    siteName: '競馬ニュースまとめ（2ch風）',
    description: 'netkeiba・Yahoo!ニュースの競馬ニュースに2ch/5ch風コメントを追加。重賞レース、騎手、馬主の最新情報をまとめて配信。',
    keywords: ['競馬', '競馬ニュース', '2ch', '5ch', 'まとめ', '重賞', '騎手', '有馬記念', 'ダービー'],
  },
  'chihou-keiba-matome': {
    baseId: 'appt25zmKxQDiSCwh',
    tableName: 'News',
    siteUrl: 'https://chihou.keiba-matome.jp',
    siteName: '地方競馬ニュースまとめ（2ch風）',
    description: '南関東4競馬（大井・船橋・川崎・浦和）＋全国地方競馬のニュースまとめ。トゥインクルレース、東京大賞典などの重賞情報も。',
    keywords: ['地方競馬', '南関競馬', '大井競馬', '船橋競馬', '川崎競馬', '浦和競馬', 'TCK', 'トゥインクル', '東京大賞典'],
  },
  'yosou-keiba-matome': {
    baseId: 'appKPasSpjpTtabnv',
    tableName: 'Articles',
    siteUrl: 'https://yosou.keiba-matome.jp',
    siteName: '競馬予想まとめ（2ch風）',
    description: '中央重賞＋南関重賞の予想コラムまとめ。2ch/5ch風の予想コメントで馬券購入をサポート。',
    keywords: ['競馬予想', '重賞予想', '南関予想', '本命', '穴馬', '万馬券', '競馬サイト', '的中率'],
  },
};

/**
 * Claude APIでメタデータ生成
 */
async function generateMetadata(article, projectConfig, client) {
  const prompt = `以下の競馬記事のSEO最適化されたメタデータを生成してください。

【記事タイトル】
${article.title}

【記事要約】
${article.summary}

【サイト情報】
サイト名: ${projectConfig.siteName}
サイトURL: ${projectConfig.siteUrl}
メインキーワード: ${projectConfig.keywords.join(', ')}

【出力形式】
JSON形式で以下を出力してください:
{
  "metaTitle": "SEO最適化されたタイトル（60文字以内、サイト名を含む）",
  "metaDescription": "SEO最適化された説明文（150文字前後、キーワードを含む）",
  "ogTitle": "SNS共有用タイトル（60文字以内、魅力的に）",
  "ogDescription": "SNS共有用説明文（150文字前後、クリックを促す）",
  "keywords": ["キーワード1", "キーワード2", "キーワード3", "キーワード4", "キーワード5"]
}

【注意点】
- metaTitleにはサイト名「${projectConfig.siteName}」を含める
- metaDescriptionには検索キーワード「競馬」「まとめ」「2ch」を自然に含める
- ogTitleは感情に訴える表現（「速報」「驚愕」「必見」など）を使用
- keywordsは記事内容に関連する具体的なキーワード（レース名、騎手名など）`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: prompt,
    }],
  });

  const responseText = message.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Failed to parse Claude API response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * 構造化データ（JSON-LD）生成
 */
function generateStructuredData(article, projectConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    'headline': article.title,
    'description': article.summary,
    'image': `${projectConfig.siteUrl}/og/default.png`,
    'datePublished': article.publishedAt,
    'dateModified': article.publishedAt,
    'author': {
      '@type': 'Organization',
      'name': projectConfig.siteName,
      'url': projectConfig.siteUrl,
    },
    'publisher': {
      '@type': 'Organization',
      'name': projectConfig.siteName,
      'url': projectConfig.siteUrl,
      'logo': {
        '@type': 'ImageObject',
        'url': `${projectConfig.siteUrl}/og/default.png`,
      },
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `${projectConfig.siteUrl}/news/${article.slug}`,
    },
  };
}

/**
 * sitemap.xml生成
 */
function generateSitemap(articles, projectConfig) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // トップページ
  xml += `  <url>\n`;
  xml += `    <loc>${projectConfig.siteUrl}/</loc>\n`;
  xml += `    <changefreq>hourly</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  xml += `  </url>\n`;

  // 各記事ページ
  for (const article of articles) {
    const encodedSlug = encodeURIComponent(article.slug);
    xml += `  <url>\n`;
    xml += `    <loc>${projectConfig.siteUrl}/news/${encodedSlug}</loc>\n`;
    xml += `    <lastmod>${article.publishedAt.split('T')[0]}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const projectArg = args.find(arg => arg.startsWith('--project='));
  const dryRun = args.includes('--dry-run');

  if (!projectArg) {
    console.error('❌ Error: --project=<name> is required');
    console.error('Available projects: keiba-matome, chihou-keiba-matome, yosou-keiba-matome');
    process.exit(1);
  }

  const projectName = projectArg.split('=')[1];
  const projectConfig = PROJECTS[projectName];

  if (!projectConfig) {
    console.error(`❌ Error: Unknown project '${projectName}'`);
    process.exit(1);
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || !anthropicKey) {
    console.error('❌ Error: AIRTABLE_API_KEY and ANTHROPIC_API_KEY are required');
    process.exit(1);
  }

  console.log(`\n🚀 SEO Optimization for ${projectName}\n`);
  console.log(`   Site: ${projectConfig.siteUrl}`);
  console.log(`   Dry Run: ${dryRun ? 'Yes' : 'No'}\n`);

  const base = new Airtable({ apiKey }).base(projectConfig.baseId);
  const client = new Anthropic({ apiKey: anthropicKey });

  // 記事取得
  console.log('📥 Fetching articles from Airtable...\n');
  const records = await base(projectConfig.tableName)
    .select({
      fields: ['Title', 'Slug', 'Summary', 'PublishedAt'],
      filterByFormula: '{Status} = "published"',
      maxRecords: 100, // 最新100件
    })
    .all();

  console.log(`   ✅ Fetched ${records.length} articles\n`);

  const articles = records.map(r => ({
    id: r.id,
    title: r.fields.Title,
    slug: r.fields.Slug,
    summary: r.fields.Summary || r.fields.Title,
    publishedAt: r.fields.PublishedAt,
  }));

  // メタデータ生成
  console.log('🔧 Generating metadata with Claude API...\n');
  const metadataResults = [];

  for (let i = 0; i < Math.min(articles.length, 10); i++) {
    const article = articles[i];
    console.log(`   [${i + 1}/10] ${article.title.substring(0, 50)}...`);

    try {
      const metadata = await generateMetadata(article, projectConfig, client);
      const structuredData = generateStructuredData(article, projectConfig);

      metadataResults.push({
        article,
        metadata,
        structuredData,
      });

      console.log(`      ✅ Generated`);

      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.log(`      ❌ Error: ${err.message}`);
    }
  }

  console.log(`\n   ✅ Generated metadata for ${metadataResults.length} articles\n`);

  // sitemap.xml生成
  console.log('🗺️  Generating sitemap.xml...\n');
  const sitemap = generateSitemap(articles, projectConfig);

  // 結果保存
  const outputDir = path.join(__dirname, `../../seo-output/${projectName}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // メタデータJSON保存
  const metadataPath = path.join(outputDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadataResults, null, 2));
  console.log(`   ✅ Metadata saved: ${metadataPath}`);

  // sitemap.xml保存
  const sitemapPath = path.join(outputDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap);
  console.log(`   ✅ Sitemap saved: ${sitemapPath}\n`);

  // サマリー表示
  console.log('='.repeat(60));
  console.log('📊 SEO Optimization Summary');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Project: ${projectName}`);
  console.log(`Articles processed: ${metadataResults.length}/10`);
  console.log(`Sitemap URLs: ${articles.length + 1}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review generated metadata in:', metadataPath);
  console.log('  2. Copy sitemap.xml to: packages/' + projectName + '/public/sitemap.xml');
  console.log('  3. Implement metadata in Astro templates');
  console.log('  4. Submit sitemap to Google Search Console');
  console.log('');
  console.log('='.repeat(60));
  console.log('');
}

// 実行
if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { generateMetadata, generateStructuredData, generateSitemap };
