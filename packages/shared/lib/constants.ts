/**
 * 外部リンクURL定数
 *
 * URL変更時はこのファイルのみを修正すれば、全サイトに反映されます。
 */

export const EXTERNAL_LINKS = {
  /**
   * 南関競馬AI予想サイト（最終収益化地点）
   */
  NANKAN_ANALYTICS: 'https://nankan-analytics.keiba.link',

  /**
   * 中央競馬ニュースまとめ
   */
  KEIBA_MATOME: 'https://keiba-matome.jp',

  /**
   * 地方競馬ニュースまとめ
   */
  CHIHOU_KEIBA_MATOME: 'https://chihou.keiba-matome.jp',

  /**
   * 競馬予想まとめ
   */
  YOSOU_KEIBA_MATOME: 'https://yosou.keiba-matome.jp',

  /**
   * 競馬予想サイト口コミ評価
   */
  KEIBA_REVIEW: 'https://keiba-review.jp',

  /**
   * 南関競馬予想サイト口コミ評価
   */
  NANKAN_REVIEW: 'https://nankan.keiba-review.jp',
} as const;

/**
 * GA4トラッキング用のサイト識別子
 */
export const SITE_IDENTIFIERS = {
  KEIBA_MATOME: 'keiba-matome',
  CHIHOU_KEIBA_MATOME: 'chihou-keiba-matome',
  YOSOU_KEIBA_MATOME: 'yosou-keiba-matome',
  NANKAN_ANALYTICS: 'nankan-analytics',
} as const;

/**
 * 間違ったURLリスト（pre-commitフックで検出用）
 */
export const DEPRECATED_URLS = [
  'nankan-analytics.com',
  'keiba-matome.netlify.app',
  'chihou-keiba-matome.netlify.app',
  'yosou-keiba-matome.netlify.app',
  'nankan-keiba-review.netlify.app',
] as const;
