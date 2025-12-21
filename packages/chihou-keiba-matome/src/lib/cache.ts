/**
 * シンプルなインメモリキャッシュ
 * 開発時のAirtable API遅延を解決
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

// キャッシュ有効期限（秒）
const CACHE_TTL = 60; // 60秒

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  const age = (now - entry.timestamp) / 1000;

  if (age > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  console.log(`✅ キャッシュヒット: ${key} (${age.toFixed(1)}秒前)`);
  return entry.data;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
  console.log(`💾 キャッシュ保存: ${key}`);
}

export function clearCache(): void {
  cache.clear();
  console.log('🗑️ キャッシュクリア');
}
