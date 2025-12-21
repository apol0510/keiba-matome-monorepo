/**
 * X アカウント確認スクリプト
 */

require('dotenv').config();

const { TwitterApi } = require('twitter-api-v2');

const twitterClient = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET,
});

async function checkAccount() {
  try {
    console.log('🔍 認証情報で使用されているXアカウントを確認中...\n');

    // 自分のアカウント情報を取得
    const me = await twitterClient.v2.me();

    console.log('✅ 認証成功！\n');
    console.log('📱 投稿に使用されるアカウント情報:');
    console.log(`   ユーザー名: @${me.data.username}`);
    console.log(`   表示名: ${me.data.name}`);
    console.log(`   ユーザーID: ${me.data.id}`);
    console.log(`\n🔗 プロフィールURL: https://twitter.com/${me.data.username}`);
    console.log(`🔗 先ほどの投稿: https://twitter.com/${me.data.username}/status/2001163152462082192`);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

checkAccount();
