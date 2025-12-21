/**
 * セキュリティテストスクリプト
 * コメント投稿APIのセキュリティ機能をテストします
 */

const API_URL = process.env.API_URL || 'https://keiba-matome.jp/api/submit-comment';
const TEST_NEWS_ID = process.env.TEST_NEWS_ID || 'recXXXXXXXXXXXXXX'; // テスト用のニュースID

console.log('🧪 セキュリティテスト開始\n');
console.log(`📍 テスト対象: ${API_URL}\n`);

let passedTests = 0;
let failedTests = 0;

/**
 * テストヘルパー関数
 */
async function testRequest(testName, payload, expectedStatus) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const status = response.status;
    const data = await response.json();

    if (status === expectedStatus) {
      console.log(`✅ ${testName}`);
      console.log(`   ステータス: ${status} (期待: ${expectedStatus})`);
      console.log(`   レスポンス: ${data.error || 'success'}`);
      passedTests++;
    } else {
      console.log(`❌ ${testName}`);
      console.log(`   ステータス: ${status} (期待: ${expectedStatus})`);
      console.log(`   レスポンス:`, data);
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ ${testName}`);
    console.log(`   エラー: ${error.message}`);
    failedTests++;
  }
  console.log('');
}

/**
 * テスト実行
 */
async function runTests() {
  console.log('--- 1. スパム判定テスト ---\n');

  // URL検出テスト
  await testRequest(
    'URL含むコメントの拒否',
    {
      newsId: TEST_NEWS_ID,
      content: 'こちらをご覧ください https://example.com',
      userName: 'テストユーザー',
    },
    400
  );

  await testRequest(
    'www.含むコメントの拒否',
    {
      newsId: TEST_NEWS_ID,
      content: 'www.example.com をチェック',
      userName: 'テストユーザー',
    },
    400
  );

  // 連続文字テスト
  await testRequest(
    '同じ文字の繰り返し（10文字以上）の拒否',
    {
      newsId: TEST_NEWS_ID,
      content: 'ああああああああああああああああああああ',
      userName: 'テストユーザー',
    },
    400
  );

  // スパムキーワードテスト
  await testRequest(
    'スパムキーワード「無料登録」の拒否',
    {
      newsId: TEST_NEWS_ID,
      content: '今すぐ無料登録してください',
      userName: 'テストユーザー',
    },
    400
  );

  await testRequest(
    'スパムキーワード「稼げる」の拒否',
    {
      newsId: TEST_NEWS_ID,
      content: '簡単に稼げる方法を教えます',
      userName: 'テストユーザー',
    },
    400
  );

  // 数字のみテスト
  await testRequest(
    '数字のみのコメントの拒否',
    {
      newsId: TEST_NEWS_ID,
      content: '090-1234-5678',
      userName: 'テストユーザー',
    },
    400
  );

  console.log('--- 2. バリデーションテスト ---\n');

  // 必須項目テスト
  await testRequest(
    '必須項目不足（newsId）',
    {
      content: '正常なコメント',
      userName: 'テストユーザー',
    },
    400
  );

  await testRequest(
    '必須項目不足（content）',
    {
      newsId: TEST_NEWS_ID,
      userName: 'テストユーザー',
    },
    400
  );

  // 文字数制限テスト
  await testRequest(
    '2文字未満のコメントの拒否',
    {
      newsId: TEST_NEWS_ID,
      content: 'あ',
      userName: 'テストユーザー',
    },
    400
  );

  await testRequest(
    '500文字超のコメントの拒否',
    {
      newsId: TEST_NEWS_ID,
      content: 'あ'.repeat(501),
      userName: 'テストユーザー',
    },
    400
  );

  console.log('--- 3. XSS対策テスト ---\n');

  // XSS攻撃テスト（実際には投稿されないのでステータス400を期待）
  await testRequest(
    'スクリプトタグを含むコメント',
    {
      newsId: TEST_NEWS_ID,
      content: '<script>alert("XSS")</script>これは危険です',
      userName: 'テストユーザー',
    },
    400 // 他のバリデーションでブロックされる可能性あり
  );

  console.log('--- 4. Rate Limitingテスト ---\n');
  console.log('⚠️  注意: Rate Limitテストは実際のAPI制限に影響するため、手動で実行してください\n');
  console.log('手動テスト方法:');
  console.log('1. 同じIPから1時間以内に6回コメント投稿を試みる');
  console.log('2. 6回目でHTTP 429エラーが返ることを確認\n');

  console.log('='.repeat(50));
  console.log('📊 テスト結果');
  console.log('='.repeat(50));
  console.log(`✅ 成功: ${passedTests}`);
  console.log(`❌ 失敗: ${failedTests}`);
  console.log(`📈 成功率: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));

  if (failedTests > 0) {
    console.log('\n⚠️  失敗したテストがあります。修正が必要です。');
    process.exit(1);
  } else {
    console.log('\n✅ すべてのテストが成功しました！');
    process.exit(0);
  }
}

// テスト実行
runTests().catch(error => {
  console.error('❌ テスト実行エラー:', error);
  process.exit(1);
});
