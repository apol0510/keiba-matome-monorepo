/**
 * 既存記事に2ch風コメントを追加するスクリプト
 *
 * 1-3日以内の記事にランダムで3-8件のコメントを追加
 *
 * 使い方:
 * ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/add-comments-to-existing.cjs
 */

const Airtable = require('airtable');
const Anthropic = require('@anthropic-ai/sdk');

// 環境変数チェック
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!ANTHROPIC_API_KEY) {
  console.error('❌ Error: ANTHROPIC_API_KEY is required');
  process.exit(1);
}

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required');
  process.exit(1);
}

// Airtable初期化
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

// Claude初期化
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

/**
 * ランダムなユーザーID生成
 */
function generateRandomID() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ID:${id}`;
}

/**
 * Claude APIで追加コメントを生成
 */
async function generateAdditionalComments(article, existingCount, addCount) {
  console.log(`💬 追加コメント生成中 (${addCount}件): ${article.title}`);

  const prompt = `あなたは2ch/5chの競馬板の住人です。
以下のニュース記事のスレッドに、追加のコメント（レス）を${addCount}件生成してください。

【記事タイトル】
${article.title}

【記事要約】
${article.summary}

【現在のレス番号】
既に${existingCount}件のレスがあります。次のレス番号は${existingCount + 1}番から開始してください。

【コメント生成ルール】
1. 短く、口語的に（10-60文字程度）
2. 「草」「ワロタ」「マジかよ」「これは酷い」などのネットスラング使用
3. 「>>1」「>>${Math.floor(Math.random() * existingCount) + 1}」などのアンカーを適度に使用
4. 賛否両論・さまざまな意見を含める（肯定、否定、中立、ネタ）
5. 競馬用語・スラング（「逃げ馬」「穴馬」「ガチガチ」など）を適切に使用
6. 時間が経過したスレッドらしい「亀レスだけど」「今更だけど」などの表現も含める
7. 重複しない多様なコメント

【出力形式】
JSON配列で出力してください。各コメントは以下の形式：
{
  "number": レス番号（${existingCount + 1}から開始）,
  "content": "コメント本文"
}

出力例：
[
  {"number": ${existingCount + 1}, "content": "今更だけどこれマジ？"},
  {"number": ${existingCount + 2}, "content": ">>1\\n草生える"}
]

それでは、${addCount}件のコメントをJSON配列で生成してください。`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // レスポンスからJSON部分を抽出
    const text = response.content[0].text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      throw new Error('JSON形式のコメントが生成されませんでした');
    }

    const comments = JSON.parse(jsonMatch[0]);
    console.log(`✅ ${comments.length}件のコメントを生成しました`);

    return comments;
  } catch (error) {
    console.error('❌ Claude API エラー:', error.message);
    return null;
  }
}

/**
 * Airtableにコメントを保存
 */
async function saveCommentsToAirtable(newsRecordId, comments) {
  console.log('💾 Airtableにコメントを保存中...');

  for (const comment of comments) {
    try {
      await base('Comments').create([
        {
          fields: {
            NewsID: [newsRecordId],
            Number: comment.number,
            UserID: generateRandomID(),
            Content: comment.content,
            IsOP: false,
          },
        },
      ]);

      console.log(`✅ コメント${comment.number}を保存`);

      // レート制限対策（0.5秒待機）
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ コメント${comment.number}保存エラー:`, error.message);
    }
  }
}

/**
 * 記事のコメント数を更新
 */
async function updateCommentCount(recordId, newCount) {
  try {
    await base('News').update([
      {
        id: recordId,
        fields: {
          CommentCount: newCount,
        },
      },
    ]);

    console.log(`✅ コメント数を${newCount}件に更新しました`);
  } catch (error) {
    console.error('❌ コメント数更新エラー:', error.message);
  }
}

/**
 * 既存のコメント数を取得
 */
async function getExistingCommentCount(newsRecordId) {
  const records = await base('Comments')
    .select({
      filterByFormula: `FIND("${newsRecordId}", ARRAYJOIN({NewsID}))`,
    })
    .all();

  return records.length;
}

/**
 * 1-3日以内の記事を取得
 */
async function getRecentArticles() {
  console.log('📰 1-3日以内の記事を取得中...');

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const records = await base('News')
    .select({
      filterByFormula: `AND(
        {Status} = 'published',
        IS_AFTER({PublishedAt}, '${threeDaysAgo.toISOString()}'),
        IS_BEFORE({PublishedAt}, '${oneDayAgo.toISOString()}')
      )`,
      maxRecords: 10, // 一度に最大10件
    })
    .firstPage();

  console.log(`✅ ${records.length}件の記事を取得しました`);

  return records.map((record) => ({
    id: record.id,
    title: record.fields.Title,
    summary: record.fields.Summary,
    publishedAt: record.fields.PublishedAt,
    commentCount: record.fields.CommentCount || 0,
  }));
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🚀 既存記事へのコメント追加スクリプト開始\n');

    // 1. 1-3日以内の記事を取得
    const articles = await getRecentArticles();

    if (articles.length === 0) {
      console.log('ℹ️  コメント追加が必要な記事はありません');
      return;
    }

    // 2. 各記事にコメントを追加
    for (const article of articles) {
      console.log(`\n--- ${article.title} ---`);

      // 既存のコメント数を確認
      const existingCount = await getExistingCommentCount(article.id);
      console.log(`📊 現在のコメント数: ${existingCount}件`);

      // すでに30件以上ある場合はスキップ
      if (existingCount >= 30) {
        console.log('⏭️  スキップ: すでに30件以上のコメントがあります');
        continue;
      }

      // ランダムな追加コメント数（3-8件）
      const baseAddCount = Math.floor(Math.random() * 6) + 3; // 3-8の範囲
      const addCount = Math.min(baseAddCount, 30 - existingCount); // 最大30件まで

      console.log(`➕ 追加するコメント数: ${addCount}件`);

      // Claude APIで追加コメント生成
      const comments = await generateAdditionalComments(article, existingCount, addCount);

      if (!comments || comments.length === 0) {
        console.log('⏭️  スキップ: コメント生成失敗');
        continue;
      }

      // Airtableに保存
      await saveCommentsToAirtable(article.id, comments);

      // コメント数を更新
      const newCount = existingCount + comments.length;
      await updateCommentCount(article.id, newCount);

      console.log('✅ 完了\n');

      // レート制限対策（次の記事まで3秒待機）
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    console.log('\n✅ すべての処理が完了しました！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
