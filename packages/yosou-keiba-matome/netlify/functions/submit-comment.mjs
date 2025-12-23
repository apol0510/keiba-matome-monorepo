import Airtable from 'airtable';

// Rate Limiting用のインメモリストア
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1時間
const RATE_LIMIT_MAX_REQUESTS = 5; // 1時間あたり5件まで
const MAX_STORE_SIZE = 1000; // メモリリーク防止: 最大1000エントリ

// パフォーマンス統計
const stats = {
  totalRequests: 0,
  successfulPosts: 0,
  rateLimitBlocks: 0,
  spamBlocks: 0,
  errors: 0,
  startTime: Date.now(),
};

/**
 * Rate Limitingストアのクリーンアップ
 * メモリリーク防止: 古いエントリを削除
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  const entriesToDelete = [];

  // 古いエントリを特定
  for (const [ip, timestamps] of rateLimitStore.entries()) {
    const recentRequests = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (recentRequests.length === 0) {
      entriesToDelete.push(ip);
    } else {
      rateLimitStore.set(ip, recentRequests);
    }
  }

  // 古いエントリを削除
  entriesToDelete.forEach(ip => rateLimitStore.delete(ip));

  // ストアサイズが上限を超えた場合、最古のエントリから削除
  if (rateLimitStore.size > MAX_STORE_SIZE) {
    const entries = Array.from(rateLimitStore.entries());
    const oldestEntries = entries
      .map(([ip, timestamps]) => ({ ip, oldestTimestamp: Math.min(...timestamps) }))
      .sort((a, b) => a.oldestTimestamp - b.oldestTimestamp)
      .slice(0, rateLimitStore.size - MAX_STORE_SIZE);

    oldestEntries.forEach(entry => rateLimitStore.delete(entry.ip));
  }
}

/**
 * Rate Limitingチェック
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimitStore.get(ip) || [];

  // 古いリクエストを削除（1時間以上前）
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

  // 制限超過チェック
  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(recentRequests[0] + RATE_LIMIT_WINDOW)
    };
  }

  // 新しいリクエストを記録
  recentRequests.push(now);
  rateLimitStore.set(ip, recentRequests);

  // 定期的にクリーンアップ（10%の確率で実行）
  if (Math.random() < 0.1) {
    cleanupRateLimitStore();
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - recentRequests.length,
    resetAt: new Date(now + RATE_LIMIT_WINDOW)
  };
}

/**
 * XSS対策: HTMLエスケープ
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * 高度なスパム判定
 */
function isSpam(content, userName) {
  // URL判定
  if (content.match(/https?:\/\//) || content.match(/www\./)) {
    return { isSpam: true, reason: 'URLを含むコメントは投稿できません' };
  }

  // 同じ文字の連続（10文字以上）
  if (content.match(/(.)\1{9,}/)) {
    return { isSpam: true, reason: '同じ文字の繰り返しが多すぎます' };
  }

  // スパムキーワード
  const spamKeywords = [
    '無料登録', '今すぐクリック', '稼げる', '副業', '在宅ワーク',
    '簡単に稼ぐ', '詐欺', '出会い系', 'アダルト', 'ギャンブル必勝法'
  ];

  for (const keyword of spamKeywords) {
    if (content.includes(keyword)) {
      return { isSpam: true, reason: 'スパムと判定されました' };
    }
  }

  // 全角・半角数字のみ（電話番号などを防ぐ）
  if (/^[\d０-９\-\s]+$/.test(content.trim())) {
    return { isSpam: true, reason: '数字のみのコメントは投稿できません' };
  }

  return { isSpam: false };
}

export default async (req, context) => {
  // 統計: リクエスト数をカウント
  stats.totalRequests++;

  // CORSヘッダー設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // OPTIONSリクエスト（プリフライト）
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // POSTリクエストのみ許可
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    // IPアドレス取得（Netlifyの場合）
    const ip = req.headers.get('x-nf-client-connection-ip') ||
               req.headers.get('x-forwarded-for') ||
               'unknown';

    // Rate Limitingチェック
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      stats.rateLimitBlocks++;
      console.log(`⚠️ Rate limit exceeded for IP: ${ip} (Total blocks: ${stats.rateLimitBlocks})`);

      // Discord通知（非同期、エラーでも投稿拒否は継続）
      sendSecurityAlert({
        type: 'rate_limit',
        ip,
        reason: `1時間に${RATE_LIMIT_MAX_REQUESTS}件を超過`,
        content: null,
      }).catch(err => console.error('Security alert failed:', err));

      return new Response(
        JSON.stringify({
          error: `投稿制限: 1時間に${RATE_LIMIT_MAX_REQUESTS}件まで投稿できます`,
          resetAt: rateLimit.resetAt.toISOString()
        }),
        { status: 429, headers }
      );
    }

    const body = await req.json();
    const { newsId, content, userName } = body;

    // バリデーション
    if (!newsId || !content) {
      return new Response(JSON.stringify({ error: '必須項目が不足しています' }), {
        status: 400,
        headers,
      });
    }

    if (content.length < 2 || content.length > 500) {
      return new Response(
        JSON.stringify({ error: 'コメントは2〜500文字で入力してください' }),
        { status: 400, headers }
      );
    }

    // スパム判定（高度なチェック）
    const spamCheck = isSpam(content, userName || '名無しさん@競馬板');
    if (spamCheck.isSpam) {
      stats.spamBlocks++;
      console.log(`⚠️ Spam detected for IP: ${ip} - ${spamCheck.reason} (Total blocks: ${stats.spamBlocks})`);

      // Discord通知（非同期、エラーでも投稿拒否は継続）
      sendSecurityAlert({
        type: 'spam',
        ip,
        reason: spamCheck.reason,
        content: content,
      }).catch(err => console.error('Security alert failed:', err));

      return new Response(
        JSON.stringify({ error: spamCheck.reason }),
        { status: 400, headers }
      );
    }

    // Airtable接続
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      console.error('Airtable credentials missing');
      return new Response(
        JSON.stringify({ error: '設定エラー' }),
        { status: 500, headers }
      );
    }

    const base = new Airtable({ apiKey }).base(baseId);

    // 既存コメント数を取得
    const allComments = await base('Comments').select().all();
    const existingComments = allComments.filter(record => {
      const articleIdArray = record.fields.ArticleID;
      const isApproved = record.fields.IsApproved !== false;
      return articleIdArray && articleIdArray.includes(newsId) && isApproved;
    });

    const nextNumber = existingComments.length + 1;

    // ランダムID生成
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let userId = 'ID:';
    for (let i = 0; i < 8; i++) {
      userId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // XSS対策: コンテンツとユーザー名をエスケープ
    const sanitizedContent = escapeHtml(content);
    const sanitizedUserName = escapeHtml(userName || '名無しさん@競馬板');

    // コメントを保存
    const createdRecords = await base('Comments').create([
      {
        fields: {
          ArticleID: [newsId],
          Number: nextNumber,
          UserID: userId,
          Content: sanitizedContent,
          IsOP: false,
          IsApproved: true, // 即時承認
          UserName: sanitizedUserName,
        },
      },
    ]);

    const newComment = createdRecords[0];

    // Discord通知送信
    await sendDiscordNotification({
      newsId,
      content: sanitizedContent,
      userName: sanitizedUserName,
      userId,
      nextNumber,
    });

    // 統計: 成功カウント
    stats.successfulPosts++;

    // 統計情報をログ出力（100リクエストごと）
    if (stats.totalRequests % 100 === 0) {
      const uptime = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
      console.log(`📊 統計情報 (起動から${uptime}分):`);
      console.log(`  総リクエスト: ${stats.totalRequests}`);
      console.log(`  成功投稿: ${stats.successfulPosts}`);
      console.log(`  Rate Limitブロック: ${stats.rateLimitBlocks}`);
      console.log(`  スパムブロック: ${stats.spamBlocks}`);
      console.log(`  エラー: ${stats.errors}`);
    }

    // 成功レスポンス
    return new Response(
      JSON.stringify({
        success: true,
        comment: {
          number: nextNumber,
          userId: userId,
          content: sanitizedContent,
          userName: sanitizedUserName,
          createdAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers }
    );
  } catch (error) {
    stats.errors++;

    // 詳細なエラーログ
    console.error('=== Comment Submission Error ===');
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    console.error('Request Headers:', {
      'user-agent': req.headers.get('user-agent'),
      'referer': req.headers.get('referer'),
      'ip': req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for'),
    });
    console.error('================================');

    // エラー通知（重大なエラーのみDiscord通知）
    if (error.name !== 'ValidationError') {
      sendSecurityAlert({
        type: 'error',
        ip: req.headers.get('x-nf-client-connection-ip') || 'unknown',
        reason: `${error.name}: ${error.message}`,
        content: error.stack?.substring(0, 200),
      }).catch(err => console.error('Error alert failed:', err));
    }

    return new Response(
      JSON.stringify({ error: 'コメント投稿に失敗しました' }),
      { status: 500, headers }
    );
  }
};

/**
 * セキュリティイベント通知（Discord）
 */
async function sendSecurityAlert({ type, ip, reason, content }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  try {
    const colors = {
      'rate_limit': 0xFF6B6B, // 赤
      'spam': 0xFFA500,       // オレンジ
      'error': 0xFF0000,      // 濃い赤
    };

    const titles = {
      'rate_limit': '🚨 Rate Limit超過',
      'spam': '⚠️ スパム検出',
      'error': '💥 システムエラー',
    };

    const embed = {
      title: titles[type] || '🔒 セキュリティアラート',
      color: colors[type] || 0xFF0000,
      fields: [
        {
          name: 'IP アドレス',
          value: ip,
          inline: true,
        },
        {
          name: '理由',
          value: reason,
          inline: true,
        },
        {
          name: 'コンテンツ',
          value: content ? (content.length > 100 ? content.substring(0, 100) + '...' : content) : 'N/A',
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'yosou.keiba-matome.jp Security',
      },
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    console.log(`Security alert sent: ${type}`);
  } catch (error) {
    console.error('Failed to send security alert:', error);
  }
}

/**
 * Discord通知送信
 */
async function sendDiscordNotification({ newsId, content, userName, userId, nextNumber }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('Discord webhook not configured. Skipping notification.');
    return;
  }

  try {
    // 記事情報を取得
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const base = new Airtable({ apiKey }).base(baseId);

    const newsRecord = await base('Articles').find(newsId);
    const newsTitle = newsRecord.fields.Title || '（タイトルなし）';
    const newsSlug = newsRecord.fields.Slug || '';
    const articleUrl = `https://yosou.keiba-matome.jp/keiba-yosou/${newsSlug}/`;

    const embed = {
      title: '💬 新しいコメントが投稿されました',
      color: 0xEA8B00, // オレンジ色（2ch風）
      fields: [
        {
          name: '記事',
          value: newsTitle,
          inline: false,
        },
        {
          name: 'コメント',
          value: content.length > 100 ? content.substring(0, 100) + '...' : content,
          inline: false,
        },
        {
          name: '投稿者',
          value: `${userName} (${userId})`,
          inline: true,
        },
        {
          name: 'リンク',
          value: `[記事を見る](${articleUrl})`,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'yosou.keiba-matome.jp',
      },
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
    // 通知失敗してもエラーにしない（コメント投稿は成功）
  }
}

export const config = {
  path: '/api/submit-comment',
};
