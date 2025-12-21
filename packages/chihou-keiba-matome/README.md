# chihou-keiba-matome

地方競馬ニュースまとめサイト - 南関東4競馬・全国地方競馬に2ch/5ch風コメント

## 概要

netkeiba、スポーツ報知、スポニチ、Yahoo!ニュースから地方競馬ニュースを取得し、AI生成の2ch/5ch風コメントを追加したまとめサイトです。

## 特徴

- 🏇 地方競馬ニュース自動収集（4ソース、1日3回）
- 💬 2ch/5ch風コメント自動生成（Claude AI）
- 🎨 掲示板風デザイン（薄黄色背景、オレンジアクセント）
- 🤖 完全自動運営（GitHub Actions）

## 対象競馬場

- 南関東4競馬（大井・船橋・川崎・浦和）
- 全国の地方競馬

## 技術スタック

- **フロントエンド**: Astro 5.x
- **データベース**: Airtable
- **スクレイピング**: Puppeteer
- **AI**: Claude Sonnet 4.5
- **ホスティング**: Netlify
- **自動化**: GitHub Actions

## 開発

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build
```

## スクレイピング

```bash
# netkeiba地方競馬ニュース（5件）
AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" npm run scrape:netkeiba

# スポーツ報知（4件）
npm run scrape:hochi

# スポニチ（4件）
npm run scrape:sponichi

# Yahoo!ニュース（4件）
npm run scrape:yahoo
```

## コメント生成

```bash
ANTHROPIC_API_KEY="xxx" AIRTABLE_API_KEY="xxx" AIRTABLE_BASE_ID="xxx" npm run generate:comments
```

## 環境変数

```bash
# Airtable
AIRTABLE_API_KEY=patCIn4iIx274YQZB...
AIRTABLE_BASE_ID=appt25zmKxQDiSCwh
AIRTABLE_NEWS_TABLE_ID=tblzB1TSKca0Hq81d
AIRTABLE_COMMENTS_TABLE_ID=tblq8mMckpcuFvbf2

# Claude API
ANTHROPIC_API_KEY=sk-ant-api03-...

# サイト情報
SITE_URL=https://chihou.keiba-matome.jp
```

## 自動化

GitHub Actionsで1日3回（6AM, 12PM, 6PM JST）自動実行:

1. 記事取得（netkeiba 5件 + hochi/sponichi/yahoo 各4件 = 17件）
2. 2ch風コメント生成（15-35件/記事）
3. Netlify自動デプロイ

## ライセンス

MIT

## 関連サイト

- 中央競馬版: [keiba-matome.jp](https://keiba-matome.jp)
