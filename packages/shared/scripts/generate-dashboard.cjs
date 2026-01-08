#!/usr/bin/env node

/**
 * エラー統計ダッシュボード生成スクリプト
 *
 * 過去7日間のGitHub Actions実行履歴を取得し、
 * サイトごとの成功率を表示するHTMLダッシュボードを生成します。
 *
 * 使い方:
 *   node packages/shared/scripts/generate-dashboard.cjs
 *
 * 環境変数:
 *   GITHUB_TOKEN: GitHub Personal Access Token（必須、gh CLIで自動取得）
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📊 エラー統計ダッシュボード生成中...');
console.log('');

// 過去7日間のワークフロー実行履歴を取得
const workflows = ['unified-daily.yml', 'unified-yosou.yml'];
const stats = {};

for (const workflow of workflows) {
  console.log(`📝 ${workflow} のデータ取得中...`);

  try {
    const output = execSync(`gh run list --workflow=${workflow} --limit=100 --json conclusion,createdAt,name,displayTitle`, {
      encoding: 'utf-8'
    });

    const runs = JSON.parse(output);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const run of runs) {
      const createdAt = new Date(run.createdAt);
      if (createdAt < sevenDaysAgo) continue;

      // サイト名を抽出（displayTitleから）
      let siteName = 'unknown';
      if (run.displayTitle.includes('keiba-matome')) {
        siteName = 'keiba-matome';
      } else if (run.displayTitle.includes('chihou')) {
        siteName = 'chihou-keiba-matome';
      } else if (run.displayTitle.includes('yosou')) {
        siteName = 'yosou-keiba-matome';
      }

      if (!stats[siteName]) {
        stats[siteName] = { success: 0, failure: 0, total: 0 };
      }

      stats[siteName].total++;
      if (run.conclusion === 'success') {
        stats[siteName].success++;
      } else {
        stats[siteName].failure++;
      }
    }
  } catch (error) {
    console.error(`  ❌ エラー: ${error.message}`);
  }
}

console.log('');
console.log('✅ データ取得完了');
console.log('');

// HTMLダッシュボード生成
const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>keiba-matome-monorepo エラー統計ダッシュボード</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      font-size: 32px;
      margin-bottom: 10px;
      color: #58a6ff;
    }
    .subtitle {
      color: #8b949e;
      margin-bottom: 40px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 24px;
    }
    .card h2 {
      font-size: 20px;
      margin-bottom: 16px;
      color: #c9d1d9;
    }
    .stats {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .stat {
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 12px;
      color: #8b949e;
      text-transform: uppercase;
    }
    .success { color: #3fb950; }
    .failure { color: #f85149; }
    .progress-bar {
      height: 8px;
      background: #21262d;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 16px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3fb950, #58a6ff);
      transition: width 0.3s ease;
    }
    .alert {
      background: #f85149;
      color: #fff;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .alert-warning {
      background: #d29922;
    }
    .alert-success {
      background: #3fb950;
    }
    .footer {
      text-align: center;
      color: #8b949e;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #30363d;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 keiba-matome-monorepo</h1>
    <div class="subtitle">エラー統計ダッシュボード（過去7日間）</div>

    ${generateOverallAlert(stats)}

    <div class="grid">
      ${Object.entries(stats).map(([site, data]) => generateCard(site, data)).join('')}
    </div>

    <div class="footer">
      最終更新: ${new Date().toLocaleString('ja-JP')} |
      <a href="https://github.com/apol0510/keiba-matome-monorepo/actions" style="color: #58a6ff;">GitHub Actions</a>
    </div>
  </div>
</body>
</html>`;

function generateOverallAlert(stats) {
  const total = Object.values(stats).reduce((sum, s) => sum + s.total, 0);
  const success = Object.values(stats).reduce((sum, s) => sum + s.success, 0);
  const successRate = total > 0 ? (success / total * 100).toFixed(1) : 0;

  if (successRate >= 95) {
    return `<div class="alert alert-success">
      ✅ 全サイトが正常に動作しています（成功率: ${successRate}%）
    </div>`;
  } else if (successRate >= 80) {
    return `<div class="alert alert-warning">
      ⚠️  一部のサイトでエラーが発生しています（成功率: ${successRate}%）
    </div>`;
  } else {
    return `<div class="alert">
      🚨 複数のサイトで深刻なエラーが発生しています（成功率: ${successRate}%）
    </div>`;
  }
}

function generateCard(site, data) {
  const successRate = data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0;
  const displayName = {
    'keiba-matome': '中央競馬ニュース',
    'chihou-keiba-matome': '地方競馬ニュース',
    'yosou-keiba-matome': '競馬予想まとめ',
    'unknown': '不明'
  }[site] || site;

  return `
    <div class="card">
      <h2>${displayName}</h2>
      <div class="stats">
        <div class="stat">
          <div class="stat-value success">${data.success}</div>
          <div class="stat-label">成功</div>
        </div>
        <div class="stat">
          <div class="stat-value failure">${data.failure}</div>
          <div class="stat-label">失敗</div>
        </div>
        <div class="stat">
          <div class="stat-value">${data.total}</div>
          <div class="stat-label">合計</div>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${successRate}%"></div>
      </div>
      <div style="text-align: center; margin-top: 8px; font-size: 14px; color: #8b949e;">
        成功率: <strong style="color: ${successRate >= 95 ? '#3fb950' : successRate >= 80 ? '#d29922' : '#f85149'}">${successRate}%</strong>
      </div>
    </div>
  `;
}

// HTMLファイルを保存
const outputPath = path.join(__dirname, '../../../dashboard.html');
fs.writeFileSync(outputPath, html, 'utf-8');

console.log('✅ ダッシュボード生成完了');
console.log('');
console.log(`📂 出力先: ${outputPath}`);
console.log('');
console.log('ブラウザで開く:');
console.log(`  open ${outputPath}`);
console.log('');

// 統計サマリーを表示
console.log('📊 サマリー:');
console.log('');
for (const [site, data] of Object.entries(stats)) {
  const successRate = data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0;
  const status = successRate >= 95 ? '✅' : successRate >= 80 ? '⚠️' : '🚨';
  console.log(`${status} ${site}: ${data.success}/${data.total} (${successRate}%)`);
}
console.log('');
