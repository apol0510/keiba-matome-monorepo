/**
 * 2ch風コメント自動生成スクリプト（地方競馬特化版）
 *
 * 使い方:
 * ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" node scripts/generate-2ch-comments.cjs
 */

const Airtable = require('airtable');
const Anthropic = require('@anthropic-ai/sdk');

// 環境変数チェック
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;

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
 * Claude APIで2ch風コメントを生成
 */
async function generate2chComments(article, commentCount) {
  console.log(`💬 コメント生成中 (${commentCount}件): ${article.title}`);

  const prompt = `あなたは2ch/5chの地方競馬板の常連住人です。
以下のニュース記事に対して、2ch風の匿名コメントを${commentCount}件生成してください。

【記事タイトル】
${article.sourceTitle || article.title}

【記事要約】
${article.summary}

【元記事URL】
${article.sourceURL || 'なし'}

【コメント生成ルール】
1. 短く、口語的に（15-80文字程度）
2. 「草」「ワロタ」「マジかよ」「これは酷い」などのネットスラング使用
3. 「>>1」などのアンカーを適度に使用（特にレス2-3で）
4. 賛否両論・さまざまな意見を含める（肯定、否定、中立、ネタ）
5. 炎上系記事は煽りコメントも含める

6. **地方競馬特有の用語・スラング**を積極的に使用：
   【南関東4競馬場】
   - 「TCK（大井）は穴が出る」「川崎は鉄板」「船橋の逃げ馬は信頼できる」「浦和は荒れる」
   - 「大井の穴党」「川崎記念は熱い」「船橋の夜は雰囲気最高」

   【地方G1・重賞】
   - 「東京大賞典」「川崎記念」「帝王賞」「ジャパンダートダービー」
   - 「トゥインクルレース」「南関東3歳S」「羽田盃」「黒潮盃」

   【地方競馬あるある】
   - 「ナイター競馬は仕事帰りに最高」
   - 「平日の南関は穴狙い」
   - 「地方は人気薄が来やすい」
   - 「南関のオッズは中央より素直」
   - 「TCKは金曜ナイターが熱い」
   - 「地方競馬のほうが当たる説」
   - 「南関は波乱が少ない（でもたまに大波乱）」

   【競馬場ネタ】
   - 「大井のメガイルミ見ながら競馬最高」
   - 「川崎のもつ煮美味いよな」
   - 「船橋は坂がきつい」
   - 「浦和は馬場が重い」

7. 重複しない多様なコメント
8. 1件目は記事の要約、2件目以降は反応コメント
9. レス番号が進むにつれて、話題が少しずつ脱線するのも自然（例: 最初は記事の話→途中から予想の話→最後は競馬場のグルメの話）

10. 【重要】3-5件に1件程度、以下のような自然な導線コメントを含める：
    - 「予想サイトの口コミって意外と参考になるよな」
    - 「詐欺サイトに引っかからないように評判は調べとけよ」
    - 「地方競馬の予想サイトって当たるの？」
    - 「南関専門の予想サイト使ってる奴おる？」
    - 「中央より地方のほうが予想しやすいって聞くけど本当？」
    - 「TCK特化の予想サイトあったら教えてくれ」
    - 「地方競馬の情報サイトでオススメある？」

【出力形式】
JSON配列で出力してください。各コメントは以下の形式：
{
  "number": レス番号（1-${commentCount}）,
  "content": "コメント本文",
  "isOP": スレ主フラグ（1件目のみtrue）
}

出力例：
[
  {"number": 1, "content": "東京大賞典が大井競馬場で行われ、地方競馬の頂点を決める熱戦が繰り広げられた。", "isOP": true},
  {"number": 2, "content": "マジかよ", "isOP": false},
  {"number": 3, "content": ">>1\\n南関のG1は毎回熱いな", "isOP": false}
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
async function saveCommentsToAirtable(newsRecordId, comments) {
  console.log('💾 Airtableにコメントを保存中...');

  const now = new Date();

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

      // レート制限対策（0.5秒待機）
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ コメント${comment.number}保存エラー:`, error.message);
    }
  }
}

/**
 * 記事のステータスをpublishedに更新
 */
async function publishArticle(recordId, commentCount) {
  try {
    await base('News').update([
      {
        id: recordId,
        fields: {
          Status: 'published',
          CommentCount: commentCount,
        },
      },
    ]);

    console.log('✅ 記事を公開状態に更新しました');
  } catch (error) {
    console.error('❌ 記事更新エラー:', error.message);
  }
}

/**
 * draft状態の記事を取得
 */
async function getDraftArticles() {
  console.log('📰 draft状態の記事を取得中...');

  const records = await base('News')
    .select({
      filterByFormula: `{Status} = 'draft'`,
      maxRecords: 10, // 一度に最大10件
    })
    .firstPage();

  console.log(`✅ ${records.length}件のdraft記事を取得しました`);

  return records.map((record) => ({
    id: record.id,
    title: record.fields.Title,
    sourceTitle: record.fields.SourceTitle,
    sourceURL: record.fields.SourceURL,
    summary: record.fields.Summary,
    category: record.fields.Category,
  }));
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🚀 2ch風コメント生成スクリプト開始（地方競馬特化版）\n');

    // 1. draft状態の記事を取得
    const articles = await getDraftArticles();

    if (articles.length === 0) {
      console.log('ℹ️  コメント生成が必要な記事はありません');
      return;
    }

    // 2. 各記事にコメントを生成
    for (const article of articles) {
      console.log(`\n--- ${article.title} ---`);

      // ランダムなコメント数（15〜35件）
      const commentCount = Math.floor(Math.random() * 21) + 15; // 15-35の範囲

      // 2-1. Claude APIでコメント生成
      const comments = await generate2chComments(article, commentCount);

      if (!comments || comments.length === 0) {
        console.log('⏭️  スキップ: コメント生成失敗');
        continue;
      }

      // 2-2. Airtableに保存
      await saveCommentsToAirtable(article.id, comments);

      // 2-3. 記事をpublished状態に更新
      await publishArticle(article.id, comments.length);

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
