/**
 * OGP画像自動生成スクリプト
 *
 * 各記事のOGP画像（1200x630px）を自動生成
 * 2ch風デザインで統一感のある画像を作成
 *
 * 使い方:
 * AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node packages/shared/scripts/generate-ogp-images.cjs --project=keiba-matome
 *
 * オプション:
 * --project=<name>     対象プロジェクト
 * --limit=<num>        生成する画像数（デフォルト: 10）
 * --article-id=<id>    特定の記事のみ生成
 */

const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// プロジェクト設定
const PROJECTS = {
  'keiba-matome': {
    baseId: 'appdHJSC4F9pTIoDj',
    tableName: 'News',
    siteUrl: 'https://keiba-matome.jp',
    siteName: '競馬ニュースまとめ',
    backgroundColor: '#ffffee',
    accentColor: '#ea8b00',
  },
  'chihou-keiba-matome': {
    baseId: 'appt25zmKxQDiSCwh',
    tableName: 'News',
    siteUrl: 'https://chihou.keiba-matome.jp',
    siteName: '地方競馬ニュースまとめ',
    backgroundColor: '#ffffee',
    accentColor: '#ea8b00',
  },
  'yosou-keiba-matome': {
    baseId: 'appKPasSpjpTtabnv',
    tableName: 'Articles',
    siteUrl: 'https://yosou.keiba-matome.jp',
    siteName: '競馬予想まとめ',
    backgroundColor: '#ffffee',
    accentColor: '#ea8b00',
  },
};

// OG画像サイズ（Twitter Card推奨）
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/**
 * 2ch風OGP画像を生成
 */
function generateOGImage(article, projectConfig) {
  const canvas = createCanvas(OG_WIDTH, OG_HEIGHT);
  const ctx = canvas.getContext('2d');

  // 背景色
  ctx.fillStyle = projectConfig.backgroundColor;
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  // ヘッダー（オレンジバー）
  ctx.fillStyle = projectConfig.accentColor;
  ctx.fillRect(0, 0, OG_WIDTH, 120);

  // サイト名（ヘッダー内）
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(projectConfig.siteName, OG_WIDTH / 2, 75);

  // 記事タイトル（メイン）
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'left';

  // タイトルを複数行に分割（50文字で改行）
  const title = article.title;
  const maxCharsPerLine = 22;
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < title.length; i++) {
    currentLine += title[i];
    if (currentLine.length >= maxCharsPerLine || i === title.length - 1) {
      lines.push(currentLine);
      currentLine = '';
    }
    if (lines.length >= 3) break; // 最大3行
  }

  // タイトルを描画
  let y = 220;
  for (const line of lines) {
    ctx.fillText(line, 60, y);
    y += 70;
  }

  // カテゴリバッジ（右下）
  if (article.category) {
    const badgeWidth = 180;
    const badgeHeight = 60;
    const badgeX = OG_WIDTH - badgeWidth - 40;
    const badgeY = OG_HEIGHT - badgeHeight - 40;

    // バッジ背景色（カテゴリ別）
    const categoryColors = {
      '速報': '#ff4444',
      '炎上': '#ff6600',
      'まとめ': '#4444ff',
      'ランキング': '#44ff44',
    };
    ctx.fillStyle = categoryColors[article.category] || '#888888';
    ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

    // バッジテキスト
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(article.category, badgeX + badgeWidth / 2, badgeY + 42);
  }

  // 2ch風フッター
  ctx.fillStyle = '#666666';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('2ch/5ch風コメント付き', OG_WIDTH / 2, OG_HEIGHT - 30);

  return canvas;
}

/**
 * 画像をファイルに保存
 */
function saveImage(canvas, outputPath) {
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const projectArg = args.find(arg => arg.startsWith('--project='));
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const articleIdArg = args.find(arg => arg.startsWith('--article-id='));

  if (!projectArg) {
    console.error('❌ Error: --project=<name> is required');
    process.exit(1);
  }

  const projectName = projectArg.split('=')[1];
  const projectConfig = PROJECTS[projectName];

  if (!projectConfig) {
    console.error(`❌ Error: Unknown project '${projectName}'`);
    process.exit(1);
  }

  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;
  const articleId = articleIdArg ? articleIdArg.split('=')[1] : null;

  const apiKey = process.env.AIRTABLE_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: AIRTABLE_API_KEY is required');
    process.exit(1);
  }

  console.log(`\n🎨 OGP Image Generation for ${projectName}\n`);
  console.log(`   Limit: ${limit} images`);
  if (articleId) {
    console.log(`   Target Article ID: ${articleId}`);
  }
  console.log('');

  const base = new Airtable({ apiKey }).base(projectConfig.baseId);

  // 記事取得
  console.log('📥 Fetching articles from Airtable...\n');

  let records;
  if (articleId) {
    records = await base(projectConfig.tableName)
      .find(articleId)
      .then(r => [r]);
  } else {
    records = await base(projectConfig.tableName)
      .select({
        fields: ['Title', 'Slug', 'Category'],
        filterByFormula: '{Status} = "published"',
        maxRecords: limit,
        sort: [{ field: 'PublishedAt', direction: 'desc' }],
      })
      .all();
  }

  console.log(`   ✅ Fetched ${records.length} articles\n`);

  // 出力ディレクトリ作成
  const outputDir = path.join(__dirname, `../../ogp-output/${projectName}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 画像生成
  console.log('🎨 Generating OGP images...\n');

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const article = {
      id: record.id,
      title: record.fields.Title,
      slug: record.fields.Slug,
      category: record.fields.Category,
    };

    console.log(`   [${i + 1}/${records.length}] ${article.title.substring(0, 50)}...`);

    try {
      const canvas = generateOGImage(article, projectConfig);
      const filename = `${article.slug || article.id}.png`;
      const outputPath = path.join(outputDir, filename);

      saveImage(canvas, outputPath);

      console.log(`      ✅ Saved: ${filename}`);
    } catch (err) {
      console.log(`      ❌ Error: ${err.message}`);
    }
  }

  console.log(`\n✅ Generated ${records.length} OGP images\n`);

  // サマリー表示
  console.log('='.repeat(60));
  console.log('📊 OGP Image Generation Summary');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Project: ${projectName}`);
  console.log(`Images generated: ${records.length}`);
  console.log(`Output directory: ${outputDir}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review generated images in:', outputDir);
  console.log('  2. Copy images to: packages/' + projectName + '/public/og/');
  console.log('  3. Update Astro templates to use dynamic OG images');
  console.log('  4. Test with Twitter Card Validator');
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

module.exports = { generateOGImage, saveImage };
