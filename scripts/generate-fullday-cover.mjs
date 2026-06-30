// まるごと1日セット C5/C6「ウミガメシュノーケル＆ドローンSUP＆ナイトツアー」用のカバー画像。
// 朝:海(ウミガメ) / 昼:空(ドローンSUP) / 夜(ヤシガニ) の3枚を2本の対角線で1枚に合成し、
// 継ぎ目に＋バッジ、各パネル下に「海/空/夜」のラベルを焼き込む。
// 再生成: node scripts/generate-fullday-cover.mjs
import sharp from "sharp"
import { mkdir } from "node:fs/promises"

const W = 1600
const H = 1000
const SEA = "public/images/tours/snorkel/snorkel-01.webp" // 朝:海 ウミガメ
const SKY = "public/images/tours/day-sup/day-sup-turquoise-aerial-013.webp" // 昼:空 ドローンSUP
const NIGHT = "public/images/tours/night/night-01.webp" // 夜 ヤシガニ
const OUT_DIR = "public/images/tours/combo"
const OUT_LABELED = `${OUT_DIR}/combo-fullday.webp` // カード/カルーセル用
const OUT_HERO = `${OUT_DIR}/combo-fullday-hero.webp` // 詳細ヒーロー背景用（タイトルはページ側）

// 2本の対角線（少し右肩上がり）。左=海 / 中=空 / 右=夜。
const A_TOP = 600
const A_BOT = 420
const B_TOP = 1185
const B_BOT = 1000
const A_MID = { x: (A_TOP + A_BOT) / 2, y: H / 2 }
const B_MID = { x: (B_TOP + B_BOT) / 2, y: H / 2 }

const FONT = "Hiragino Sans, Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"

// ＋バッジ（継ぎ目2か所）＋ 対角の仕切り線
function plusBadge(cx, cy) {
  return `
    <circle cx="${cx}" cy="${cy + 3}" r="44" fill="rgba(0,0,0,0.25)"/>
    <circle cx="${cx}" cy="${cy}" r="44" fill="#ffffff"/>
    <text x="${cx}" y="${cy + 19}" font-family="${FONT}" font-size="56" font-weight="800" fill="#059669" text-anchor="middle">＋</text>`
}

const dividers = `
  <line x1="${A_TOP}" y1="0" x2="${A_BOT}" y2="${H}" stroke="rgba(0,0,0,0.3)" stroke-width="14"/>
  <line x1="${A_TOP}" y1="0" x2="${A_BOT}" y2="${H}" stroke="#ffffff" stroke-width="6"/>
  <line x1="${B_TOP}" y1="0" x2="${B_BOT}" y2="${H}" stroke="rgba(0,0,0,0.3)" stroke-width="14"/>
  <line x1="${B_TOP}" y1="0" x2="${B_BOT}" y2="${H}" stroke="#ffffff" stroke-width="6"/>`

const decals = `
  ${dividers}
  ${plusBadge(A_MID.x, A_MID.y)}
  ${plusBadge(B_MID.x, B_MID.y)}`

const cardOverlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(0,0,0,0.18)"/>
      <stop offset="0.35" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
    <linearGradient id="bot" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.6" stop-color="rgba(0,0,0,0)"/>
      <stop offset="1" stop-color="rgba(0,0,0,0.34)"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#top)"/>
  <rect width="${W}" height="${H}" fill="url(#bot)"/>
  ${decals}
</svg>`

const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${decals}</svg>`

// 各パネルを切り出すアルファマスク
const seaMask = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><polygon points="0,0 ${A_TOP},0 ${A_BOT},${H} 0,${H}" fill="#fff"/></svg>`
const skyMask = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><polygon points="${A_TOP},0 ${B_TOP},0 ${B_BOT},${H} ${A_BOT},${H}" fill="#fff"/></svg>`
const nightMask = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><polygon points="${B_TOP},0 ${W},0 ${W},${H} ${B_BOT},${H}" fill="#fff"/></svg>`

async function panel(src, maskSvg, position) {
  const cover = await sharp(src).resize(W, H, { fit: "cover", position }).ensureAlpha().toBuffer()
  return sharp(cover).composite([{ input: Buffer.from(maskSvg), blend: "dest-in" }]).png().toBuffer()
}

// 夜パネルは右の細いくさび形。ヤシガニ本体（中央）がそのくさびに収まるよう、
// 高さ基準で拡大した夜写真を、カニの中心が可視領域の中心(≈x1330)に来る位置へ寄せる。
async function makeNightPanel() {
  const scaled = await sharp(NIGHT).resize({ height: H }).ensureAlpha().toBuffer()
  const { width: sw } = await sharp(scaled).metadata()
  const crabCenter = sw * 0.5 // カニはほぼ中央
  const targetX = 1330 // 右くさびの可視中心あたり
  const left = Math.round(targetX - crabCenter)
  const placed = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: scaled, top: 0, left }])
    .png()
    .toBuffer()
  return sharp(placed).composite([{ input: Buffer.from(nightMask), blend: "dest-in" }]).png().toBuffer()
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const seaPanel = await panel(SEA, seaMask, "attention")
  const skyPanel = await panel(SKY, skyMask, "centre")
  const nightPanel = await makeNightPanel()

  const photoBase = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: seaPanel, top: 0, left: 0 },
      { input: skyPanel, top: 0, left: 0 },
      { input: nightPanel, top: 0, left: 0 },
    ])
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
