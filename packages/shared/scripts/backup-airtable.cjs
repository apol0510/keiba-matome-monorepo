/**
 * Airtableバックアップスクリプト
 *
 * 全AirtableベースのデータをJSON形式でエクスポート
 *
 * 使い方:
 * AIRTABLE_API_KEY="xxx" node packages/shared/scripts/backup-airtable.cjs
 *
 * オプション:
 * --base=keiba-matome          特定のベースのみバックアップ
 * --restore=backup.json        バックアップから復元
 */

const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

// Airtable Bases設定
const BASES = {
  'keiba-matome': {
    baseId: 'appdHJSC4F9pTIoDj',
    tables: ['News', 'Comments'],
  },
  'chihou-keiba-matome': {
    baseId: 'appt25zmKxQDiSCwh',
    tables: ['News', 'Comments'],
  },
  'yosou-keiba-matome': {
    baseId: 'appKPasSpjpTtabnv',
    tables: ['Articles', 'Comments'],
  },
};

/**
 * テーブルのすべてのレコードを取得
 */
async function fetchAllRecords(base, tableName) {
  const records = [];

  console.log(`   📥 Fetching ${tableName}...`);

  await base(tableName)
    .select({
      view: 'Grid view',
    })
    .eachPage((pageRecords, fetchNextPage) => {
      records.push(...pageRecords.map(r => ({
        id: r.id,
        fields: r.fields,
        createdTime: r._rawJson.createdTime,
      })));
      fetchNextPage();
    });

  console.log(`      ✅ Fetched ${records.length} records from ${tableName}`);
  return records;
}

/**
 * ベースをバックアップ
 */
async function backupBase(baseName, baseConfig, apiKey) {
  console.log(`\n🔵 Backing up ${baseName}...`);
  console.log(`   Base ID: ${baseConfig.baseId}`);

  const base = new Airtable({ apiKey }).base(baseConfig.baseId);
  const backup = {
    baseName,
    baseId: baseConfig.baseId,
    timestamp: new Date().toISOString(),
    tables: {},
  };

  for (const tableName of baseConfig.tables) {
    const records = await fetchAllRecords(base, tableName);
    backup.tables[tableName] = records;
  }

  const totalRecords = Object.values(backup.tables).reduce((sum, records) => sum + records.length, 0);
  console.log(`   ✅ Backup completed: ${totalRecords} total records\n`);

  return backup;
}

/**
 * すべてのベースをバックアップ
 */
async function backupAllBases(apiKey, targetBase = null) {
  const backups = {};
  const basesToBackup = targetBase
    ? { [targetBase]: BASES[targetBase] }
    : BASES;

  for (const [baseName, baseConfig] of Object.entries(basesToBackup)) {
    if (!baseConfig) {
      console.error(`❌ Error: Base '${baseName}' not found in configuration`);
      continue;
    }

    try {
      const backup = await backupBase(baseName, baseConfig, apiKey);
      backups[baseName] = backup;
    } catch (err) {
      console.error(`❌ Error backing up ${baseName}: ${err.message}`);
    }
  }

  return backups;
}

/**
 * バックアップをファイルに保存
 */
function saveBackupToFile(backups) {
  const backupDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `airtable-backup-${timestamp}.json`;
  const filepath = path.join(backupDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(backups, null, 2));

  console.log(`\n💾 Backup saved:`);
  console.log(`   File: ${filepath}`);
  console.log(`   Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB\n`);

  return filepath;
}

/**
 * バックアップから復元
 */
async function restoreFromBackup(backupFilePath, apiKey) {
  console.log(`\n🔄 Restoring from backup: ${backupFilePath}\n`);

  // バックアップファイル読み込み
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found: ${backupFilePath}`);
  }

  const backups = JSON.parse(fs.readFileSync(backupFilePath, 'utf-8'));

  for (const [baseName, backup] of Object.entries(backups)) {
    console.log(`🔵 Restoring ${baseName}...`);
    console.log(`   Base ID: ${backup.baseId}`);
    console.log(`   Backup Date: ${backup.timestamp}\n`);

    const base = new Airtable({ apiKey }).base(backup.baseId);

    for (const [tableName, records] of Object.entries(backup.tables)) {
      console.log(`   📤 Restoring ${tableName} (${records.length} records)...`);

      // Airtableは一度に10レコードまで作成可能
      const batchSize = 10;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const recordsToCreate = batch.map(r => ({ fields: r.fields }));

        try {
          await base(tableName).create(recordsToCreate);
          console.log(`      ✅ Restored ${i + batch.length}/${records.length} records`);

          // レート制限対策（200ms待機）
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          console.error(`      ❌ Error restoring batch: ${err.message}`);
        }
      }

      console.log(`   ✅ ${tableName} restored\n`);
    }

    console.log(`✅ ${baseName} restoration completed\n`);
  }

  console.log('✅ All bases restored successfully!\n');
}

/**
 * バックアップのサマリー表示
 */
function displaySummary(backups) {
  console.log('='

.repeat(60));
  console.log('📊 Backup Summary');
  console.log('='.repeat(60));
  console.log('');

  for (const [baseName, backup] of Object.entries(backups)) {
    console.log(`${baseName}:`);
    console.log(`  Base ID: ${backup.baseId}`);
    console.log(`  Timestamp: ${backup.timestamp}`);
    console.log(`  Tables:`);

    for (const [tableName, records] of Object.entries(backup.tables)) {
      console.log(`    - ${tableName}: ${records.length} records`);
    }

    const totalRecords = Object.values(backup.tables).reduce((sum, records) => sum + records.length, 0);
    console.log(`  Total: ${totalRecords} records\n`);
  }

  console.log('='.repeat(60));
  console.log('');
}

/**
 * メイン実行
 */
async function main() {
  const args = process.argv.slice(2);
  const apiKey = process.env.AIRTABLE_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: AIRTABLE_API_KEY environment variable is required');
    process.exit(1);
  }

  // オプション解析
  const baseArg = args.find(arg => arg.startsWith('--base='));
  const restoreArg = args.find(arg => arg.startsWith('--restore='));

  const targetBase = baseArg ? baseArg.split('=')[1] : null;
  const restoreFile = restoreArg ? restoreArg.split('=')[1] : null;

  if (restoreFile) {
    // 復元モード
    await restoreFromBackup(restoreFile, apiKey);
  } else {
    // バックアップモード
    console.log('🚀 Airtable Backup Starting...\n');

    if (targetBase) {
      console.log(`📌 Target: ${targetBase} only\n`);
    } else {
      console.log('📌 Target: All bases\n');
    }

    const backups = await backupAllBases(apiKey, targetBase);
    displaySummary(backups);

    const filepath = saveBackupToFile(backups);

    console.log('✅ Backup completed successfully!');
    console.log(`\nTo restore from this backup, run:`);
    console.log(`   AIRTABLE_API_KEY="xxx" node packages/shared/scripts/backup-airtable.cjs --restore=${filepath}\n`);
  }
}

// 実行
if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { backupBase, restoreFromBackup };
