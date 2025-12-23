/**
 * 2ch風コメント自動生成スクリプト（競馬予想特化版）
 *
 * yosou-keiba-matome専用
 * 中央重賞＋南関重賞の予想記事に特化したコメント生成
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

  const prompt = `あなたは2ch/5chの競馬板（予想スレ）の常連住人です。
以下の重賞レース予想記事に対して、2ch風の予想・馬券談義コメントを${commentCount}件生成してください。

【レース予想記事】
${article.sourceTitle || article.title}

【予想内容】
${article.summary}

【元記事URL】
${article.sourceURL || 'なし'}

【コメント生成ルール】

**1. 予想スレ特有の書き込みスタイル**
- 短く、口語的に（10-70文字程度）
- 「◎本命」「○対抗」「▲単穴」などの印記号を使う
- 「買い目: 3連単 1-5-7,9」のような具体的な馬券提示
- 「オッズ的に美味しい」「人気薄狙い」「鉄板」「ガチガチ」
- 「>>1」などのアンカーを適度に使用（特にレス2-5で）

**2. 予想スレあるある（バリエーション豊富に）**
- 本命党 vs 穴党の議論
- 「前走内容からして〇〇が来る」
- 「血統的に△△は買えない」
- 「騎手で判断すると×× 一択」
- 「馬場状態次第だな」
- 「枠順ガチャ失敗したわ」
- 「単勝1.2倍とか旨味ねえよ」
- 「これ荒れるパターンだろ」
- 「人気サイドで手堅く行く」
- 「万馬券狙いで勝負」

**3. 中央重賞 vs 南関重賞の特徴**

【中央重賞（JRA G1/G2/G3）の場合】
- 「有馬記念は年末の大一番」「天皇賞は伝統のレース」
- 「このメンバーなら〇〇一強」
- 「武豊騎乗なら信頼できる」
- 「中山の直線は短いから差しが決まらない」
- 「阪神の芝は内有利」
- 「JRAのG1は固い」「中央は人気馬が強すぎ」

【南関重賞（S1/S2/S3, Jpn1/Jpn2/Jpn3）の場合】
- 「TCK（大井）は穴が出やすい」「川崎は鉄板寄り」
- 「船橋の坂はキツい」「浦和は荒れる」
- 「ナイター競馬で一稼ぎ」「仕事帰りに大井最高」
- 「南関は中央崩れの馬が活躍する」
- 「地方のほうがオッズ美味しい」
- 「東京大賞典」「川崎記念」「帝王賞」「ジャパンダートダービー」
- 「トゥインクルレース」「羽田盃」「黒潮盃」
- 「南関の予想は難しい」「平日南関で穴狙い」

**4. 話題の自然な展開**
- レス1-5: 予想記事への反応
- レス6-15: 具体的な買い目・印の議論
- レス16-25: 過去のレース回顧、騎手・血統談義
- レス26-35: 少しずつ脱線（競馬場グルメ、他レースの話題など）

**5. 【超重要】有料予想サイトへの自然な導線（3-5件に1件）**

以下のような、自然で違和感のないコメントをバランスよく配置してください：

【自力予想派】
- 「自分で予想するのが楽しいんだよ」
- 「予想サイトなんて当たらんやろ」
- 「無料予想で十分」
- 「過去データ見れば誰でも予想できる」

【有料予想肯定派】
- 「予想サイトの口コミサイトで評判調べてから使ったほうがいい」
- 「南関専門の予想サイト使ってる奴おる？」
- 「詐欺サイト多いから口コミ評価は必須」
- 「的中率公開してる予想サイトは信用できる」
- 「地方競馬特化の予想サイトって当たるの？」
- 「中央より南関のほうが予想しやすいって聞くけど」
- 「有料予想で回収率150%超えたわ」

【中立・情報収集派】
- 「予想サイトの評判サイトって参考になる？」
- 「詐欺予想サイトに引っかからない方法教えて」
- 「口コミ500件以上ある予想サイトなら安心かな」
- 「無料お試しで様子見するのが賢い」

**6. 重複なし・多様性**
- 同じ表現を繰り返さない
- 肯定・否定・中立・ネタをバランスよく
- 賛否両論があるのが自然

【出力形式】
JSON配列で出力してください。各コメントは以下の形式：
{
  "number": レス番号（1-${commentCount}）,
  "content": "コメント本文",
  "isOP": スレ主フラグ（1件目のみtrue）
}

出力例：
[
  {"number": 1, "content": "【有馬記念】本命はドウデュース、対抗イクイノックスで勝負！", "isOP": true},
  {"number": 2, "content": ">>1\\n固すぎワロタ", "isOP": false},
  {"number": 3, "content": "◎ドウデュース ○イクイノックス ▲スルーネットワーク", "isOP": false},
  {"number": 4, "content": "穴狙いならスターズオンアースだろ", "isOP": false}
]

それでは、${commentCount}件の予想スレ風コメントをJSON配列で生成してください。`;

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
            ArticleID: [newsRecordId],
            Number: comment.number,
            UserID: comment.number === 1 ? 'ID:thread_op' : generateRandomID(),
            Content: comment.content,
            IsOP: comment.isOP || false,
            UserName: '名無しさん@競馬板',
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
    await base('Articles').update([
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

  const records = await base('Articles')
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
    console.log('🚀 2ch風コメント生成スクリプト開始（競馬予想特化版）\n');

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
