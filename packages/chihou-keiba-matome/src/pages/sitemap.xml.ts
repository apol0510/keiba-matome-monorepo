import type { APIRoute } from 'astro';
import { getAllNews } from '../lib/news';

// 固定URL
const SITE_URL = 'https://keiba-matome.jp';

export const GET: APIRoute = async () => {
  // 全ニュース記事を取得
  const articles = await getAllNews();

  // 静的ページ（トップページのみ）
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
  ];

  // XMLを生成
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
${articles
  .map(
    (article) => {
      const lastmod = article.publishedAt
        ? new Date(article.publishedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      return `  <url>
    <loc>${SITE_URL}/news/${encodeURIComponent(article.slug)}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    }
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
