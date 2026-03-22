#!/usr/bin/env node

/**
 * 共通ワークフロー実行スクリプト
 *
 * 使い方:
 *   node run-workflow.cjs --site=keiba-matome --workflow=daily
 *   node run-workflow.cjs --site=chihou-keiba-matome --workflow=daily
 *   node run-workflow.cjs --site=yosou-keiba-matome --workflow=nankan-daily
 *
 * 環境変数:
 *   AIRTABLE_API_KEY: Airtable API Key（必須）
 *   ANTHROPIC_API_KEY: Claude API Key（必須）
 *   X_CREDENTIALS_JSON: X API認証情報（JSON形式）
 *   DISCORD_WEBHOOK_URL: Discord Webhook URL（オプション）
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// コマンドライン引数をパース
const args = process.argv.slice(2);
const siteArg = args.find(arg => arg.startsWith('--site='));
const workflowArg = args.find(arg => arg.startsWith('--workflow='));

if (!siteArg || !workflowArg) {
  console.error('❌ Usage: node run-workflow.cjs --site=<site> --workflow=<workflow>');
  console.error('');
  console.error('Examples:');
  console.error('  node run-workflow.cjs --site=keiba-matome --workflow=daily');
  console.error('  node run-workflow.cjs --site=yosou-keiba-matome --workflow=nankan-daily');
  process.exit(1);
}

const siteName = siteArg.split('=')[1];
const workflowName = workflowArg.split('=')[1];

// 設定ファイルを読み込む
const configPath = path.join(__dirname, '../../../sites-config.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ sites-config.json not found');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const siteConfig = config.sites[siteName];

if (!siteConfig) {
  console.error(`❌ Site "${siteName}" not found in sites-config.json`);
  process.exit(1);
}

const workflowConfig = siteConfig.workflows[workflowName];

if (!workflowConfig) {
  console.error(`❌ Workflow "${workflowName}" not found for site "${siteName}"`);
  process.exit(1);
}

// 環境変数をチェック
const requiredEnvVars = [
  config.shared.airtableApiKey,
  config.shared.anthropicApiKey
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.error(`  - ${envVar}`));
  process.exit(1);
}

// X API認証情報をパース
let xCredentials = null;
if (process.env.X_CREDENTIALS_JSON) {
  try {
    const allCredentials = JSON.parse(process.env.X_CREDENTIALS_JSON);
    xCredentials = allCredentials[siteConfig.xCredentialKey];

    if (!xCredentials) {
      console.error(`⚠️  X credentials not found for key: ${siteConfig.xCredentialKey}`);
      console.error('   X投稿はスキップされます');
    }
  } catch (error) {
    console.error('⚠️  Failed to parse X_CREDENTIALS_JSON');
    console.error('   X投稿はスキップされます');
  }
}

// ワークフロー実行
console.log('='.repeat(60));
console.log(`🚀 ${siteConfig.displayName} - ${workflowName}`);
console.log('='.repeat(60));
console.log('');

const workingDir = path.join(__dirname, `../../../packages/${siteName}`);

async function runScript(scriptConfig, index, total, retryCount = 0) {
  const MAX_RETRIES = 3;

  // Exponential Backoff: 5秒 → 15秒 → 45秒
  const getRetryDelay = (attemptNumber) => {
    const baseDelay = 5000; // 5秒
    return baseDelay * Math.pow(3, attemptNumber - 1);
  };

  return new Promise((resolve, reject) => {
    const retryLabel = retryCount > 0 ? ` (リトライ ${retryCount}/${MAX_RETRIES})` : '';
    console.log(`[${index}/${total}] ${scriptConfig.name}${retryLabel}...`);

    const scriptPath = path.join(workingDir, scriptConfig.script);

    if (!fs.existsSync(scriptPath)) {
      console.error(`  ⚠️  Script not found: ${scriptPath}`);
      console.error(`  スキップします`);
      resolve();
      return;
    }

    const env = {
      ...process.env,
      AIRTABLE_API_KEY: process.env[config.shared.airtableApiKey],
      AIRTABLE_BASE_ID: siteConfig.airtableBaseId,
      ANTHROPIC_API_KEY: process.env[config.shared.anthropicApiKey],
      SITE_URL: siteConfig.siteUrl,
      ...(scriptConfig.env || {})
    };

    // X API認証情報を追加
    if (xCredentials && scriptConfig.name === 'post-to-x') {
      env.X_API_KEY = xCredentials.apiKey;
      env.X_API_SECRET = xCredentials.apiSecret;
      env.X_ACCESS_TOKEN = xCredentials.accessToken;
      env.X_ACCESS_SECRET = xCredentials.accessSecret;
    }

    const scriptArgs = scriptConfig.args || [];
    const child = spawn('node', [scriptPath, ...scriptArgs], {
      cwd: workingDir,
      env,
      stdio: 'inherit'
    });

    child.on('close', async (code) => {
      if (code === 0) {
        console.log(`  ✅ 完了`);
        console.log('');
        resolve();
      } else {
        console.error(`  ❌ エラー (exit code: ${code})`);

        // リトライ可能なエラーかチェック
        const isRetryable = code !== 1 || retryCount < MAX_RETRIES;

        if (isRetryable && retryCount < MAX_RETRIES) {
          const retryDelay = getRetryDelay(retryCount + 1);
          console.log(`  ⏳ ${retryDelay/1000}秒後にリトライします（Exponential Backoff）...`);
          console.log('');

          await new Promise(r => setTimeout(r, retryDelay));

          try {
            await runScript(scriptConfig, index, total, retryCount + 1);
            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          console.log('');
          reject(new Error(`Script failed with exit code ${code} after ${retryCount} retries`));
        }
      }
    });
  });
}

async function runWorkflow() {
  const scripts = workflowConfig.scripts;

  for (let i = 0; i < scripts.length; i++) {
    try {
      await runScript(scripts[i], i + 1, scripts.length);
    } catch (error) {
      console.error(`ワークフローがステップ ${i + 1} で失敗しました`);
      process.exit(1);
    }
  }

  // Netlify Build Hookをトリガー
  if (process.env[siteConfig.netlifyBuildHook]) {
    console.log('[最終] Netlifyデプロイをトリガー...');
    const https = require('https');
    const hookUrl = process.env[siteConfig.netlifyBuildHook];

    const req = https.request(hookUrl, { method: 'POST' }, (res) => {
      console.log(`  ✅ デプロイリクエスト送信完了 (status: ${res.statusCode})`);
      console.log('');
      console.log('='.repeat(60));
      console.log('✅ ワークフロー完了');
      console.log('='.repeat(60));
    });

    req.on('error', (error) => {
      console.error(`  ⚠️  デプロイリクエスト送信失敗: ${error.message}`);
      console.log('');
    });

    req.end();
  } else {
    console.log('='.repeat(60));
    console.log('✅ ワークフロー完了');
    console.log('='.repeat(60));
  }
}

runWorkflow().catch(error => {
  console.error('❌ ワークフロー実行中にエラーが発生しました:', error);
  process.exit(1);
});
