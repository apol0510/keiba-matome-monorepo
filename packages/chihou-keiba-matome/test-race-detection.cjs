/**
 * レース種別判定・開催日抽出のテストスクリプト
 */

/**
 * 開催日抽出（記事タイトル・要約から日付を抽出）
 */
function extractRaceDate(title, summary) {
  const text = `${title} ${summary}`;

  // パターン1: 12/29、12月29日
  const datePattern1 = text.match(/(\d{1,2})月(\d{1,2})日/);
  const datePattern2 = text.match(/(\d{1,2})\/(\d{1,2})/);

  if (datePattern1) {
    const month = parseInt(datePattern1[1], 10);
    const day = parseInt(datePattern1[2], 10);
    const year = new Date().getFullYear();
    // タイムゾーンの影響を受けないようにローカル日付文字列を生成
    const month2 = String(month).padStart(2, '0');
    const day2 = String(day).padStart(2, '0');
    return `${year}-${month2}-${day2}`;
  }

  if (datePattern2) {
    const month = parseInt(datePattern2[1], 10);
    const day = parseInt(datePattern2[2], 10);
    const year = new Date().getFullYear();
    const month2 = String(month).padStart(2, '0');
    const day2 = String(day).padStart(2, '0');
    return `${year}-${month2}-${day2}`;
  }

  return null; // 日付が見つからない
}

/**
 * レース種別マスターデータ
 */
const RACE_MASTER = {
  // GI（全国交流重賞）- 地方vs中央
  '東京大賞典': { grade: 'GI', description: '地方vs中央の頂点を決める' },
  '帝王賞': { grade: 'GI', description: '地方vs中央のダート最強決定戦' },
  'ジャパンダートダービー': { grade: 'GI', description: '地方vs中央の3歳ダート王者決定戦' },
  '川崎記念': { grade: 'GI', description: '地方vs中央の早春ダート王決定戦' },
  'かしわ記念': { grade: 'GI', description: '地方vs中央のダート王決定戦' },
  'JBCクラシック': { grade: 'GI', description: '地方vs中央のダートチャンピオン決定戦' },
  'JBCレディスクラシック': { grade: 'GI', description: '地方vs中央の牝馬ダート王決定戦' },
  'JBCスプリント': { grade: 'GI', description: '地方vs中央の短距離ダート王決定戦' },

  // SI（地方重賞）- 地方馬限定
  '東京記念': { grade: 'SI', description: '南関東の重賞' },
  '羽田盃': { grade: 'SI', description: '南関東3歳の重賞' },
  '黒潮盃': { grade: 'SI', description: '南関東3歳の重賞' },
  '兵庫ゴールドトロフィー': { grade: 'SI', description: '地方重賞' },
};

/**
 * レース種別判定
 */
function detectRaceGrade(title, summary) {
  const text = `${title} ${summary}`;

  for (const [raceName, info] of Object.entries(RACE_MASTER)) {
    if (text.includes(raceName)) {
      return info;
    }
  }

  return null; // レース種別が判定できない
}

// テストケース
const testCases = [
  {
    title: '【大井競馬】東京大賞典、地方vs中央の頂点を決める一戦',
    summary: '12月29日に東京大賞典が大井競馬場で開催。地方vs中央のダート最強馬を決める重要なGIレースとなる。',
  },
  {
    title: '【川崎競馬】川崎記念で注目の逃げ馬が勝利',
    summary: '2月14日の川崎記念で逃げ馬が見事な勝利。地方vs中央のダート王決定戦で大波乱。',
  },
  {
    title: '【南関東】羽田盃の出走予定馬が発表',
    summary: '羽田盃は12/25に開催予定。南関東3歳の重賞レース。',
  },
];

console.log('🧪 レース種別判定・開催日抽出テスト\n');

testCases.forEach((testCase, index) => {
  console.log(`--- テストケース ${index + 1} ---`);
  console.log(`タイトル: ${testCase.title}`);
  console.log(`要約: ${testCase.summary}`);

  const raceDate = extractRaceDate(testCase.title, testCase.summary);
  const raceGrade = detectRaceGrade(testCase.title, testCase.summary);

  console.log(`\n✅ 結果:`);
  console.log(`  開催日: ${raceDate || 'なし'}`);
  console.log(`  格付け: ${raceGrade?.grade || 'なし'}`);
  console.log(`  説明: ${raceGrade?.description || 'なし'}`);
  console.log('');
});
