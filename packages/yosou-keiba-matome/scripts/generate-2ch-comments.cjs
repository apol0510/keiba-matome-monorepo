#!/usr/bin/env node
/**
 * yosou-keiba-matome 2ch風コメント自動生成スクリプト
 *
 * 使い方:
 * ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/generate-2ch-comments.cjs
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
 * Claude APIで2ch風予想コメントを生成
 */
async function generate2chComments(article, commentCount) {
  console.log(`💬 予想コメント生成中 (${commentCount}件): ${article.Title}`);

  const prompt = `あなたは2ch/5chの競馬板の住人です。
以下の重賞レースの予想記事に対して、2ch風の予想コメントを${commentCount}件生成してください。

【レース名】
${article.RaceName}（${article.Grade}・${article.Track}）
レース日: ${article.RaceDate}

【予想記事要約】
${article.Summary}

【コメント生成ルール】
1. 短く、口語的に（10-60文字程度）
2. 予想ポイントを含める（「◎本命は〇〇」「穴狙いなら△△」）
3. 「>>1」「>>5」などのアンカーを適度に使用
4. 賛否両論（「この予想は鉄板」「いや△△の方が来る」）
5. 競馬用語・スラング（「逃げ馬」「穴馬」「ガチガチ」「万馬券」など）
6. 南関特有の表現（「TCK」「南関競馬」「ナイター」「船橋巧者」など）※南関レースの場合のみ
7. 3-5件に1件程度、以下のような有料予想への自然な導線コメントを含める：
   - 「有料予想使ってる人いる？精度どうよ？」
   - 「〇〇予想サイトの的中率ヤバいらしいな」
   - 「詐欺サイトに引っかからないように評判は調べとけよ」
   - 「自力予想で負けまくってるから有料試してみるか」

【出力形式】
以下のJSON配列形式で出力してください。

[
  {"content": "本命は2番で鉄板だろ"},
  {"content": ">>1\\nいや11番の方が来るって"},
  {"content": "穴狙いなら7番が面白いぞ"}
]

それでは、${commentCount}件のコメントをJSON配列で生成してください。`;

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
async function saveCommentsToAirtable(articleRecordId, comments) {
  console.log('💾 Airtableにコメントを保存中...');

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    try {
      await base('Comments').create([
        {
          fields: {
            ArticleID: [articleRecordId],
            Content: comment.content,
            UserName: '名無しさん@実況で競馬板アウト',
            UserID: generateRandomID(),
            IsApproved: true,
          },
        },
      ]);

      console.log(`✅ コメント${i + 1}を保存`);

      // レート制限対策（0.5秒待機）
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ コメント${i + 1}保存エラー:`, error.message);
    }
  }
}

/**
 * 記事のCommentCountを更新
 */
async function updateCommentCount(recordId, commentCount) {
  try {
    await base('Articles').update([
      {
        id: recordId,
        fields: {
          CommentCount: commentCount,
        },
      },
    ]);

    console.log(`✅ CommentCountを${commentCount}に更新しました`);
  } catch (error) {
    console.error('❌ 記事更新エラー:', error.message);
  }
}

/**
 * published状態でコメントがない記事を取得
 */
async function getArticlesWithoutComments() {
  console.log('📰 コメント未生成の記事を取得中...');

  const records = await base('Articles')
    .select({
      filterByFormula: "AND({Status} = 'published', {CommentCount} = 0)",
      maxRecords: 10,
    })
    .firstPage();

  console.log(`   ${records.length}件の記事を取得しました\n`);

  return records.map((record) => ({
    id: record.id,
    Title: record.fields.Title,
    RaceName: record.fields.RaceName,
    RaceDate: record.fields.RaceDate,
    Track: record.fields.Track,
    Grade: record.fields.Grade,
    Category: record.fields.Category,
    Summary: record.fields.Summary,
  }));
}

async function main() {
  console.log('🚀 2ch風予想コメント生成スクリプト開始\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. コメント未生成の記事を取得
    const articles = await getArticlesWithoutComments();

    if (articles.length === 0) {
      console.log('ℹ️  コメント未生成の記事はありません');
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ 処理完了');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(0);
    }

    // 2. 各記事にコメント生成
    for (const article of articles) {
      console.log(`📝 処理中: ${article.Title}`);
      console.log(`   カテゴリ: ${article.Category}`);
      console.log(`   グレード: ${article.Grade}\n`);

      // ランダムなコメント数（15-35件）
      const commentCount = Math.floor(Math.random() * 21) + 15;

      // コメント生成
      const comments = await generate2chComments(article, commentCount);

      if (!comments) {
        console.log('⏭️  スキップします\n');
        continue;
      }

      // Airtableに保存
      await saveCommentsToAirtable(article.id, comments);

      // CommentCount更新
      await updateCommentCount(article.id, comments.length);

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    console.log('✅ すべての記事のコメント生成完了');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
