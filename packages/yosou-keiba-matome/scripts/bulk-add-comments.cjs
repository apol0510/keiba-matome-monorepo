/**
 * 全記事のコメント数を15-35件にランダム調整
 *
 * 使い方:
 * ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/bulk-add-comments.cjs
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
  console.log(`💬 追加コメント生成中 (${addCount}件): ${article.title.substring(0, 30)}...`);

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
8. 【重要】3-5件に1件程度、以下のような自然な導線コメントを含める：
   - 「予想サイトの口コミって意外と参考になるよな」
   - 「詐欺サイトに引っかからないように評判は調べとけよ」
   - 「〇〇サイトの口コミ見たけど評価低すぎて草」
   - 「有料予想使うなら最低限の下調べは必須」

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

    const content = response.content[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      throw new Error('JSON配列が見つかりません');
    }

    const comments = JSON.parse(jsonMatch[0]);
    return comments;

  } catch (error) {
    console.error(`❌ コメント生成エラー:`, error.message);
    return [];
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🚀 全記事のコメント数を15-35件にランダム調整...\n');

    // 全記事を取得
    const newsRecords = await base('News').select().all();
    console.log(`📊 対象記事: ${newsRecords.length}件\n`);

    // 全コメントを取得
    const allComments = await base('Comments').select().all();

    let totalAdded = 0;

    for (const newsRecord of newsRecords) {
      const newsId = newsRecord.id;
      const title = newsRecord.fields.Title || '無題';
      const summary = newsRecord.fields.Summary || title;

      // この記事の現在のコメント数を取得
      const existingComments = allComments.filter(comment => {
        const newsIdArray = comment.fields.NewsID;
        return newsIdArray && newsIdArray.includes(newsId);
      });

      const currentCount = existingComments.length;

      // 目標コメント数をランダムに決定（15-35件）
      const targetCount = Math.floor(Math.random() * 21) + 15;

      // 追加が必要なコメント数
      const addCount = Math.max(0, targetCount - currentCount);

      if (addCount === 0) {
        console.log(`⏭️  スキップ: "${title.substring(0, 30)}..." (現在${currentCount}件)`);
        continue;
      }

      console.log(`📝 "${title.substring(0, 30)}..." → ${currentCount}件 から ${targetCount}件へ（+${addCount}件）`);

      // コメント生成
      const newComments = await generateAdditionalComments(
        { title, summary },
        currentCount,
        addCount
      );

      if (newComments.length === 0) {
        console.log(`⚠️  コメント生成失敗: "${title.substring(0, 30)}..."`);
        continue;
      }

      // Airtableに保存
      const records = newComments.map(comment => ({
        fields: {
          NewsID: [newsId],
          Content: comment.content,
          UserName: '名無しさん',
          UserID: generateRandomID(),
          IsApproved: true,
          IsOP: false,
        },
      }));

      // 10件ずつバッチ作成
      for (let i = 0; i < records.length; i += 10) {
        const batch = records.slice(i, i + 10);
        await base('Comments').create(batch);
      }

      // CommentCountを更新
      await base('News').update([
        {
          id: newsId,
          fields: {
            CommentCount: currentCount + addCount,
          },
        },
      ]);

      totalAdded += addCount;
      console.log(`✅ "${title.substring(0, 30)}..." → ${addCount}件追加完了\n`);

      // レート制限対策（Claude APIとAirtable APIの両方）
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n🎉 処理完了！ 合計 ${totalAdded}件のコメントを追加しました`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main();
