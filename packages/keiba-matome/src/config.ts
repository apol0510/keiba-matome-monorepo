/**
 * 競馬ニュースまとめ - サイト設定
 * netkeiba/Yahoo!ニュースに2ch/5ch風コメントを追加
 */

export interface SiteConfig {
  name: string;
  domain: string;
  projectName: string;
  categories: readonly string[];
  categoryLabels: Record<string, string>;
  theme: {
    primaryColor: string;
    secondaryColor: string;
  };
  airtable: {
    baseId: string;
    apiKey: string;
  };
}

export const config: SiteConfig = {
  // サイト基本情報
  name: '競馬ニュースまとめ',
  domain: 'keiba-matome.jp',
  projectName: 'keiba-matome',

  // カテゴリ設定
  categories: ['速報', '炎上', 'まとめ', 'ランキング'] as const,
  categoryLabels: {
    '速報': '🔥 速報',
    '炎上': '💥 炎上',
    'まとめ': '📝 まとめ',
    'ランキング': '📊 ランキング',
  },

  // テーマカラー（2ch/5ch風）
  theme: {
    primaryColor: '#ea8b00',  // オレンジ - 2ch/5chカラー
    secondaryColor: '#ffffee', // 薄黄色 - 掲示板背景
  },

  // Airtable設定（モノレポ対応：プロジェクト固有の環境変数名を優先）
  airtable: {
    baseId: process.env.KEIBA_MATOME_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID || '',
    apiKey: process.env.KEIBA_MATOME_AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY || '',
  },
};

// 環境変数チェック
if (!config.airtable.apiKey || !config.airtable.baseId) {
  console.warn('⚠️ AIRTABLE_API_KEY or AIRTABLE_BASE_ID (or fallback AIRTABLE_*) is not set. Please check your .env file.');
}
