// 複合プラン C1「宮古島まるごと昼夜プラン」用のカバー画像を生成するスクリプト。
// 昼（ウミガメシュノーケル）と夜（ナイトツアー）の写真を対角線で1枚に合成し、
// 「昼/夜」ラベルと中央の＋バッジを焼き込む。再生成: node scripts/generate-combo-cover.mjs
import sharp from "sharp"
import { mkdir } from "node:fs/promises"

const W = 1600
const H = 1000
const SNORKEL = "public/images/tours/snorkel/snorkel-01.webp"
const NIGHT = "public/images/tours/night/night-01.webp"
const OUT_DIR = "public/images/tours/combo"
const OUT_LABELED = `${OUT_DIR}/combo-day-night.webp` // カード/カルーセル用（ラベル付き）
const OUT_HERO = `${OUT_DIR}/combo-hero.webp` // 詳細ページのヒーロー背景用（ラベルなし・ページ側がタイトルを重ねる）

// 対角線（上は右寄り、下は左寄り）
const TOP_X = 900
const BOT_X = 600
const MID = { x: (TOP_X + BOT_X) / 2, y: H / 2 }

const FONT = "Hiragino Sans, Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"

// 影付きテキスト（暗い複製を背面に置いて視認性を上げる）
function label({ x, y, size, weight, fill, text, anchor = "start" }) {
  return `
    <text x="${x + 3}" y="${y + 3}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="rgba(0,0,0,0.55)" text-anchor="${anchor}">${text}</text>
    <text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${text}</text>`
}

// 中央の＋バッジ（昼＋夜のセットを示す）＋ 対角の仕切り線
const dividerAndBadge = `
  <line x1="${TOP_X}" y1="0" x2="${BOT_X}" y2="${H}" stroke="rgba(0,0,0,0.3)" stroke-width="14"/>
  <line x1="${TOP_X}" y1="0" x2="${BOT_X}" y2="${H}" stroke="#ffffff" stroke-width="6"/>
  <circle cx="${MID.x}" cy="${MID.y + 3}" r="50" fill="rgba(0,0,0,0.25)"/>
  <circle cx="${MID.x}" cy="${MID.y}" r="50" fill="#ffffff"/>
  <text x="${MID.x}" y="${MID.y + 22}" font-family="${FONT}" font-size="64" font-weight="800" fill="#059669" text-anchor="middle">＋</text>`

// ラベル付き（カード/カルーセル用）
const labeledSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(0,0,0,0.5)"/>
      <stop offset="0.42" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
    <linearGradient id="bot" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.55" stop-color="rgba(0,0,0,0)"/>
      <stop offset="1" stop-color="rgba(0,0,0,0.65)"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#top)"/>
  <rect width="${W}" height="${H}" fill="url(#bot)"/>
  ${dividerAndBadge}
  ${label({ x: 64, y: 104, size: 34, weight: 700, fill: "#a7f3d0", text: "DAY ・ 昼" })}
  ${label({ x: 60, y: 172, size: 60, weight: 800, fill: "#ffffff", text: "ウミガメシュノーケル" })}
  ${label({ x: 1536, y: 862, size: 34, weight: 700, fill: "#c7d2fe", text: "夜 ・ NIGHT", anchor: "end" })}
  ${label({ x: 1540, y: 930, size: 60, weight: 800, fill: "#ffffff", text: "ナイトツアー", anchor: "end" })}
</svg>`

// ラベルなし（ヒーロー背景用。ページ側がタイトルを重ねるため文字を入れない）
const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${dividerAndBadge}
</svg>`

// 夜画像を「対角線の右下側」だけに切り抜くためのアルファマスク
const nightMaskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <polygon points="${TOP_X},0 ${W},0 ${W},${H} ${BOT_X},${H}" fill="#ffffff"/>
</svg>`

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const dayBase = await sharp(SNORKEL).resize(W, H, { fit: "cover", position: "attention" }).toBuffer()
  const nightCover = await sharp(NIGHT).resize(W, H, { fit: "cover", position: "attention" }).ensureAlpha().toBuffer()

  const nightMasked = await sharp(nightCover)
    .composite([{ input: Buffer.from(nightMaskSvg), blend: "dest-in" }])
    .png()
    .toBuffer()

  // 写真を対角線で合成したベース（ラベルなし）
  const photoBase = await sharp(dayBase)
    .composite([{ input: nightMasked, top: 0, left: 0 }])
    .png()
    .toBuffer()

  for (const [out, svg] of [
    [OUT_LABELED, labeledSvg],
    [OUT_HERO, heroSvg],
  ]) {
    await sharp(photoBase)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .webp({ quality: 88 })
      .toFile(out)
    const meta = await sharp(out).metadata()
    console.log(`generated ${out} (${meta.width}x${meta.height}, ${meta.format})`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
