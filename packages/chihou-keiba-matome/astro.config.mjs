// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: 'https://chihou-keiba-matome.jp',
  server: {
    port: 4324,
  },
  integrations: [],
  output: 'server', // サーバーモード（Netlify Functions用）
  adapter: netlify(),
  vite: {
    // 環境変数をViteに明示的に渡す（Netlifyの環境変数から直接読み込み）
    define: {
      'process.env.CHIHOU_KEIBA_AIRTABLE_API_KEY': JSON.stringify(process.env.CHIHOU_KEIBA_AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY || ''),
      'process.env.CHIHOU_KEIBA_AIRTABLE_BASE_ID': JSON.stringify(process.env.CHIHOU_KEIBA_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID || ''),
      'process.env.AIRTABLE_API_KEY': JSON.stringify(process.env.CHIHOU_KEIBA_AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY || ''),
      'process.env.AIRTABLE_BASE_ID': JSON.stringify(process.env.CHIHOU_KEIBA_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID || ''),
    },
  },
  // 圧縮を有効化
  compressHTML: true,
  // ビルド最適化
  build: {
    inlineStylesheets: 'auto',
    // アセットのインライン化閾値（4KB以下のものはインライン化）
    assetsInlineLimit: 4096,
  },
  // 画像最適化（Netlify Image CDN対応）
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: false,
      },
    },
    domains: ['fonts.googleapis.com', 'fonts.gstatic.com', 'image.thum.io'],
    remotePatterns: [{ protocol: 'https' }],
  },
  // プリフェッチ設定
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
});
