/**
 * コメント生成プロンプトの時制判定テスト
 */

function generatePromptPreview(article) {
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

  return {
    currentDateJP,
    currentDate,
    raceInfo,
    tenseInstruction,
  };
}

// テストケース
console.log('🧪 コメント生成プロンプトの時制判定テスト\n');
console.log(`📅 今日の日付: ${new Date().toISOString().split('T')[0]}\n`);

const testCases = [
  {
    name: '未来のレース（東京大賞典 12/29開催予定）',
    article: {
      title: '【速報】【大井競馬】東京大賞典、地方vs中央の頂点を決める一戦',
      sourceTitle: '【大井競馬】東京大賞典、地方vs中央の頂点を決める一戦',
      summary: '12月29日に東京大賞典が大井競馬場で開催。地方vs中央のダート最強馬を決める重要なGIレースとなる。',
      raceDate: '2025-12-29',
      raceGrade: 'GI',
      raceDescription: '地方vs中央の頂点を決める',
    },
  },
  {
    name: '過去のレース（川崎記念 2/14開催済み）',
    article: {
      title: '【速報】【川崎競馬】川崎記念で注目の逃げ馬が勝利',
      sourceTitle: '【川崎競馬】川崎記念で注目の逃げ馬が勝利',
      summary: '2月14日の川崎記念で逃げ馬が見事な勝利。地方vs中央のダート王決定戦で大波乱。',
      raceDate: '2025-02-14',
      raceGrade: 'GI',
      raceDescription: '地方vs中央の早春ダート王決定戦',
    },
  },
  {
    name: '当日のレース（羽田盃 12/25開催）',
    article: {
      title: '【速報】【南関東】羽田盃の出走予定馬が発表',
      sourceTitle: '【南関東】羽田盃の出走予定馬が発表',
      summary: '羽田盃は12/25に開催予定。南関東3歳の重賞レース。',
      raceDate: '2025-12-25',
      raceGrade: 'SI',
      raceDescription: '南関東3歳の重賞',
    },
  },
];

testCases.forEach((testCase, index) => {
  console.log(`\n--- テストケース ${index + 1}: ${testCase.name} ---`);
  const result = generatePromptPreview(testCase.article);

  console.log(`\n【今日の日付】`);
  console.log(`${result.currentDateJP} (${result.currentDate})`);

  console.log(result.raceInfo);
  console.log(result.tenseInstruction);
  console.log('\n' + '='.repeat(80));
});
