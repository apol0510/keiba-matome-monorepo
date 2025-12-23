import Airtable from 'airtable';

// Airtable設定（遅延評価でクライアントサイドエラーを回避）
function getAirtableCredentials() {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  // デバッグ用ログ（ビルド時のみ）
  if (typeof window === 'undefined') {
    console.log('🔍 Environment variables check:');
    console.log('  process.env.AIRTABLE_API_KEY:', AIRTABLE_API_KEY ? 'SET' : 'NOT SET');
    console.log('  process.env.AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID ? 'SET' : 'NOT SET');
    console.log('  Final API_KEY:', AIRTABLE_API_KEY ? `SET (${AIRTABLE_API_KEY.substring(0, 10)}...)` : 'NOT SET');
    console.log('  Final BASE_ID:', AIRTABLE_BASE_ID ? 'SET' : 'NOT SET');
  }

  // クライアントサイドでは環境変数が存在しないため、エラーを投げない
  if (typeof window !== 'undefined') {
    return { apiKey: '', baseId: '' };
  }

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('⚠️ AIRTABLE_API_KEY and AIRTABLE_BASE_ID not set. API routes will not work.');
    return { apiKey: '', baseId: '' };
  }

  return { apiKey: AIRTABLE_API_KEY, baseId: AIRTABLE_BASE_ID };
}

// Airtableクライアント初期化（完全遅延評価）
let _base: ReturnType<ReturnType<typeof Airtable>['base']> | null = null;

function getBase() {
  if (!_base) {
    const { apiKey, baseId } = getAirtableCredentials();
    if (apiKey && baseId) {
      _base = new Airtable({ apiKey }).base(baseId);
    } else {
      return null;
    }
  }
  return _base!;
}

// ヘルパー関数：base('TableName') の代わりに使用
function base(tableName: string) {
  const currentBase = getBase();
  if (!currentBase) {
    throw new Error('Airtable not initialized. Check AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables.');
  }
  return currentBase(tableName);
}

// 型定義（yosou-keiba-matome用）
export interface Article {
  id: string;
  title: string;
  slug: string;
  raceName: string;
  raceDate: string;
  track: string;
  grade: string;
  category: string;
  sourceURL: string;
  sourceSite: string;
  summary: string;
  status: string;
  viewCount: number;
  commentCount: number;
  publishedAt: string;
  hasResult?: boolean;
  hitRate?: number;
}

export interface Comment {
  id: string;
  articleID: string[];
  number: number;
  content: string;
  userName: string;
  userID: string;
  isOP: boolean;
  isApproved: boolean;
  createdAt: string;
}

// 予想記事取得関数
export async function getAllArticles(): Promise<Article[]> {
  const records = await base('Articles').select({
    filterByFormula: '{Status} = "published"',
    sort: [{ field: 'PublishedAt', direction: 'desc' }]
  }).all();

  return records.map(record => ({
    id: record.id,
    title: record.fields.Title as string,
    slug: record.fields.Slug as string,
    raceName: record.fields.RaceName as string,
    raceDate: record.fields.RaceDate as string,
    track: record.fields.Track as string,
    grade: record.fields.Grade as string,
    category: record.fields.Category as string,
    sourceURL: record.fields.SourceURL as string,
    sourceSite: record.fields.SourceSite as string,
    summary: record.fields.Summary as string || '',
    status: record.fields.Status as string,
    viewCount: record.fields.ViewCount as number || 0,
    commentCount: record.fields.CommentCount as number || 0,
    publishedAt: record.fields.PublishedAt as string,
    hasResult: record.fields.HasResult as boolean || false,
    hitRate: record.fields.HitRate as number || 0
  }));
}

// Slug指定で記事取得
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const records = await base('Articles').select({
    filterByFormula: `{Slug} = '${slug}'`,
    maxRecords: 1
  }).all();

  if (records.length === 0) {
    return null;
  }

  const record = records[0];
  return {
    id: record.id,
    title: record.fields.Title as string,
    slug: record.fields.Slug as string,
    raceName: record.fields.RaceName as string,
    raceDate: record.fields.RaceDate as string,
    track: record.fields.Track as string,
    grade: record.fields.Grade as string,
    category: record.fields.Category as string,
    sourceURL: record.fields.SourceURL as string,
    sourceSite: record.fields.SourceSite as string,
    summary: record.fields.Summary as string || '',
    status: record.fields.Status as string,
    viewCount: record.fields.ViewCount as number || 0,
    commentCount: record.fields.CommentCount as number || 0,
    publishedAt: record.fields.PublishedAt as string,
    hasResult: record.fields.HasResult as boolean || false,
    hitRate: record.fields.HitRate as number || 0
  };
}

// コメント取得（記事別）
export async function getCommentsByArticleId(articleId: string): Promise<Comment[]> {
  const allRecords = await base('Comments').select({
    filterByFormula: '{IsApproved} = TRUE()',
    sort: [{ field: 'Number', direction: 'asc' }]
  }).all();

  // JavaScriptでarticleIdでフィルタリング
  const records = allRecords.filter(record => {
    const articleLinkField = record.fields.ArticleID;
    const linkedArticleId = Array.isArray(articleLinkField) ? articleLinkField[0] : articleLinkField;
    return linkedArticleId === articleId;
  });

  return records.map(record => ({
    id: record.id,
    articleID: record.fields.ArticleID as string[],
    number: record.fields.Number as number,
    content: record.fields.Content as string,
    userName: record.fields.UserName as string || '名無しさん@競馬板',
    userID: record.fields.UserID as string,
    isOP: record.fields.IsOP as boolean || false,
    isApproved: record.fields.IsApproved as boolean || false,
    createdAt: record.fields.CreatedAt as string
  }));
}

// コメント作成
export async function createComment(data: {
  articleId: string;
  content: string;
  userName: string;
  userID: string;
}): Promise<Comment> {
  const record = await base('Comments').create({
    ArticleID: [data.articleId],
    Content: data.content,
    UserName: data.userName,
    UserID: data.userID,
    IsApproved: false // デフォルトは未承認
  });

  return {
    id: record.id,
    articleID: [data.articleId],
    content: data.content,
    userName: data.userName,
    userID: data.userID,
    isApproved: false,
    createdAt: record.fields.CreatedAt as string
  };
}

// Airtable設定を取得する関数
export async function getAirtableConfig() {
  const { apiKey, baseId } = getAirtableCredentials();
  return {
    apiKey,
    baseId
  };
}
