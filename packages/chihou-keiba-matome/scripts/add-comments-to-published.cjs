/**
 * 公開済み記事にコメント追加スクリプト
 */

const Airtable = require('airtable');
const Anthropic = require('@anthropic-ai/sdk');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!ANTHROPIC_API_KEY || !AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Error: Required environment variables are missing');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

function generateRandomID() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ID:${id}`;
}

async function generate2chComments(article, commentCount) {
  console.log(`💬 コメント生成中 (${commentCount}件): ${article.title}`);

  const prompt = `あなたは2ch/5chの地方競馬板の住人です。
以下のニュース記事に対して、2ch風の匿名コメントを${commentCount}件生成してください。

【記事タイトル】
${article.sourceTitle || article.title}

【記事要約】
${article.summary}

【コメント生成ルール】
1. 短く、口語的に（15-80文字程度）
2. 「草」「ワロタ」「マジかよ」などのネットスラング使用
3. 「>>1」などのアンカーを適度に使用
4. 賛否両論・さまざまな意見を含める
5. **地方競馬特有の用語**を使用：
   - 「南関」「TCK」「ナイター」「トゥインクル」
   - 「大井の穴党」「川崎の鉄板」「船橋の逃げ馬」
   - 「東京大賞典」「川崎記念」「帝王賞」
6. 重複しない多様なコメント
7. 1件目は記事の要約、2件目以降は反応コメント

【出力形式】
JSON配列で出力してください。各コメントは以下の形式：
{
  "number": レス番号（1-${commentCount}）,
  "content": "コメント本文",
  "isOP": スレ主フラグ（1件目のみtrue）
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

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

async function saveCommentsToAirtable(newsRecordId, comments) {
  console.log('💾 Airtableにコメントを保存中...');

  for (const comment of comments) {
    try {
      await base('Comments').create([
        {
          fields: {
            NewsID: [newsRecordId],
            Number: comment.number,
            UserID: comment.number === 1 ? 'ID:thread_op' : generateRandomID(),
            Content: comment.content,
            IsOP: comment.isOP || false,
          },
        },
      ]);

      console.log(`✅ コメント${comment.number}を保存`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ コメント${comment.number}保存エラー:`, error.message);
    }
  }
}

async function updateArticle(recordId, commentCount) {
  try {
    await base('News').update([
      {
        id: recordId,
        fields: {
          CommentCount: commentCount,
        },
      },
    ]);
    console.log('✅ 記事のコメント数を更新しました');
  } catch (error) {
    console.error('❌ 記事更新エラー:', error.message);
  }
}

async function getPublishedArticlesWithoutComments() {
  console.log('📰 コメントのない公開済み記事を取得中...');

  const records = await base('News')
    .select({
      filterByFormula: `AND({Status} = 'published', OR({CommentCount} = 0, {CommentCount} = BLANK()))`,
      maxRecords: 10,
    })
    .firstPage();

  console.log(`✅ ${records.length}件の記事を取得しました`);

  return records.map((record) => ({
    id: record.id,
    title: record.fields.Title,
    sourceTitle: record.fields.SourceTitle,
    summary: record.fields.Summary,
  }));
}

async function main() {
  try {
    console.log('🚀 公開済み記事コメント追加スクリプト開始\n');

    const articles = await getPublishedArticlesWithoutComments();

    if (articles.length === 0) {
      console.log('ℹ️  コメント追加が必要な記事はありません');
      return;
    }

    for (const article of articles) {
      console.log(`\n--- ${article.title} ---`);

      const commentCount = Math.floor(Math.random() * 21) + 15; // 15-35件
      const comments = await generate2chComments(article, commentCount);

      if (!comments || comments.length === 0) {
        console.log('⏭️  スキップ: コメント生成失敗');
        continue;
      }

      await saveCommentsToAirtable(article.id, comments);
      await updateArticle(article.id, comments.length);

      console.log('✅ 完了\n');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    console.log('\n✅ すべての処理が完了しました！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
