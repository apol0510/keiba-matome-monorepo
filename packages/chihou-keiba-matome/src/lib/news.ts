/**
 * ニュース記事取得ライブラリ
 * Airtableから競馬予想サイトのニュースを取得
 */

import Airtable from 'airtable';
import { config } from '../config';
import { getCache, setCache } from './cache.js';

// Airtableクライアントの初期化
let base: ReturnType<ReturnType<typeof Airtable>['base']> | null = null;

function getBase() {
  if (!base && typeof window === 'undefined') {
    if (!config.airtable.apiKey || !config.airtable.baseId) {
      throw new Error('Airtable credentials not configured. Check KEIBA_B_AIRTABLE_API_KEY and KEIBA_B_AIRTABLE_BASE_ID.');
    }
    base = new Airtable({ apiKey: config.airtable.apiKey }).base(config.airtable.baseId);
  }
  return base!;
}

/**
 * ニュース記事の型定義
 */
export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content?: string;
  publishedAt: Date;
  viewCount: number;
  commentCount: number; // 2ch風コメント数
  isFeatured: boolean;
  tags: string[];
  author?: string;
  thumbnail?: string;
  sourceURL?: string; // 元記事URL
  sourceSite?: string; // 引用元サイト（netkeiba/Yahoo/その他）
}

/**
 * タイムラインアイテムの型定義
 */
export interface TimelineItem {
  time: string;
  category: string;
  title: string;
  slug: string;
}

/**
 * Airtableレコードをニュース記事に変換
 */
function recordToArticle(record: any): NewsArticle {
  const fields = record.fields;

  return {
    id: record.id,
    title: fields.Title || '',
    slug: fields.Slug || '',
    category: fields.Category || 'ニュース',
    excerpt: fields.Summary || '',
    content: fields.Summary || '',
    publishedAt: fields.PublishedAt ? new Date(fields.PublishedAt) : new Date(),
    viewCount: fields.ViewCount || 0,
    commentCount: fields.CommentCount || 0, // コメント数を取得
    isFeatured: fields.IsFeatured || false,
    tags: fields.Tags || [],
    author: fields.Author,
    thumbnail: fields.Thumbnail?.[0]?.url,
    sourceURL: fields.SourceURL || '',
    sourceSite: fields.SourceSite || '',
  };
}

/**
 * 最新のニュース記事を取得
 */
export async function getLatestNews(limit: number = 10): Promise<NewsArticle[]> {
  const cacheKey = `latest-news-${limit}`;

  // キャッシュチェック
  const cached = getCache<NewsArticle[]>(cacheKey);
  if (cached) return cached;

  try {
    // 環境変数が設定されていない場合は空配列を返す（ビルド時）
    if (!config.airtable.apiKey || !config.airtable.baseId) {
      console.warn('⚠️ Airtable credentials not set. Returning empty news array.');
      return [];
    }

    const base = getBase();
    const records = await base('News')
      .select({
        maxRecords: limit,
        sort: [{ field: 'PublishedAt', direction: 'desc' }],
        filterByFormula: '{Status} = "published"',
      })
      .all();

    const articles = records.map(recordToArticle);
    setCache(cacheKey, articles);
    return articles;
  } catch (error) {
    console.error('Failed to fetch news from Airtable:', error);
    return [];
  }
}

/**
 * カテゴリ別のニュース記事を取得
 */
export async function getNewsByCategory(category: string, limit: number = 10): Promise<NewsArticle[]> {
  try {
    // 環境変数が設定されていない場合は空配列を返す（ビルド時）
    if (!config.airtable.apiKey || !config.airtable.baseId) {
      console.warn('⚠️ Airtable credentials not set. Returning empty news array.');
      return [];
    }

    const base = getBase();
    const records = await base('News')
      .select({
        maxRecords: limit,
        sort: [{ field: 'PublishedAt', direction: 'desc' }],
        filterByFormula: `AND({Status} = "published", {Category} = "${category}")`,
      })
      .all();

    return records.map(recordToArticle);
  } catch (error) {
    console.error(`Failed to fetch news for category ${category}:`, error);
    return [];
  }
}

/**
 * 注目記事を取得
 */
export async function getFeaturedNews(limit: number = 3): Promise<NewsArticle[]> {
  try {
    // 環境変数が設定されていない場合は空配列を返す（ビルド時）
    if (!config.airtable.apiKey || !config.airtable.baseId) {
      console.warn('⚠️ Airtable credentials not set. Returning empty news array.');
      return [];
    }

    const base = getBase();
    const records = await base('News')
      .select({
        maxRecords: limit,
        sort: [{ field: 'PublishedAt', direction: 'desc' }],
        filterByFormula: 'AND({Status} = "published", {IsFeatured} = 1)',
      })
      .all();

    return records.map(recordToArticle);
  } catch (error) {
    console.error('Failed to fetch featured news:', error);
    return [];
  }
}

/**
 * すべてのニュース記事を取得（静的ページ生成用）
 */
export async function getAllNews(): Promise<NewsArticle[]> {
  try {
    // 環境変数が設定されていない場合は空配列を返す（ビルド時）
    if (!config.airtable.apiKey || !config.airtable.baseId) {
      console.warn('⚠️ Airtable credentials not set. Returning empty news array.');
      return [];
    }

    const base = getBase();
    const records = await base('News')
      .select({
        filterByFormula: '{Status} = "published"',
        sort: [{ field: 'PublishedAt', direction: 'desc' }],
      })
      .all();

    return records.map(recordToArticle);
  } catch (error) {
    console.error('Failed to fetch all news from Airtable:', error);
    return [];
  }
}

/**
 * スラッグから記事を取得
 */
export async function getNewsBySlug(slug: string): Promise<NewsArticle | null> {
  const cacheKey = `article-${slug}`;

  // キャッシュチェック
  const cached = getCache<NewsArticle | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    // 環境変数が設定されていない場合はnullを返す（ビルド時）
    if (!config.airtable.apiKey || !config.airtable.baseId) {
      console.warn('⚠️ Airtable credentials not set. Returning null.');
      return null;
    }

    const base = getBase();
    const records = await base('News')
      .select({
        maxRecords: 1,
        filterByFormula: `AND({Status} = "published", {Slug} = "${slug}")`,
      })
      .all();

    if (records.length === 0) {
      setCache(cacheKey, null);
      return null;
    }

    const article = recordToArticle(records[0]);
    setCache(cacheKey, article);
    return article;
  } catch (error) {
    console.error(`Failed to fetch article with slug ${slug}:`, error);
    return null;
  }
}

/**
 * 旧関数名との互換性のため残しておく
 */
export async function getArticleBySlug(slug: string): Promise<NewsArticle | null> {
  return getNewsBySlug(slug);
}

/**
 * タイムライン用の最新記事を取得
 */
export async function getTimelineItems(limit: number = 6): Promise<TimelineItem[]> {
  try {
    // 環境変数が設定されていない場合は空配列を返す（ビルド時）
    if (!config.airtable.apiKey || !config.airtable.baseId) {
      console.warn('⚠️ Airtable credentials not set. Returning empty timeline array.');
      return [];
    }

    const base = getBase();
    const records = await base('News')
      .select({
        maxRecords: limit,
        sort: [{ field: 'PublishedAt', direction: 'desc' }],
        filterByFormula: '{Status} = "published"',
      })
      .all();

    return records.map(record => {
      const fields = record.fields;
      const publishedAt = fields.PublishedAt ? new Date(fields.PublishedAt) : new Date();

      // 相対時間を計算
      const now = new Date();
      const diff = now.getTime() - publishedAt.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));

      let timeStr = '';
      if (hours < 1) {
        timeStr = `${minutes}分前`;
      } else if (hours < 24) {
        timeStr = `${hours}時間前`;
      } else {
        timeStr = publishedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      }

      return {
        time: timeStr,
        category: fields.Category || 'ニュース',
        title: fields.Title || '',
        slug: fields.Slug || '',
      };
    });
  } catch (error) {
    console.error('Failed to fetch timeline items:', error);
    return [];
  }
}

/**
 * 閲覧数をインクリメント
 */
export async function incrementViewCount(articleId: string): Promise<void> {
  try {
    // 環境変数が設定されていない場合は何もしない
    if (!config.airtable.apiKey || !config.airtable.baseId) {
      console.warn('⚠️ Airtable credentials not set. Skipping view count increment.');
      return;
    }

    const base = getBase();
    const record = await base('News').find(articleId);
    const currentViews = record.fields.ViewCount || 0;

    await base('News').update(articleId, {
      ViewCount: currentViews + 1,
    });
  } catch (error) {
    console.error(`Failed to increment view count for article ${articleId}:`, error);
  }
}

/**
 * 2ch風コメントの型定義
 */
export interface Comment {
  id: string;
  number: number;
  userID: string;
  content: string;
  isOP: boolean;
  createdAt: Date;
}

/**
 * 記事のコメントを取得
 */
export async function getCommentsByNewsId(newsId: string): Promise<Comment[]> {
  const cacheKey = `comments-${newsId}`;

  // キャッシュチェック
  const cached = getCache<Comment[]>(cacheKey);
  if (cached) return cached;

  try {
    // 環境変数が設定されていない場合は空配列を返す
    if (!config.airtable.apiKey || !config.airtable.baseId) {
      console.warn('⚠️ Airtable credentials not set. Returning empty comments array.');
      return [];
    }

    const base = getBase();

    // 🔥 全コメント取得をキャッシュ（最大のボトルネック解消）
    const allCommentsCacheKey = 'all-comments';
    let allRecords = getCache<any[]>(allCommentsCacheKey);

    if (!allRecords) {
      allRecords = await base('Comments')
        .select({
          sort: [{ field: 'CreatedAt', direction: 'asc' }],
        })
        .all();
      setCache(allCommentsCacheKey, allRecords);
      console.log(`💾 全コメント取得完了: ${allRecords.length}件`);
    }

    // NewsIDが一致し、承認済みのコメントのみ抽出
    const filteredRecords = allRecords.filter(record => {
      const newsIdArray = record.fields.NewsID;
      const isApproved = record.fields.IsApproved !== false;
      return newsIdArray && newsIdArray.includes(newsId) && isApproved;
    });

    // レス番号を振り直す（1から連番）
    const comments = filteredRecords.map((record, index) => ({
      id: record.id,
      number: index + 1,
      userID: record.fields.UserID || 'ID:unknown',
      content: record.fields.Content || '',
      isOP: record.fields.IsOP || false,
      createdAt: record.fields.CreatedAt ? new Date(record.fields.CreatedAt) : new Date(),
    }));

    setCache(cacheKey, comments);
    return comments;
  } catch (error) {
    console.error(`Failed to fetch comments for news ${newsId}:`, error);
    return [];
  }
}
