// 複合プラン C1「ウミガメシュノーケル＆ヤシガニ探検 昼夜セット」用のカバー画像を生成するスクリプト。
// 昼（ウミガメシュノーケル）と夜（ナイトツアー）の写真を対角線で1枚に合成し、
// 中央の＋バッジを焼き込む。再生成: node scripts/generate-combo-cover.mjs
import sharp from "sharp"
import { mkdir } from "node:fs/promises"

const W = 1600
const H = 1000
const SNORKEL = "public/images/tours/snorkel/snorkel-01.webp"
const NIGHT = "public/images/tours/night/night-01.webp"
const OUT_DIR = "public/images/tours/combo"
const OUT_LABELED = `${OUT_DIR}/combo-day-night.webp` // カード/カルーセル用
const OUT_HERO = `${OUT_DIR}/combo-hero.webp` // 詳細ページのヒーロー背景用（ラベルなし・ページ側がタイトルを重ねる）

// 対角線。少し左へ寄せて、右側のヤシガニ写真をカード内で広く見せる。
const TOP_X = 820
const BOT_X = 520
const MID = { x: (TOP_X + BOT_X) / 2, y: H / 2 }

const FONT = "Hiragino Sans, Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"

// 中央の＋バッジ（昼＋夜のセットを示す）＋ 対角の仕切り線。
const dividerAndBadge = `
  <line x1="${TOP_X}" y1="0" x2="${BOT_X}" y2="${H}" stroke="rgba(0,0,0,0.3)" stroke-width="14"/>
  <line x1="${TOP_X}" y1="0" x2="${BOT_X}" y2="${H}" stroke="#ffffff" stroke-width="6"/>
  <circle cx="${MID.x}" cy="${MID.y + 3}" r="50" fill="rgba(0,0,0,0.25)"/>
  <circle cx="${MID.x}" cy="${MID.y}" r="50" fill="#ffffff"/>
  <text x="${MID.x}" y="${MID.y + 22}" font-family="${FONT}" font-size="64" font-weight="800" fill="#059669" text-anchor="middle">＋</text>`

// カード/カルーセル用。カードUI側にバッジ・写真枚数が重なるため、画像内には文字を焼き込まない。
const cardOverlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(0,0,0,0.18)"/>
      <stop offset="0.35" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
    <linearGradient id="bot" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.68" stop-color="rgba(0,0,0,0)"/>
      <stop offset="1" stop-color="rgba(0,0,0,0.28)"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#top)"/>
  <rect width="${W}" height="${H}" fill="url(#bot)"/>
  ${dividerAndBadge}
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
  const nightPhoto = await sharp(NIGHT).resize({ height: H }).ensureAlpha().toBuffer()
  const nightMeta = await sharp(nightPhoto).metadata()
  const nightLeft = W - (nightMeta.width ?? W)
  const nightCover = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: nightPhoto, top: 0, left: nightLeft }])
    .png()
    .toBuffer()

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
    [OUT_LABELED, cardOverlaySvg],
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
