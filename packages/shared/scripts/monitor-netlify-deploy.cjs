/**
 * Netlifyデプロイ監視スクリプト
 *
 * Build Hookトリガー後、デプロイステータスをポーリングし、
 * 失敗時にDiscord通知を送信します。
 *
 * 使い方:
 * SITE_NAME="keiba-matome" \
 * NETLIFY_SITE_ID="xxx" \
 * NETLIFY_AUTH_TOKEN="xxx" \
 * DISCORD_WEBHOOK_URL="xxx" \
 * node packages/shared/scripts/monitor-netlify-deploy.cjs
 */

const https = require('https');

// 環境変数から取得
const SITE_NAME = process.env.SITE_NAME || 'unknown';
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// 設定
const MAX_WAIT_TIME = 10 * 60 * 1000; // 10分
const POLL_INTERVAL = 30 * 1000; // 30秒

/**
 * Netlify APIリクエスト
 */
function netlifyRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.netlify.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NETLIFY_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Discord通知送信
 */
function sendDiscordNotification(title, message, color) {
  return new Promise((resolve, reject) => {
    const webhookUrl = new URL(DISCORD_WEBHOOK_URL);
    const payload = JSON.stringify({
      embeds: [{
        title: title,
        description: message,
        color: color, // 赤: 16711680, 緑: 65280, オレンジ: 15623475
        timestamp: new Date().toISOString()
      }]
    });

    const options = {
      hostname: webhookUrl.hostname,
      path: webhookUrl.pathname + webhookUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 204) {
          resolve();
        } else {
          reject(new Error(`Discord notification failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * 最新デプロイのステータスを取得
 */
async function getLatestDeploy() {
  const deploys = await netlifyRequest(`/api/v1/sites/${NETLIFY_SITE_ID}/deploys?per_page=1`);
  return deploys[0];
}

/**
 * デプロイ監視メイン処理
 */
async function monitorDeploy() {
  console.log(`🔍 ${SITE_NAME} のNetlifyデプロイを監視開始...`);

  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    try {
      const deploy = await getLatestDeploy();
      const { id, state, deploy_url, error_message, created_at } = deploy;

      console.log(`[${new Date().toISOString()}] Deploy ID: ${id}, State: ${state}`);

      if (state === 'ready') {
        // デプロイ成功
        console.log(`✅ ${SITE_NAME} デプロイ成功: ${deploy_url}`);
        await sendDiscordNotification(
          `✅ Netlifyデプロイ成功 - ${SITE_NAME}`,
          `サイト: ${SITE_NAME}\nURL: ${deploy_url}\n作成時刻: ${created_at}`,
          65280 // 緑
        );
        return true;
      }

      if (state === 'error') {
        // デプロイ失敗
        console.error(`❌ ${SITE_NAME} デプロイ失敗: ${error_message || '不明なエラー'}`);
        await sendDiscordNotification(
          `🚨 Netlifyデプロイ失敗 - ${SITE_NAME}`,
          `サイト: ${SITE_NAME}\nエラー: ${error_message || '不明なエラー'}\nDeploy ID: ${id}\n作成時刻: ${created_at}`,
          16711680 // 赤
        );
        return false;
      }

      // まだビルド中の場合は待機
      if (state === 'building' || state === 'enqueued' || state === 'processing') {
        console.log(`⏳ ${state}... 30秒後に再確認します`);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        continue;
      }

      // 不明なステータス
      console.warn(`⚠️ 不明なステータス: ${state}`);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

    } catch (error) {
      console.error('❌ 監視中にエラー:', error.message);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }

  // タイムアウト
  console.error(`❌ ${SITE_NAME} デプロイ監視タイムアウト（10分経過）`);
  await sendDiscordNotification(
    `⏰ Netlifyデプロイ監視タイムアウト - ${SITE_NAME}`,
    `サイト: ${SITE_NAME}\n10分経過してもデプロイが完了しませんでした。`,
    15623475 // オレンジ
  );
  return false;
}

// 実行
if (!NETLIFY_SITE_ID || !NETLIFY_AUTH_TOKEN || !DISCORD_WEBHOOK_URL) {
  console.error('❌ 必要な環境変数が設定されていません');
  console.error('必要: NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN, DISCORD_WEBHOOK_URL');
  process.exit(1);
}

monitorDeploy()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  });
