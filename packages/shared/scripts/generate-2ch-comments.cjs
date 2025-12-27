/**
 * 2ch風コメント自動生成スクリプト（中央・地方競馬対応）
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

// Base IDで競馬種別を判定
const KEIBA_TYPE = {
  CHUOU: 'chuou',  // 中央競馬 (appdHJSC4F9pTIoDj)
  CHIHOU: 'chihou', // 地方競馬 (appt25zmKxQDiSCwh)
  YOSOU: 'yosou',   // 予想 (appKPasSpjpTtabnv)
};

function detectKeibaType(baseId) {
  if (baseId === 'appdHJSC4F9pTIoDj') return KEIBA_TYPE.CHUOU;
  if (baseId === 'appt25zmKxQDiSCwh') return KEIBA_TYPE.CHIHOU;
  if (baseId === 'appKPasSpjpTtabnv') return KEIBA_TYPE.YOSOU;
  return KEIBA_TYPE.CHIHOU; // デフォルトは地方
}

const currentKeibaType = detectKeibaType(AIRTABLE_BASE_ID);

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

  // 現在日時
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentDateJP = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  // 時制判定
  let tenseInstruction = '';
  if (article.raceDate) {
    const raceDate = new Date(article.raceDate);
    const raceDateJP = `${raceDate.getFullYear()}年${raceDate.getMonth() + 1}月${raceDate.getDate()}日`;

    // 日付のみで比較（時刻を除外）
    const raceDateOnly = new Date(raceDate.getFullYear(), raceDate.getMonth(), raceDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (raceDateOnly > nowDateOnly) {
      // 未来のレース → 予想形式
      tenseInstruction = `
【重要】このレースは未来のレース（${raceDateJP}開催予定）です。
コメントは「予想形式」で生成してください:
- 「どの馬が来ると思う？」「〜に期待」「〜が勝つかも」
- 「出走予定馬は？」「オッズどうなる？」「買い目どうする？」
- 過去形（「勝った」「結果は〜」）は絶対に使わないこと`;
    } else if (raceDateOnly < nowDateOnly) {
      // 過去のレース → 結果形式
      tenseInstruction = `
【重要】このレースは過去のレース（${raceDateJP}開催済み）です。
コメントは「結果形式」で生成してください:
- 「〜が勝った」「結果はどうだった？」「〜強かったな」
- 「買ってた人おる？」「当たったわ」「外れたわ」
- 未来形（「〜が来ると思う」「〜に期待」）は絶対に使わないこと`;
    } else {
      // 当日のレース → 直前予想形式
      tenseInstruction = `
【重要】このレースは本日（${raceDateJP}）開催予定です。
コメントは「直前予想形式」で生成してください:
- 「今日の〜、どう見る？」「〜買うわ」「今から行く」
- レース前なので過去形（「勝った」）は使わないこと`;
    }
  }

  // レース種別情報
  let raceInfo = '';
  if (article.raceGrade && article.raceDescription) {
    raceInfo = `
【レース種別】
- 格付け: ${article.raceGrade}
- 説明: ${article.raceDescription}

【重要】このレースは「${article.raceDescription}」レースです。
- GIの場合: 「地方vs中央」「中央馬も出る」「JRAとNARの対決」などのコメントを含めること
- SIの場合: 「地方限定」「南関東だけ」「NAR専用」などのコメントを含めること`;
  }

  // 中央競馬 vs 地方競馬でプロンプトを分岐
  let boardType = '';
  let specialTerms = '';
  let topicFlowRule = '';

  if (currentKeibaType === KEIBA_TYPE.CHUOU) {
    boardType = '2ch/5chの競馬板（中央競馬）の常連住人';
    specialTerms = `
6. **中央競馬特有の用語・スラング**を積極的に使用：
   【重賞・G1】
   - 「有馬記念」「天皇賞」「宝塚記念」「ジャパンC」「安田記念」
   - 「ダービー」「オークス」「皐月賞」「桜花賞」「菊花賞」

   【競馬場】
   - 「中山の坂はきつい」「阪神は内枠有利」「東京は外枠」
   - 「中京のコーナーきつい」「京都の直線長い」「新潟の直線も長い」

   【中央競馬あるある】
   - 「土日は競馬場が混む」
   - 「G1は盛り上がるな」
   - 「JRA-VANは必須」
   - 「重賞は荒れる」
   - 「本命党vs穴党」

   【騎手・調教師ネタ】
   - 「ルメール強すぎ」「武豊はレジェンド」「川田が来たら買い」
   - 「藤沢厩舎は安定」「池江厩舎の馬は要注意」`;

    topicFlowRule = `
10. **【重要】中央競馬から南関（地方競馬）への自然な話題の流れを作る**:
    - **目的**: 中央競馬の話から自然に南関東4競馬（大井・川崎・船橋・浦和）や地方G1の話題に誘導
    - **必須**: 全体の3-5件に、南関・地方競馬への自然な導線コメントを含めること

    【自然な流れの例（OK）】:
    - 記事が芝レース → 「芝よりダートのほうが予想しやすいよな」 → 「そういえば南関のダートG1も熱いぞ」 → 「東京大賞典とか盛り上がるよね」
    - 記事が牝馬の話 → 「牝馬は距離適性次第」 → 「地方のダートなら牝馬も活躍できるよな」 → 「川崎記念とか地方G1チェックしてる？」
    - 記事がダート適性の話 → 「ダート馬なら南関でも走れるかも」 → 「南関の予想情報ってどこで見てる？」
    - 記事が騎手の話 → 「地方の騎手もレベル高いよな」 → 「南関の森泰斗とか御神本とか上手いぞ」

    【不自然な脱線（NG）】:
    - 記事が芝レース → **いきなり**「浦和の馬場が重いから牝馬にはきついんじゃね？」（文脈なく突然地方競馬場の話）
    - 記事が有馬記念 → **いきなり**「船橋の逃げ馬は強い」（流れなく突然）

    【南関・地方競馬への導線コメント（3-5件に必ず含める）】:
    - 「ダート馬なら南関でも走れそうだな」
    - 「南関のダートG1も見どころあるよ」
    - 「東京大賞典とか川崎記念とか地方G1も盛り上がるぞ」
    - 「地方競馬の予想情報ってどこで見てる？」
    - 「南関の重賞予想サイトでいいのある？」
    - 「TCK（大井）のナイターとか行ったことある？」
    - 「帝王賞とかジャパンダートダービーとか注目だよな」
    - 「南関は平日ナイターで仕事帰りに行けるのがいいよな」`;
  } else if (currentKeibaType === KEIBA_TYPE.CHIHOU) {
    boardType = '2ch/5chの地方競馬板の常連住人';
    specialTerms = `
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
   - 「南関は全場ダートだから予想しやすい」`;

    topicFlowRule = `
10. **話題の自然な脱線**:
    - レス番号が進むにつれて、話題が少しずつ脱線するのも自然
    - 例: 最初は記事の話 → 途中から予想の話 → 最後は競馬場のグルメの話
    - ただし、不自然な脱線（文脈なく突然別の競馬場の話）は避けること`;
  } else {
    // 予想サイトの場合
    boardType = '2ch/5chの競馬板（予想スレ）の常連住人';
    specialTerms = `
6. **予想特有の用語・スラング**を積極的に使用：
   - 「本命◎」「対抗○」「単穴△」「連下▲」「押さえ☆」
   - 「鉄板」「ガチガチ」「穴狙い」「万馬券」「トリガミ」
   - 「買い目」「フォーメーション」「ボックス」「流し」`;

    topicFlowRule = `
10. **話題の自然な脱線**:
    - レス番号が進むにつれて、話題が少しずつ脱線するのも自然
    - 例: 最初は予想の話 → 途中から的中報告 → 最後は予想サイトの評判の話
    - ただし、文脈のない突然の脱線は避けること`;
  }

  const prompt = `あなたは${boardType}です。
以下のニュース記事に対して、2ch風の匿名コメントを${commentCount}件生成してください。

【今日の日付】
${currentDateJP} (${currentDate})

【記事タイトル】
${article.sourceTitle || article.title}

【記事要約】
${article.summary}

【元記事URL】
${article.sourceURL || 'なし'}
${raceInfo}
${tenseInstruction}

【コメント生成ルール】
1. 短く、口語的に（15-80文字程度）
2. 「草」「ワロタ」「マジかよ」「これは酷い」などのネットスラング使用
3. 「>>1」などのアンカーを適度に使用（特にレス2-3で）
4. 賛否両論・さまざまな意見を含める（肯定、否定、中立、ネタ）
5. 炎上系記事は煽りコメントも含める
${specialTerms}

7. 重複しない多様なコメント
8. 1件目は記事の要約、2件目以降は反応コメント
9. 記事の内容に基づいた自然なコメント展開を心がける
${topicFlowRule}

11. 【重要】3-5件に1件程度、以下のような自然な導線コメントを含める：
    - 「予想サイトの口コミって意外と参考になるよな」
    - 「詐欺サイトに引っかからないように評判は調べとけよ」
    - 「予想サイト使ってる奴おる？精度どうよ？」
    - 「有料予想って実際当たるの？」
    - 「情報サイトでオススメある？」

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
    raceDate: record.fields.RaceDate || null, // 開催日
    raceGrade: record.fields.RaceGrade || null, // レース格付け
    raceDescription: record.fields.RaceDescription || null, // レース説明
  }));
}

/**
 * メイン処理
 */
async function main() {
  try {
    const keibaTypeLabel =
      currentKeibaType === KEIBA_TYPE.CHUOU ? '中央競馬' :
      currentKeibaType === KEIBA_TYPE.CHIHOU ? '地方競馬' : '競馬予想';
    console.log(`🚀 2ch風コメント生成スクリプト開始（${keibaTypeLabel}版）`);
    console.log(`📍 Base ID: ${AIRTABLE_BASE_ID}\n`);

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
