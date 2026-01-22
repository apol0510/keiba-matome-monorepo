/**
 * スクレイピング共通ユーティリティ
 *
 * 3つのプロジェクトで共通のスクレイピング処理を提供
 */

/**
 * URL正規化（重複判定・ブロックリスト用）
 *
 * 正規化ルール:
 * - https強制
 * - www除去
 * - utm_*除去
 * - 末尾スラッシュ統一
 * - クエリパラメータ削除（基本）
 */
function normalizeURL(url) {
  if (!url) return null;

  try {
    let normalized = url.trim();

    // https強制
    normalized = normalized.replace(/^http:\/\//, 'https://');

    // www除去
    normalized = normalized.replace(/^https:\/\/www\./, 'https://');

    // URLオブジェクトでパース
    const urlObj = new URL(normalized);

    // utm_*パラメータ除去
    const params = new URLSearchParams(urlObj.search);
    for (const key of [...params.keys()]) {
      if (key.startsWith('utm_')) {
        params.delete(key);
      }
    }

    // クエリパラメータを再構築
    urlObj.search = params.toString();

    // 末尾スラッシュを統一（なし）
    let result = urlObj.toString();
    if (result.endsWith('/') && result !== urlObj.origin + '/') {
      result = result.slice(0, -1);
    }

    return result;
  } catch (err) {
    console.error(`❌ URL正規化エラー: ${url} - ${err.message}`);
    return url; // 正規化失敗時は元のURLを返す
  }
}

/**
 * ブロックリスト（再生成禁止URL）
 *
 * 理由:
 * - 不要な記事（古い記事、誤情報、重複など）
 * - 何度削除しても復活する記事
 *
 * 追加方法:
 * 1. normalizeURL() で正規化したURLを追加
 * 2. 理由をコメントで記載
 */
const BLOCKED_URLS = [
  // 本当に不要な記事のみ追加（古い記事は自動で弾かれるようになります）
  // 例: 'https://example.com/spam-article',
];

/**
 * ブロックリストチェック
 *
 * @param {string} url - チェックするURL
 * @returns {boolean} - ブロックリストに含まれる場合true
 */
function isBlockedURL(url) {
  const normalized = normalizeURL(url);
  if (!normalized) return false;

  return BLOCKED_URLS.some(blockedURL => {
    const normalizedBlocked = normalizeURL(blockedURL);
    return normalized === normalizedBlocked;
  });
}

/**
 * タイトルクリーンアップ（50文字前後）
 */
function cleanTitle(title) {
  let cleaned = title
    // メディア名+日時パターンを削除
    .replace(/[^\s]+競馬\d+\/\d+\(.+?\)\s+\d+:\d+$/, '')
    .replace(/デイリースポーツ競馬.*$/, '')
    .replace(/スポニチアネックス競馬.*$/, '')
    .replace(/競馬のおはなし競馬.*$/, '')
    .replace(/netkeiba競馬.*$/, '')
    .replace(/スポーツ報知.*$/, '')
    .replace(/Yahoo!ニュース.*$/, '')
    // 余分な記号・空白を削除
    .replace(/…+$/, '')  // 末尾の三点リーダー
    .replace(/\s+$/, '')  // 末尾の空白
    .trim();

  // 50文字前後に調整（完全な文で終わるように）
  if (cleaned.length > 60) {
    cleaned = cleaned.substring(0, 50) + '...';
  }

  return cleaned;
}

/**
 * スラッグ生成（英数字ベース、50文字以内）
 *
 * 404エラー対策: 日本語URLは避け、英数字のみのSlugを生成
 *
 * 生成ルール:
 * 1. 英数字のみを抽出（小文字化）
 * 2. 数字と文字の間にハイフンを挿入（可読性向上）
 * 3. 英数字が不足する場合は日付（YYYYMMDD）を追加
 * 4. 50文字制限
 *
 * 例:
 * - "TCK御神本訓史騎手の3000勝達成" → "tck-3000-20260122"
 * - "東京大賞典４番人気のアウトレンジ" → "4-outrange-20260122"
 * - "栗原大河騎手が地方通算800勝" → "800-20260122"
 */
function generateSlug(title) {
  // 1. 英数字のみを抽出（小文字化）
  const alphanumeric = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')  // 英数字以外をスペースに置換
    .trim()
    .replace(/\s+/g, '-')  // 連続スペースをハイフンに
    .replace(/-+/g, '-')  // 連続ハイフンを1つに
    .replace(/^-|-$/g, '');  // 先頭・末尾のハイフンを削除

  // 2. 日付文字列生成（YYYYMMDD形式）
  const now = new Date();
  const dateStr = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');

  let slug = '';

  // 3. 英数字が十分にある場合（10文字以上）
  if (alphanumeric.length >= 10) {
    slug = alphanumeric;
  }
  // 4. 英数字が少ない場合は日付を追加
  else if (alphanumeric.length > 0) {
    slug = `${alphanumeric}-${dateStr}`;
  }
  // 5. 英数字が全くない場合（日本語のみのタイトル）
  else {
    const timestamp = now.getTime().toString().slice(-6);  // 下6桁
    slug = `news-${dateStr}-${timestamp}`;
  }

  // 6. 50文字以内に切り詰め（URL長対策）
  if (slug.length > 50) {
    slug = slug.substring(0, 50);
  }

  return slug;
}

/**
 * 2ch風スレタイ生成（SEO強化版）
 */
function generate2chTitle(originalTitle, category) {
  const patterns = {
    '速報': [
      `【速報】${originalTitle}`,
      `【速報】${originalTitle} - みんなの反応は？`,
    ],
    '炎上': [
      `【悲報】${originalTitle}`,
      `【炎上】${originalTitle} - 被害者続出`,
      `【詐欺？】${originalTitle}`,
    ],
    'まとめ': [
      `【議論】${originalTitle}`,
      `【質問】${originalTitle} - 詳しい人教えて`,
      `【まとめ】${originalTitle}`,
    ],
    'ランキング': [
      `【朗報】${originalTitle}`,
      `【必見】${originalTitle}`,
    ],
  };

  const categoryPatterns = patterns[category] || [`【ニュース】${originalTitle}`];
  const randomIndex = Math.floor(Math.random() * categoryPatterns.length);

  return categoryPatterns[randomIndex];
}

/**
 * カテゴリ判定（優先順位付き）
 */
function detectCategory(title) {
  // 1. 炎上・ネガティブ系（最優先）
  if (title.match(/詐欺|炎上|閉鎖|返金|被害|告発|悪質|トラブル|問題|批判|非難/)) {
    return '炎上';
  }

  // 2. ランキング・まとめ系
  if (title.match(/ランキング|TOP\d+|おすすめ|人気|ベスト|比較/)) {
    return 'ランキング';
  }

  // 3. レース速報系（広範囲にマッチ）
  if (title.match(/G1|G2|G3|GⅠ|GⅡ|GⅢ|レース|勝利|優勝|着順|騎手|コメント|結果|有馬記念|ダービー|ジュベナイル|スプリント|カペラ|取りやめ|中止|延期|開催|出走|馬場/)) {
    return '速報';
  }

  // 4. 議論・まとめ系（デフォルト）
  return 'まとめ';
}

/**
 * タグ判定
 */
function detectTags(title, category) {
  const tags = [];

  // カテゴリ固有タグ
  if (category === '炎上') tags.push('炎上');
  if (category === '速報') tags.push('速報');

  // 重賞・レース関連
  if (title.match(/G1|GⅠ/)) tags.push('G1');
  if (title.match(/G2|GⅡ/)) tags.push('G2');
  if (title.match(/G3|GⅢ/)) tags.push('G3');

  // 騎手・馬主
  if (title.match(/騎手|ジョッキー|武豊|藤田菜七子|戸崎圭太|川田将雅|ルメール|デムーロ/)) tags.push('騎手');
  if (title.match(/馬主/)) tags.push('馬主');

  // 競馬場（中央）
  if (title.match(/東京競馬場|中山|阪神|京都|中京|新潟|福島|函館|札幌|小倉/)) {
    tags.push('競馬場');
  }

  // 競馬場（地方）
  if (title.match(/大井|TCK/)) tags.push('大井競馬');
  if (title.match(/船橋/)) tags.push('船橋競馬');
  if (title.match(/川崎/)) tags.push('川崎競馬');
  if (title.match(/浦和/)) tags.push('浦和競馬');
  if (title.match(/南関|南関東/)) tags.push('南関東');
  if (title.match(/地方競馬|門別|盛岡|水沢|金沢|笠松|名古屋|園田|高知|佐賀/)) {
    tags.push('地方競馬');
  }

  // 予想サイト関連
  if (title.match(/予想サイト|競馬サイト|情報サイト/)) tags.push('予想サイト');
  if (title.match(/詐欺|悪質|返金/)) tags.push('詐欺');

  return tags;
}

/**
 * エラーハンドリング付きPuppeteer実行
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    delayMs = 2000,
    timeoutMs = 30000,
    onRetry = (err, attempt) => console.log(`⚠️  Retry ${attempt}/${maxRetries}: ${err.message}`)
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // タイムアウト付き実行
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        )
      ]);
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        onRetry(err, attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Airtable重複チェック（Slug）
 */
async function isDuplicate(base, tableName, slug) {
  try {
    const records = await base(tableName)
      .select({
        filterByFormula: `{Slug} = '${slug.replace(/'/g, "\\'")}'`,
        maxRecords: 1
      })
      .firstPage();

    return records.length > 0;
  } catch (err) {
    console.error(`❌ Error checking duplicate: ${err.message}`);
    return false; // エラー時は重複なしとして処理
  }
}

/**
 * レート制限付きAirtable保存
 */
async function saveToAirtableWithRateLimit(base, tableName, record, delayMs = 200) {
  try {
    const created = await base(tableName).create([{ fields: record }]);
    await new Promise(resolve => setTimeout(resolve, delayMs)); // レート制限対策
    return created[0];
  } catch (err) {
    console.error(`❌ Error saving to Airtable: ${err.message}`);
    throw err;
  }
}

module.exports = {
  normalizeURL,
  isBlockedURL,
  cleanTitle,
  generateSlug,
  generate2chTitle,
  detectCategory,
  detectTags,
  withRetry,
  isDuplicate,
  saveToAirtableWithRateLimit,
};
