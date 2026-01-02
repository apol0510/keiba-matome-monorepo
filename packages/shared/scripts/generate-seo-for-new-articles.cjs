/**
 * generate-seo-for-new-articles.cjs
 *
 * 新規記事（MetaTitleが空）のみを対象にSEOメタデータを自動生成・適用
 *
 * 使い方:
 * ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" node generate-seo-for-new-articles.cjs --project=keiba-matome
 */

const Anthropic = require('@anthropic-ai/sdk');
const Airtable = require('airtable');

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
  const titleField = article.Title || article.RaceTitle || '';
  const summaryField = article.Summary || article.Prediction || '';

  const prompt = `以下の競馬記事のSEO最適化されたメタデータを生成してください。

【記事タイトル】
${titleField}

【記事要約】
${summaryField}

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
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const projectArg = args.find(arg => arg.startsWith('--project='));

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

  const airtableKey = process.env.AIRTABLE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!airtableKey || !anthropicKey) {
    console.error('❌ Error: AIRTABLE_API_KEY and ANTHROPIC_API_KEY are required');
    process.exit(1);
  }

  console.log(`\n🚀 Auto SEO Generation for ${projectName}\n`);

  const base = new Airtable({ apiKey: airtableKey }).base(projectConfig.baseId);
  const client = new Anthropic({ apiKey: anthropicKey });

  // 新規記事（MetaTitleが空）を取得
  console.log('📥 Fetching new articles (MetaTitle is empty)...\n');

  const titleField = projectConfig.tableName === 'Articles' ? 'RaceTitle' : 'Title';
  const summaryField = projectConfig.tableName === 'Articles' ? 'Prediction' : 'Summary';

  const records = await base(projectConfig.tableName)
    .select({
      filterByFormula: `AND({Status} = 'published', OR({MetaTitle} = '', {MetaTitle} = BLANK()))`,
      maxRecords: 20,
      sort: [{ field: 'PublishedAt', direction: 'desc' }],
    })
    .all();

  if (records.length === 0) {
    console.log('✅ No new articles found. All articles already have SEO metadata.\n');
    return;
  }

  console.log(`📊 Found ${records.length} new articles\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const record of records) {
    const article = {
      id: record.id,
      Title: record.fields[titleField] || '',
      Summary: record.fields[summaryField] || '',
    };

    try {
      console.log(`⏳ Processing: ${article.Title.substring(0, 50)}...`);

      // メタデータ生成
      const metadata = await generateMetadata(article, projectConfig, client);

      // Airtableに保存
      await base(projectConfig.tableName).update(record.id, {
        MetaTitle: metadata.metaTitle,
        MetaDescription: metadata.metaDescription,
        OgTitle: metadata.ogTitle,
        OgDescription: metadata.ogDescription,
        Keywords: metadata.keywords.join(', '),
      });

      console.log(`✅ Success: ${metadata.metaTitle.substring(0, 60)}...\n`);
      successCount++;

      // レート制限対策（200ms待機）
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`❌ Error: ${article.Title}`);
      console.error(`   ${error.message}\n`);
      errorCount++;
    }
  }

  console.log(`\n📊 Result:`);
  console.log(`   Success: ${successCount} articles`);
  console.log(`   Error: ${errorCount} articles`);
  console.log(`\n✨ Auto SEO generation completed!\n`);
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
