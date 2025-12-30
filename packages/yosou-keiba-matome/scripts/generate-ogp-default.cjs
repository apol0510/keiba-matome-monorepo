/**
 * デフォルトOGP画像生成スクリプト
 * 2ch風デザインのOGP画像（1200x630px）を生成
 */

const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// 画像サイズ（Twitter Card推奨）
const WIDTH = 1200;
const HEIGHT = 630;

// 色定義（2ch風）
const COLORS = {
  background: '#ffffee',  // 薄黄色
  header: '#ea8b00',      // オレンジ
  text: '#000000',        // 黒
  textLight: '#666666',   // グレー
  white: '#ffffff',       // 白
};

async function generateOGPImage() {
  console.log('🎨 OGP画像生成開始...');

  // Canvasを作成
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // 背景（薄黄色）
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ヘッダー（オレンジ）
  ctx.fillStyle = COLORS.header;
  ctx.fillRect(0, 0, WIDTH, 100);

  // ヘッダー下の黒ボーダー
  ctx.fillStyle = COLORS.text;
  ctx.fillRect(0, 100, WIDTH, 4);

  // ヘッダーテキスト「競馬予想まとめ」
  ctx.fillStyle = COLORS.white;
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('競馬予想まとめ', WIDTH / 2, 50);

  // メインコンテンツ
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('中央重賞＋南関重賞', WIDTH / 2, 240);

  ctx.font = '32px sans-serif';
  ctx.fillText('2ch/5ch風 予想コメント', WIDTH / 2, 310);

  // 特徴を箇条書き
  ctx.font = '28px sans-serif';
  ctx.fillStyle = COLORS.textLight;
  ctx.textAlign = 'left';

  const features = [
    '🏇 中央G1/G2/G3すべて対応',
    '🌟 南関重賞（大井・船橋・川崎・浦和）',
    '💬 2ch風の熱い予想コメント',
  ];

  let y = 400;
  features.forEach(feature => {
    ctx.fillText(feature, 100, y);
    y += 50;
  });

  // フッター（URL）
  ctx.fillStyle = COLORS.textLight;
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('yosou.keiba-matome.jp', WIDTH / 2, HEIGHT - 30);

  // 画像を保存
  const outputDir = path.join(__dirname, '../public/og');
  const outputPath = path.join(outputDir, 'default.png');

  // ディレクトリが存在しない場合は作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ OGP画像を生成しました: ${outputPath}`);
  console.log(`   サイズ: ${WIDTH}x${HEIGHT}px`);
  console.log(`   ファイルサイズ: ${(buffer.length / 1024).toFixed(2)} KB`);
}

// 実行
generateOGPImage().catch(error => {
  console.error('❌ OGP画像生成に失敗しました:', error);
  process.exit(1);
});
