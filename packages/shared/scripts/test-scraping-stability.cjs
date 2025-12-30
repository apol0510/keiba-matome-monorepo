/**
 * スクレイピング安定性テストツール
 *
 * 全プロジェクトのスクレイピングスクリプトを繰り返し実行し、
 * 成功率・エラーパターン・タイムアウトを測定
 *
 * 使い方:
 * node packages/shared/scripts/test-scraping-stability.cjs
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// テスト設定
const TEST_CONFIG = {
  iterations: 15, // 各スクリプトを15回実行（100回→15回に調整、サイト負荷考慮）
  timeout: 60000, // 60秒タイムアウト
  delayBetweenRuns: 3000, // 実行間隔3秒（サイト負荷軽減）
};

// テスト対象スクリプト
const SCRIPTS_TO_TEST = [
  // keiba-matome（中央競馬）
  {
    name: 'keiba-matome/netkeiba',
    path: 'packages/keiba-matome/scripts/scrape-netkeiba-news.cjs',
    env: {
      AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
      AIRTABLE_BASE_ID: 'appdHJSC4F9pTIoDj',
      ARTICLE_COUNT: '1', // テスト時は1件のみ
    }
  },
  {
    name: 'keiba-matome/yahoo',
    path: 'packages/keiba-matome/scripts/scrape-yahoo-news.cjs',
    env: {
      AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
      AIRTABLE_BASE_ID: 'appdHJSC4F9pTIoDj',
      ARTICLE_COUNT: '1',
    }
  },

  // chihou-keiba-matome（地方競馬）
  {
    name: 'chihou-keiba-matome/netkeiba-chihou',
    path: 'packages/chihou-keiba-matome/scripts/scrape-netkeiba-chihou.cjs',
    env: {
      AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
      AIRTABLE_BASE_ID: 'appt25zmKxQDiSCwh',
      ARTICLE_COUNT: '1',
    }
  },
  {
    name: 'chihou-keiba-matome/yahoo-chihou',
    path: 'packages/chihou-keiba-matome/scripts/scrape-yahoo-chihou.cjs',
    env: {
      AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
      AIRTABLE_BASE_ID: 'appt25zmKxQDiSCwh',
      ARTICLE_COUNT: '1',
    }
  },

  // yosou-keiba-matome（競馬予想）
  {
    name: 'yosou-keiba-matome/nankan-daily',
    path: 'packages/yosou-keiba-matome/scripts/scrape-nankan-daily.cjs',
    env: {
      AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
      AIRTABLE_BASE_ID: 'appKPasSpjpTtabnv',
    }
  },
];

// 結果保存用
const results = {
  startTime: new Date(),
  scripts: {},
  summary: {
    totalTests: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    totalTimeouts: 0,
  }
};

/**
 * スクリプトを1回実行
 */
function runScript(scriptConfig) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn('node', [scriptConfig.path], {
      env: { ...process.env, ...scriptConfig.env },
      cwd: path.join(__dirname, '../../..'),
    });

    // タイムアウト設定
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, TEST_CONFIG.timeout);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      resolve({
        success: code === 0 && !timedOut,
        code,
        duration,
        timedOut,
        stdout,
        stderr,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      resolve({
        success: false,
        code: -1,
        duration,
        timedOut: false,
        stdout,
        stderr: err.message,
      });
    });
  });
}

/**
 * 遅延関数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * スクリプトを複数回実行してテスト
 */
async function testScript(scriptConfig) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 Testing: ${scriptConfig.name}`);
  console.log(`   Path: ${scriptConfig.path}`);
  console.log(`   Iterations: ${TEST_CONFIG.iterations}`);
  console.log(`${'='.repeat(60)}\n`);

  const scriptResults = {
    name: scriptConfig.name,
    path: scriptConfig.path,
    iterations: TEST_CONFIG.iterations,
    runs: [],
    stats: {
      successes: 0,
      failures: 0,
      timeouts: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      errors: {},
    }
  };

  for (let i = 0; i < TEST_CONFIG.iterations; i++) {
    console.log(`⏳ Run ${i + 1}/${TEST_CONFIG.iterations}...`);

    const result = await runScript(scriptConfig);
    scriptResults.runs.push(result);

    // 統計更新
    if (result.success) {
      scriptResults.stats.successes++;
      console.log(`   ✅ Success (${result.duration}ms)`);
    } else if (result.timedOut) {
      scriptResults.stats.timeouts++;
      console.log(`   ⏰ Timeout (${TEST_CONFIG.timeout}ms exceeded)`);
    } else {
      scriptResults.stats.failures++;
      console.log(`   ❌ Failed (exit code: ${result.code})`);

      // エラーパターンを記録
      const errorKey = result.stderr.split('\n')[0] || 'Unknown error';
      scriptResults.stats.errors[errorKey] = (scriptResults.stats.errors[errorKey] || 0) + 1;
    }

    // 実行時間統計
    scriptResults.stats.avgDuration += result.duration;
    scriptResults.stats.minDuration = Math.min(scriptResults.stats.minDuration, result.duration);
    scriptResults.stats.maxDuration = Math.max(scriptResults.stats.maxDuration, result.duration);

    // 次の実行まで待機（サイト負荷軽減）
    if (i < TEST_CONFIG.iterations - 1) {
      await delay(TEST_CONFIG.delayBetweenRuns);
    }
  }

  // 平均実行時間を計算
  scriptResults.stats.avgDuration = Math.round(scriptResults.stats.avgDuration / TEST_CONFIG.iterations);

  // 成功率計算
  const successRate = (scriptResults.stats.successes / TEST_CONFIG.iterations * 100).toFixed(1);
  console.log(`\n📊 Results for ${scriptConfig.name}:`);
  console.log(`   Success: ${scriptResults.stats.successes}/${TEST_CONFIG.iterations} (${successRate}%)`);
  console.log(`   Failures: ${scriptResults.stats.failures}`);
  console.log(`   Timeouts: ${scriptResults.stats.timeouts}`);
  console.log(`   Avg Duration: ${scriptResults.stats.avgDuration}ms`);
  console.log(`   Min/Max: ${scriptResults.stats.minDuration}ms / ${scriptResults.stats.maxDuration}ms`);

  if (Object.keys(scriptResults.stats.errors).length > 0) {
    console.log(`   Error Patterns:`);
    for (const [error, count] of Object.entries(scriptResults.stats.errors)) {
      console.log(`     - ${error.substring(0, 80)}: ${count} occurrences`);
    }
  }

  return scriptResults;
}

/**
 * レポート生成
 */
function generateReport() {
  const reportPath = path.join(__dirname, `../../test-reports/scraping-stability-${Date.now()}.json`);
  const reportDir = path.dirname(reportPath);

  // レポートディレクトリ作成
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // レポート保存
  results.endTime = new Date();
  results.duration = results.endTime - results.startTime;
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 Report saved: ${reportPath}`);
  console.log(`${'='.repeat(60)}\n`);

  // サマリー表示
  const overallSuccessRate = (results.summary.totalSuccesses / results.summary.totalTests * 100).toFixed(1);
  console.log(`\n📊 Overall Summary:`);
  console.log(`   Total Tests: ${results.summary.totalTests}`);
  console.log(`   Total Successes: ${results.summary.totalSuccesses} (${overallSuccessRate}%)`);
  console.log(`   Total Failures: ${results.summary.totalFailures}`);
  console.log(`   Total Timeouts: ${results.summary.totalTimeouts}`);
  console.log(`   Duration: ${Math.round(results.duration / 1000)}s\n`);

  // 改善提案
  console.log(`\n💡 Recommendations:\n`);

  for (const [scriptName, scriptResult] of Object.entries(results.scripts)) {
    const successRate = (scriptResult.stats.successes / scriptResult.iterations * 100).toFixed(1);

    if (successRate < 95) {
      console.log(`⚠️  ${scriptName}:`);
      console.log(`   - Success rate: ${successRate}% (target: 95%+)`);
      console.log(`   - Consider adding retry logic`);
      console.log(`   - Review timeout settings (current: ${TEST_CONFIG.timeout}ms)`);

      if (scriptResult.stats.maxDuration > TEST_CONFIG.timeout * 0.8) {
        console.log(`   - Max duration (${scriptResult.stats.maxDuration}ms) is close to timeout`);
        console.log(`   - Consider increasing timeout or optimizing script`);
      }

      if (Object.keys(scriptResult.stats.errors).length > 0) {
        console.log(`   - Common errors:`);
        const sortedErrors = Object.entries(scriptResult.stats.errors)
          .sort((a, b) => b[1] - a[1]);
        for (const [error, count] of sortedErrors.slice(0, 3)) {
          console.log(`     - ${error.substring(0, 60)}: ${count}x`);
        }
      }
      console.log('');
    }
  }

  console.log(`✅ Scraping stability test completed!\n`);
}

/**
 * メイン実行
 */
async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Scraping Stability Test`);
  console.log(`   Date: ${results.startTime.toISOString()}`);
  console.log(`   Scripts: ${SCRIPTS_TO_TEST.length}`);
  console.log(`   Iterations per script: ${TEST_CONFIG.iterations}`);
  console.log(`   Total tests: ${SCRIPTS_TO_TEST.length * TEST_CONFIG.iterations}`);
  console.log(`${'='.repeat(60)}\n`);

  // 環境変数チェック
  if (!process.env.AIRTABLE_API_KEY) {
    console.error('❌ Error: AIRTABLE_API_KEY environment variable is required');
    process.exit(1);
  }

  // 各スクリプトをテスト
  for (const scriptConfig of SCRIPTS_TO_TEST) {
    const scriptResult = await testScript(scriptConfig);
    results.scripts[scriptConfig.name] = scriptResult;

    // サマリー更新
    results.summary.totalTests += scriptResult.iterations;
    results.summary.totalSuccesses += scriptResult.stats.successes;
    results.summary.totalFailures += scriptResult.stats.failures;
    results.summary.totalTimeouts += scriptResult.stats.timeouts;
  }

  // レポート生成
  generateReport();
}

// 実行
if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runScript, testScript };
