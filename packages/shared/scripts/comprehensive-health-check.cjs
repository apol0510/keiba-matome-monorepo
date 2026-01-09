#!/usr/bin/env node

/**
 * 包括的サイト健全性チェック - 10サイト長期運用対応版
 *
 * 実際のバグを検出：
 * 1. 記事が実際にサイトに表示されるか（404エラー検出）
 * 2. コメント投稿機能が動作するか
 * 3. Discord通知が届くか
 * 4. Slugの妥当性（日本語を含むか、スラッシュを含まないか）
 * 5. GitHub Actions実行履歴の確認
 */

const Airtable = require('airtable');
const https = require('https');
const { execSync } = require('child_process');

// 環境変数チェック
if (!process.env.AIRTABLE_API_KEY) {
  console.error('❌ AIRTABLE_API_KEY が設定されていません');
  process.exit(1);
}

// プロジェクト設定
const PROJECTS = {
  'keiba-matome': {
    baseId: 'appdHJSC4F9pTIoDj',
    siteUrl: 'https://keiba-matome.jp',
    apiKey: process.env.AIRTABLE_API_KEY  // 後でプロジェクト固有のキーに変更可能
  },
  'chihou-keiba-matome': {
    baseId: 'appt25zmKxQDiSCwh',
    siteUrl: 'https://chihou.keiba-matome.jp',
    apiKey: process.env.AIRTABLE_API_KEY
  },
  'yosou-keiba-matome': {
    baseId: 'appKPasSpjpTtabnv',
    siteUrl: 'https://yosou.keiba-matome.jp',
    apiKey: process.env.AIRTABLE_API_KEY_YOSOU || process.env.AIRTABLE_API_KEY
  }
};

/**
 * HTTP/HTTPSリクエストを実行する
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    const req = protocol.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data, headers: res.headers });
      });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Slugが妥当かチェック
 */
function isValidSlug(slug) {
  if (!slug) return { valid: false, reason: 'Slugが空' };
  if (slug.includes('/')) return { valid: false, reason: 'Slugにスラッシュが含まれる' };

  // 日本語（ひらがな・カタカナ・漢字）を含むかチェック
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(slug);
  if (!hasJapanese) return { valid: false, reason: '日本語を含まない（不正Slug）' };

  return { valid: true };
}

/**
 * GitHub Actions実行履歴をチェック
 */
function checkGitHubActions(projectName) {
  try {
    const output = execSync(`gh run list --workflow=${projectName} --limit=5 --json conclusion,createdAt,displayTitle`, {
      encoding: 'utf-8'
    });
    const runs = JSON.parse(output);

    const failures = runs.filter(r => r.conclusion === 'failure');
    return {
      recentRuns: runs.length,
      failures: failures.length,
      latestStatus: runs[0]?.conclusion || 'unknown'
    };
  } catch (error) {
    return {
      recentRuns: 0,
      failures: 0,
      latestStatus: 'error',
      error: error.message
    };
  }
}

/**
 * 包括的サイトチェック
 */
async function checkSite(projectName, config) {
  console.log('');
  console.log('='.repeat(80));
  console.log(`🔍 ${projectName} をチェック中...`);
  console.log('='.repeat(80));

  const errors = [];
  const warnings = [];

  const base = new Airtable({ apiKey: config.apiKey }).base(config.baseId);

  try {
    // 1. 過去24時間の記事をチェック
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    console.log('');
    console.log('1️⃣ 過去24時間の記事をチェック...');

    const recentNews = [];
    await base('News').select({
      filterByFormula: `AND(
        Status = 'published',
        IS_AFTER({PublishedAt}, '${oneDayAgo.toISOString()}')
      )`,
      sort: [{ field: 'PublishedAt', direction: 'desc' }],
      maxRecords: 10
    }).eachPage((records, fetchNextPage) => {
      records.forEach(record => recentNews.push(record));
      fetchNextPage();
    });

    if (recentNews.length === 0) {
      warnings.push('⚠️  過去24時間に新しい記事がありません');
    } else {
      console.log(`   ✅ ${recentNews.length}件の記事を発見`);

      // 2. 各記事の詳細チェック
      for (const news of recentNews) {
        const title = news.get('Title');
        const slug = news.get('Slug');
        const status = news.get('Status');
        const commentCount = news.get('CommentCount') || 0;

        console.log('');
        console.log(`   📄 記事: ${title}`);
        console.log(`      Slug: ${slug}`);
        console.log(`      Status: ${status}`);
        console.log(`      CommentCount: ${commentCount}`);

        // Slug妥当性チェック
        const slugCheck = isValidSlug(slug);
        if (!slugCheck.valid) {
          errors.push(`❌ 不正Slug: ${title} (理由: ${slugCheck.reason})`);
          console.log(`      ❌ Slug不正: ${slugCheck.reason}`);
          continue;
        }

        // 3. 実際にサイトにアクセスして404エラーチェック
        const articleUrl = `${config.siteUrl}/news/${encodeURIComponent(slug)}`;
        console.log(`      URL: ${articleUrl}`);

        try {
          const response = await fetchUrl(articleUrl);
          if (response.statusCode === 404) {
            errors.push(`❌ 404エラー: ${title} (${articleUrl})`);
            console.log(`      🚨 404エラー - 記事が表示されない`);
          } else if (response.statusCode === 200) {
            console.log(`      ✅ サイト表示OK (200)`);
          } else {
            warnings.push(`⚠️  異常なステータスコード: ${response.statusCode} - ${title}`);
            console.log(`      ⚠️  ステータスコード: ${response.statusCode}`);
          }
        } catch (error) {
          warnings.push(`⚠️  サイトアクセスエラー: ${title} - ${error.message}`);
          console.log(`      ⚠️  アクセスエラー: ${error.message}`);
        }

        // コメント数チェック
        if (commentCount === 0) {
          warnings.push(`⚠️  コメント0件: ${title}`);
        } else if (commentCount < 15) {
          warnings.push(`⚠️  コメント少数(${commentCount}件): ${title}`);
        }
      }
    }

    // 4. コメント投稿機能のテスト（軽量版 - 実際には投稿しない）
    console.log('');
    console.log('2️⃣ コメント投稿エンドポイントをチェック...');

    try {
      const commentApiUrl = `${config.siteUrl}/api/submit-comment`;
      const response = await fetchUrl(commentApiUrl);
      // POST以外の場合、405 Method Not Allowedが返ることを期待
      if (response.statusCode === 405) {
        console.log(`   ✅ コメント投稿API稼働中（405 Method Not Allowed - 正常）`);
      } else {
        warnings.push(`⚠️  コメント投稿APIの応答が異常: ${response.statusCode}`);
        console.log(`   ⚠️  異常なレスポンス: ${response.statusCode}`);
      }
    } catch (error) {
      errors.push(`❌ コメント投稿APIエラー: ${error.message}`);
      console.log(`   ❌ APIエラー: ${error.message}`);
    }

    // 5. GitHub Actions実行履歴チェック
    console.log('');
    console.log('3️⃣ GitHub Actions実行履歴をチェック...');

    const ghActions = checkGitHubActions(projectName);
    if (ghActions.latestStatus === 'failure') {
      errors.push(`❌ 最新のGitHub Actionsが失敗しています`);
      console.log(`   🚨 最新実行: 失敗`);
    } else if (ghActions.latestStatus === 'success') {
      console.log(`   ✅ 最新実行: 成功`);
    } else {
      warnings.push(`⚠️  GitHub Actions状態不明: ${ghActions.latestStatus}`);
      console.log(`   ⚠️  状態: ${ghActions.latestStatus}`);
    }

    if (ghActions.failures > 0) {
      warnings.push(`⚠️  過去5回中${ghActions.failures}回失敗`);
      console.log(`   ⚠️  過去5回中${ghActions.failures}回失敗`);
    }

  } catch (error) {
    errors.push(`🚨 エラー発生: ${error.message}`);
    console.error('');
    console.error('❌ エラー詳細:');
    console.error(error);
  }

  // 結果サマリー
  console.log('');
  console.log('='.repeat(80));
  console.log('📊 サマリー');
  console.log('='.repeat(80));

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ すべて正常です');
  } else {
    if (errors.length > 0) {
      console.log(`🚨 ${errors.length}件の重大エラー:`);
      errors.forEach(err => console.log(`   ${err}`));
    }
    if (warnings.length > 0) {
      console.log(`⚠️  ${warnings.length}件の警告:`);
      warnings.forEach(warn => console.log(`   ${warn}`));
    }
  }
  console.log('='.repeat(80));

  return { errors, warnings };
}

/**
 * Discord通知を送信
 */
function sendDiscordNotification(message, isError = false) {
  if (!process.env.DISCORD_WEBHOOK_URL) {
    console.log('⚠️  DISCORD_WEBHOOK_URL が設定されていないため、Discord通知をスキップ');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const webhookUrl = new URL(process.env.DISCORD_WEBHOOK_URL);
    const payload = JSON.stringify({
      embeds: [{
        title: isError ? '🚨 サイト健全性チェック: エラー検出' : '✅ サイト健全性チェック: 正常',
        description: message,
        color: isError ? 15158332 : 3066993,  // 赤 or 緑
        timestamp: new Date().toISOString()
      }]
    });

    const options = {
      hostname: webhookUrl.hostname,
      path: webhookUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 204 || res.statusCode === 200) {
        console.log('✅ Discord通知送信成功');
        resolve();
      } else {
        console.error(`⚠️  Discord通知失敗: ${res.statusCode}`);
        resolve();  // 通知失敗してもスクリプトは続行
      }
    });

    req.on('error', (error) => {
      console.error(`⚠️  Discord通知エラー: ${error.message}`);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

/**
 * メイン処理
 */
async function main() {
  console.log('');
  console.log('📊 包括的サイト健全性チェック開始');
  console.log('');

  const allErrors = {};
  const allWarnings = {};

  for (const [projectName, config] of Object.entries(PROJECTS)) {
    const { errors, warnings } = await checkSite(projectName, config);
    if (errors.length > 0) {
      allErrors[projectName] = errors;
    }
    if (warnings.length > 0) {
      allWarnings[projectName] = warnings;
    }
  }

  // 最終サマリー
  console.log('');
  console.log('');
  console.log('━'.repeat(80));
  console.log('📋 最終サマリー');
  console.log('━'.repeat(80));
  console.log('');

  const hasErrors = Object.keys(allErrors).length > 0;
  const hasWarnings = Object.keys(allWarnings).length > 0;

  if (!hasErrors && !hasWarnings) {
    console.log('✅ 全サイト正常です！');
    // Discord通知は重大エラー時のみ（ノイズ削減）
  } else {
    let message = '';

    if (hasErrors) {
      console.log('🚨 以下のサイトで重大エラーを発見:');
      console.log('');
      for (const [projectName, errors] of Object.entries(allErrors)) {
        console.log(`【${projectName}】`);
        errors.forEach(err => console.log(`  ${err}`));
        console.log('');

        message += `**${projectName}**\n${errors.join('\n')}\n\n`;
      }
    }

    if (hasWarnings) {
      console.log('⚠️  以下のサイトで警告:');
      console.log('');
      for (const [projectName, warnings] of Object.entries(allWarnings)) {
        console.log(`【${projectName}】`);
        warnings.forEach(warn => console.log(`  ${warn}`));
        console.log('');

        message += `**${projectName}** (警告)\n${warnings.join('\n')}\n\n`;
      }
    }

    // 重大エラーがある場合のみDiscord通知
    if (hasErrors) {
      await sendDiscordNotification(message, true);
    }
  }

  console.log('');
}

main().catch(error => {
  console.error('');
  console.error('💥 致命的なエラー:');
  console.error(error);
  process.exit(1);
});
