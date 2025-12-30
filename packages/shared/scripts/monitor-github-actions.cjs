/**
 * GitHub Actions監視スクリプト
 *
 * GitHub Actionsの実行状況を監視し、失敗時にDiscord通知
 *
 * 使い方:
 * DISCORD_WEBHOOK_URL="xxx" node packages/shared/scripts/monitor-github-actions.cjs
 *
 * GitHub Actions Cron:
 * - 毎時15分実行（GitHub Actionsの6AM, 12PM, 6PM実行の30分後）
 */

const https = require('https');
const { execSync } = require('child_process');

// Discord Webhook URL（GitHub Secretsから）
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (!DISCORD_WEBHOOK_URL) {
  console.error('❌ Error: DISCORD_WEBHOOK_URL environment variable is required');
  process.exit(1);
}

/**
 * Discord通知送信
 */
function sendDiscordNotification(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(DISCORD_WEBHOOK_URL);
    const data = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 204) {
          resolve();
        } else {
          reject(new Error(`Discord API returned ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

/**
 * GitHub Actionsの最新実行状況を取得
 */
function getRecentWorkflowRuns() {
  try {
    const result = execSync(
      'gh run list --limit 10 --json databaseId,name,status,conclusion,createdAt,workflowName',
      { encoding: 'utf-8' }
    );
    return JSON.parse(result);
  } catch (err) {
    console.error('❌ Error fetching workflow runs:', err.message);
    return [];
  }
}

/**
 * 監視対象のワークフロー
 */
const MONITORED_WORKFLOWS = [
  'keiba-matome - Daily News',
  'chihou-keiba-matome - Daily News',
  'yosou-keiba-matome - Nankan Daily',
  'yosou-keiba-matome - Chuou Weekly',
];

/**
 * 失敗したワークフローをチェック
 */
async function checkFailedWorkflows() {
  console.log('🔍 Checking GitHub Actions workflow status...\n');

  const runs = getRecentWorkflowRuns();
  const failures = [];

  // 過去1時間以内の失敗を検出
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  for (const run of runs) {
    const runDate = new Date(run.createdAt);

    // 監視対象ワークフローかつ、過去1時間以内
    if (
      MONITORED_WORKFLOWS.includes(run.workflowName) &&
      runDate > oneHourAgo &&
      run.status === 'completed' &&
      run.conclusion === 'failure'
    ) {
      failures.push(run);
    }
  }

  if (failures.length === 0) {
    console.log('✅ All workflows are healthy!\n');
    return;
  }

  console.log(`⚠️  Found ${failures.length} failed workflows:\n`);

  for (const failure of failures) {
    console.log(`   - ${failure.workflowName}`);
    console.log(`     Run ID: ${failure.databaseId}`);
    console.log(`     Created: ${failure.createdAt}`);
    console.log(`     Status: ${failure.status}`);
    console.log(`     Conclusion: ${failure.conclusion}\n`);

    // Discord通知送信
    await sendFailureNotification(failure);
  }
}

/**
 * 失敗通知をDiscordに送信
 */
async function sendFailureNotification(run) {
  const repoUrl = 'https://github.com/apol0510/keiba-matome-monorepo';
  const runUrl = `${repoUrl}/actions/runs/${run.databaseId}`;

  const payload = {
    embeds: [
      {
        title: '🚨 GitHub Actions Failure Detected',
        description: `Workflow **${run.workflowName}** has failed`,
        color: 0xff0000, // 赤色
        fields: [
          {
            name: 'Run ID',
            value: `${run.databaseId}`,
            inline: true,
          },
          {
            name: 'Status',
            value: run.conclusion,
            inline: true,
          },
          {
            name: 'Created At',
            value: new Date(run.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
            inline: false,
          },
          {
            name: 'Actions',
            value: `[View Run](${runUrl}) | [View Logs](${runUrl}#logs)`,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    await sendDiscordNotification(payload);
    console.log(`✅ Discord notification sent for ${run.workflowName}`);
  } catch (err) {
    console.error(`❌ Failed to send Discord notification: ${err.message}`);
  }
}

/**
 * 統計情報を送信（毎日1回）
 */
async function sendDailyStats() {
  const runs = getRecentWorkflowRuns();

  // 過去24時間の統計
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentRuns = runs.filter(run => new Date(run.createdAt) > oneDayAgo);

  const stats = {
    total: recentRuns.length,
    success: recentRuns.filter(r => r.conclusion === 'success').length,
    failure: recentRuns.filter(r => r.conclusion === 'failure').length,
    cancelled: recentRuns.filter(r => r.conclusion === 'cancelled').length,
  };

  const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0;

  const payload = {
    embeds: [
      {
        title: '📊 GitHub Actions Daily Stats',
        description: 'Workflow execution summary for the last 24 hours',
        color: stats.failure > 0 ? 0xffa500 : 0x00ff00, // オレンジ or 緑
        fields: [
          {
            name: 'Total Runs',
            value: String(stats.total || 0),
            inline: true,
          },
          {
            name: 'Success',
            value: String(stats.success || 0),
            inline: true,
          },
          {
            name: 'Failure',
            value: String(stats.failure || 0),
            inline: true,
          },
          {
            name: 'Success Rate',
            value: String(successRate) + '%',
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    await sendDiscordNotification(payload);
    console.log('✅ Daily stats sent to Discord');
  } catch (err) {
    console.error(`❌ Failed to send daily stats: ${err.message}`);
  }
}

/**
 * メイン実行
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'check';

  if (mode === 'stats') {
    await sendDailyStats();
  } else {
    await checkFailedWorkflows();
  }
}

// 実行
if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { checkFailedWorkflows, sendDailyStats };
