#!/usr/bin/env node

/**
 * サイトマップ自動生成スクリプト
 *
 * 各サイトのAirtableから全記事を取得し、sitemap.xmlを生成します。
 * SSRモードでも正しく動作します。
 *
 * 使用方法:
 *   node generate-sitemap.cjs --site=keiba-matome
 *   node generate-sitemap.cjs --site=chihou-keiba-matome
 *   node generate-sitemap.cjs --site=yosou-keiba-matome
 */

const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

// monorepoルートの.envを読み込む
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

// コマンドライン引数からサイト名を取得
const args = process.argv.slice(2);
const siteArg = args.find(arg => arg.startsWith('--site='));

if (!siteArg) {
  console.error('❌ エラー: --site引数が必要です');
  console.error('使用例: node generate-sitemap.cjs --site=keiba-matome');
  process.exit(1);
}

const SITE = siteArg.split('=')[1];

// サイト別設定
const SITE_CONFIG = {
  'keiba-matome': {
    url: 'https://keiba-matome.jp',
    baseId: process.env.KEIBA_MATOME_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID,
    apiKey: process.env.KEIBA_MATOME_AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY,
    outputPath: path.join(__dirname, '../../keiba-matome/public/sitemap.xml'),
  },
  'chihou-keiba-matome': {
    url: 'https://chihou.keiba-matome.jp',
    baseId: process.env.CHIHOU_KEIBA_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID,
    apiKey: process.env.CHIHOU_KEIBA_AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY,
    outputPath: path.join(__dirname, '../../chihou-keiba-matome/public/sitemap.xml'),
  },
  'yosou-keiba-matome': {
    url: 'https://yosou.keiba-matome.jp',
    baseId: process.env.YOSOU_KEIBA_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID,
    apiKey: process.env.YOSOU_KEIBA_AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY,
    outputPath: path.join(__dirname, '../../yosou-keiba-matome/public/sitemap.xml'),
  },
};

const config = SITE_CONFIG[SITE];

if (!config) {
  console.error(`❌ エラー: 未知のサイト名 "${SITE}"`);
  console.error('有効なサイト:', Object.keys(SITE_CONFIG).join(', '));
  process.exit(1);
}

if (!config.apiKey || !config.baseId) {
  console.error('❌ エラー: Airtable認証情報が不足しています');
  console.error('必要な環境変数:');
  console.error(`  - ${SITE.toUpperCase().replace(/-/g, '_')}_AIRTABLE_API_KEY または AIRTABLE_API_KEY`);
  console.error(`  - ${SITE.toUpperCase().replace(/-/g, '_')}_AIRTABLE_BASE_ID または AIRTABLE_BASE_ID`);
  process.exit(1);
}

// Airtable設定
const base = new Airtable({ apiKey: config.apiKey }).base(config.baseId);

/**
 * 日付をYYYY-MM-DD形式に変換
 */
function formatDate(dateString) {
  if (!dateString) return new Date().toISOString().split('T')[0];

  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * URLエンコード（日本語対応）
 */
function encodeURL(slug) {
  return encodeURIComponent(slug);
}

/**
 * Airtableから全記事を取得
 */
async function fetchAllArticles() {
  console.log(`\n📡 ${SITE}のAirtableから記事を取得中...`);

  const articles = [];

  try {
    // Status field can be either '公開' (Japanese) or 'published' (English)
    const records = await base('News')
      .select({
        filterByFormula: "OR({Status} = '公開', {Status} = 'published')",
        sort: [{ field: 'PublishedAt', direction: 'desc' }],
        fields: ['Slug', 'PublishedAt', 'Title'],
      })
      .all();

    for (const record of records) {
      const slug = record.get('Slug');
      const publishedAt = record.get('PublishedAt');
      const title = record.get('Title');

      if (slug) {
        articles.push({
          slug: slug,
          lastmod: formatDate(publishedAt),
          title: title || slug,
        });
      }
    }

    console.log(`✅ ${articles.length}件の記事を取得しました`);
    return articles;

  } catch (error) {
    console.error('❌ Airtable取得エラー:', error.message);
    throw error;
  }
}

/**
 * sitemap.xmlを生成
 */
function generateSitemapXML(articles) {
  const now = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // トップページ
  xml += '  <url>\n';
  xml += `    <loc>${config.url}/</loc>\n`;
  xml += `    <lastmod>${now}</lastmod>\n`;
  xml += '    <changefreq>hourly</changefreq>\n';
  xml += '    <priority>1.0</priority>\n';
  xml += '  </url>\n';

  // 各記事ページ
  for (const article of articles) {
    xml += '  <url>\n';
    xml += `    <loc>${config.url}/news/${encodeURL(article.slug)}</loc>\n`;
    xml += `    <lastmod>${article.lastmod}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';

  return xml;
}

/**
 * sitemap.xmlをファイルに書き込み
 */
function writeSitemapFile(xml) {
  try {
    // ディレクトリが存在することを確認
    const dir = path.dirname(config.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(config.outputPath, xml, 'utf8');
    console.log(`\n✅ sitemap.xmlを生成しました: ${config.outputPath}`);

    // ファイルサイズを表示
    const stats = fs.statSync(config.outputPath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    console.log(`📊 ファイルサイズ: ${fileSizeKB} KB`);

  } catch (error) {
    console.error('❌ ファイル書き込みエラー:', error.message);
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 サイトマップ生成スクリプト開始\n');
  console.log(`📝 サイト: ${SITE}`);
  console.log(`🌐 URL: ${config.url}`);

  try {
    // 1. Airtableから記事を取得
    const articles = await fetchAllArticles();

    if (articles.length === 0) {
      console.warn('⚠️  警告: 公開記事が1件も見つかりませんでした');
      console.warn('トップページのみのsitemap.xmlを生成します');
    }

    // 2. sitemap.xmlを生成
    const xml = generateSitemapXML(articles);

    // 3. ファイルに書き込み
    writeSitemapFile(xml);

    console.log('\n✅ サイトマップ生成完了');
    console.log(`\n📋 統計:`);
    console.log(`  - 総URL数: ${articles.length + 1}件（トップページ + ${articles.length}記事）`);
    console.log(`  - 最新記事: ${articles.length > 0 ? articles[0].title : 'なし'}`);
    console.log(`  - 最古記事: ${articles.length > 0 ? articles[articles.length - 1].title : 'なし'}`);

    console.log('\n💡 次のステップ:');
    console.log('  1. Google Search Consoleでサイトマップを送信');
    console.log(`     URL: ${config.url}/sitemap.xml`);
    console.log('  2. 24-48時間後にインデックス状況を確認');

  } catch (error) {
    console.error('\n❌ サイトマップ生成失敗');
    console.error(error);
    process.exit(1);
  }
}

main();
