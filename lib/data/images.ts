// =============================================================================
// ギャラリー画像の唯一の管理場所（Single Source of Truth）
// -----------------------------------------------------------------------------
// このファイルがサイト内すべてのギャラリー写真の正です。
// /gallery ページと、トップページの Gallery セクションの両方がここを参照します。
//
// 【写真を追加する手順】
//   1. 画像ファイルを public/images/gallery/<カテゴリ名>/ に置く
//        例: public/images/gallery/turtle/turtle-007-couple.webp
//        ファイル名は「カテゴリ-連番-キーワード.webp」形式を推奨（WebP・横幅1200px以上）
//   2. 下の galleryImages 配列に1行追加する
//   3. トップページにも出したい写真は featured: true を付ける
//   4. 表示順は order の昇順（小さいほど先頭）。
//        追加しやすいよう 10 刻みで採番しているので、間に挿し込むときは
//        例: 105 のように中間値を使う
//
// 【カテゴリ】snorkel / turtle / family / night / sup / sunset / boat / private / other
//   表示用の日本語ラベルは GALLERY_CATEGORY_LABELS で定義。
//   ※ /gallery のフィルタボタンは「実際に画像が存在するカテゴリ」だけ表示されます。
// =============================================================================

export type GalleryCategory =
  | "snorkel"
  | "turtle"
  | "family"
  | "night"
  | "sup"
  | "sunset"
  | "boat"
  | "private"
  | "other"

export interface GalleryImage {
  /** 一意なID（重複不可） */
  id: string
  /** 画像パス（/images/... もしくは外部URL） */
  src: string
  /** カテゴリ（フィルタ・タグに使用） */
  category: GalleryCategory
  /** 表示タイトル（ライトボックス・オーバーレイに表示） */
  title: string
  /** alt属性（アクセシビリティ・SEO用） */
  alt: string
  /** トップページの Gallery セクションに出すなら true */
  featured?: boolean
  /** 表示順（昇順。小さいほど先頭） */
  order: number
  /** 関連プランID（任意。例: "S1" ウミガメシュノーケル, "S3" ナイトツアー） */
  planType?: string
}

/** カテゴリの表示用日本語ラベル */
export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, string> = {
  snorkel: "シュノーケル",
  turtle: "ウミガメ",
  family: "ファミリー",
  night: "ナイトツアー",
  sup: "SUP",
  sunset: "サンセット",
  boat: "ボート",
  private: "貸切",
  other: "その他",
}

/** フィルタボタンを並べる際の優先順（この順で、画像が存在するカテゴリのみ表示） */
const CATEGORY_DISPLAY_ORDER: GalleryCategory[] = [
  "snorkel",
  "turtle",
  "family",
  "night",
  "sup",
  "sunset",
  "boat",
  "private",
  "other",
]

// -----------------------------------------------------------------------------
// ギャラリー画像一覧
//   order 10〜90  : featured（トップページにも表示）
//   order 100〜   : ギャラリーページのみ
// -----------------------------------------------------------------------------
const GALLERY_IMAGE_SOURCE: GalleryImage[] = [
  // --- featured（トップページ Gallery セクション） ---
  {
    id: "feat-snorkel-hero",
    src: "/images/tours/snorkel/snorkel-01.webp",
    category: "turtle",
    title: "ウミガメとシュノーケリング",
    alt: "宮古島でウミガメと一緒に泳ぐシュノーケル体験",
    featured: true,
    order: 10,
    planType: "S1",
  },
  {
    id: "feat-ocean",
    src: "/images/dsc06632.jpeg",
    category: "snorkel",
    title: "宮古島の海",
    alt: "透き通る宮古島の青い海",
    featured: true,
    order: 20,
    planType: "S1",
  },
  {
    id: "feat-sunset-sup",
    src: "/images/sunset-sup-silhouettes.jpg",
    category: "sunset",
    title: "サンセットSUP",
    alt: "夕日をバックにしたSUPのシルエット",
    featured: true,
    order: 30,
    planType: "S4",
  },
  {
    id: "feat-night",
    src: "/images/night-tour-coconut-crab.jpg",
    category: "night",
    title: "ヤシガニとガイド",
    alt: "ナイトツアーで出会う巨大ヤシガニ",
    featured: true,
    order: 40,
    planType: "S3",
  },
  {
    id: "feat-turtle-closeup",
    src: "/images/s2-sea-turtle-closeup.jpg",
    category: "turtle",
    title: "ウミガメと接近",
    alt: "間近で出会うウミガメのクローズアップ",
    featured: true,
    order: 50,
    planType: "S1",
  },
  {
    id: "feat-coconut-crab",
    src: "/images/gallery-new-1.jpg",
    category: "night",
    title: "巨大ヤシガニ",
    alt: "ナイトツアーで見つけた巨大ヤシガニ",
    featured: true,
    order: 60,
    planType: "S3",
  },

  // --- ウミガメ・シュノーケル（記念写真含む） ---
  { id: "turtle-001", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230719-P7190430-kJtRINA4MIDkKCWZv2JYG4r8Y366iz.jpg", category: "turtle", title: "海亀と一緒にシュノーケリング", alt: "海亀と一緒にシュノーケリング", order: 100, planType: "S1" },
  { id: "turtle-002", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230719-P7190431-Ww3py8Wm9ogBMFhp0seUzqRhdypk9O.jpg", category: "turtle", title: "海亀との記念撮影", alt: "海亀との記念撮影", order: 110, planType: "S1" },
  { id: "snorkel-001", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230720-P7200982-szA4D8aLpo1Ea14m2Z9wGj4JB5QIF5.jpg", category: "snorkel", title: "宮古島の海中世界", alt: "宮古島の海中世界", order: 120, planType: "S1" },
  { id: "turtle-003", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230719-P7190902-lVDNsaCVNCsCFPT4CGV0d5pY8ji4gO.jpg", category: "turtle", title: "海亀との至近距離体験", alt: "海亀との至近距離体験", order: 130, planType: "S1" },
  { id: "turtle-004", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230719-P7190285-3hIWBTJtJPkFyHx2i5V5hkEKdwOOw4.jpg", category: "turtle", title: "カップルで海亀体験", alt: "カップルで海亀体験", order: 140, planType: "S1" },
  { id: "snorkel-002", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230717-P7170313-7ShB5QROdk2pVrtQa5cA4HnX6D9qs4.jpg", category: "snorkel", title: "クマノミとサンゴ礁", alt: "クマノミとサンゴ礁", order: 150, planType: "S1" },
  { id: "turtle-005", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230716-P7160026-2-xCLsoHvkrhlfCVXS4PSpECLPYQt3k3.jpg", category: "turtle", title: "海亀と泳ぐ夫婦", alt: "海亀と泳ぐ夫婦", order: 160, planType: "S1" },
  { id: "family-001", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230715-P7152056-xcHj0KyOIGTSiDrAZtgzoX87FtLw0i.jpg", category: "family", title: "グループで海亀体験", alt: "グループで海亀体験", order: 170, planType: "S1" },
  { id: "family-002", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230715-P7155003-vG2kkpVlckvEiOfvhxN4CUa57wWkuo.jpg", category: "family", title: "3人で海亀観察", alt: "3人で海亀観察", order: 180, planType: "S1" },
  { id: "turtle-006", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230715-P7152051-XKU6IhtQ1kFBajFNChMqu5PYvk01qw.jpg", category: "turtle", title: "友達と海亀シュノーケリング", alt: "友達と海亀シュノーケリング", order: 190, planType: "S1" },
  { id: "turtle-007", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230715-P7154995-Jp6QY7Raba0CudJdD3Ftr5lyOnpER8.jpg", category: "turtle", title: "海亀との平和な時間", alt: "海亀との平和な時間", order: 200, planType: "S1" },
  { id: "turtle-008", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230715-P7155093-CFKTIpWycIjirB47GqOhBzkjzfZXHq.jpg", category: "turtle", title: "海亀との記念撮影", alt: "海亀との記念撮影", order: 210, planType: "S1" },
  { id: "turtle-009", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230715-P7155085-I4OqgwLMbl8nAVpZYTMexyuM4b3F4x.jpg", category: "turtle", title: "海亀と一緒に泳ぐ", alt: "海亀と一緒に泳ぐ", order: 220, planType: "S1" },
  { id: "turtle-010", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230715-P7155109-AV7aDudPGSeu1zNjrkELPolQilHONa.jpg", category: "turtle", title: "海亀観察体験", alt: "海亀観察体験", order: 230, planType: "S1" },
  { id: "turtle-011", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230712-P7124427-eKTXAY68xDDfzfl326iBAdgNdm8gSq.jpg", category: "turtle", title: "海亀との感動的な出会い", alt: "海亀との感動的な出会い", order: 240, planType: "S1" },
  { id: "turtle-012", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230712-P7121543-ReS66RRi9OVaOzp3WKmy5XZbK5yJ58.jpg", category: "turtle", title: "友達と海亀記念撮影", alt: "友達と海亀記念撮影", order: 250, planType: "S1" },
  { id: "turtle-013", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230712-P7124413-v9HLhTc2KQ4I5uYL0EZe52EW1O96jU.jpg", category: "turtle", title: "海亀のクローズアップ", alt: "海亀のクローズアップ", order: 260, planType: "S1" },
  { id: "turtle-014", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230712-P7124428-SFFkwd5wZWHsGb0hXSwJwnoeAsV4YK.jpg", category: "turtle", title: "海亀との共泳体験", alt: "海亀との共泳体験", order: 270, planType: "S1" },
  { id: "turtle-015", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230712-P7124415-UYfQv7k6e5Hm6GkOsDHAXVcLLwEAaj.jpg", category: "turtle", title: "海亀と記念撮影", alt: "海亀と記念撮影", order: 280, planType: "S1" },
  { id: "turtle-016", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230712-P7124452-ZfQhhaCOaswwNIocEdJj5JTfEfisQf.jpg", category: "turtle", title: "海亀体験の喜び", alt: "海亀体験の喜び", order: 290, planType: "S1" },
  { id: "turtle-017", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230712-P7121544-9hBTBwX426xvuNHrPAHgcsDXqg8gLX.jpg", category: "turtle", title: "カップルで海亀体験", alt: "カップルで海亀体験", order: 300, planType: "S1" },

  // --- スタッフ・ガイド ---
  { id: "other-guide-001", src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/DSC06630.JPG-s6zKQo4DVkcMP4KFXSzSbTqVHYZyJy.jpeg", category: "other", title: "ガイドサービス", alt: "海亀兄弟のガイドサービス", order: 310 },
  { id: "other-staff-hikaru", src: "/hikaru-staff-photo.jpg", category: "other", title: "ひかる - やまちゃんの右腕", alt: "スタッフ ひかる", order: 320 },
  { id: "other-staff-souichiro", src: "/souichiro-staff-photo.jpg", category: "other", title: "そういちろう - ナイトツアー専門", alt: "スタッフ そういちろう", order: 330 },
  { id: "other-staff-nagi", src: "/nagi-staff-photo.jpg", category: "other", title: "凪", alt: "スタッフ 凪", order: 340 },

  // --- ナイトツアー ---
  { id: "night-001", src: "/images/gallery-night-tour-2.jpg", category: "night", title: "ヤシの葉の上のヤシガニ", alt: "ヤシの葉の上のヤシガニ", order: 400, planType: "S3" },
  { id: "night-002", src: "/images/gallery-night-tour-3.jpg", category: "night", title: "夜の森のクワガタ", alt: "夜の森のクワガタ", order: 410, planType: "S3" },
  { id: "night-003", src: "/images/gallery-night-tour-4.jpg", category: "night", title: "岩場のヤシガニ", alt: "岩場のヤシガニ", order: 420, planType: "S3" },
  { id: "night-004", src: "/images/gallery-night-tour-5.jpg", category: "night", title: "宮古島のオオヒキガエル", alt: "宮古島のオオヒキガエル", order: 430, planType: "S3" },
  { id: "night-005", src: "/images/gallery-night-tour-6.jpg", category: "night", title: "落ち葉の中のヤシガニ", alt: "落ち葉の中のヤシガニ", order: 440, planType: "S3" },
  { id: "night-006", src: "/images/gallery-nt-0052.jpg", category: "night", title: "カップルでヤシガニ発見", alt: "カップルでヤシガニ発見", order: 450, planType: "S3" },
  { id: "night-007", src: "/images/gallery-nt-9998.jpg", category: "night", title: "ヤモリを手のひらに", alt: "ヤモリを手のひらに", order: 460, planType: "S3" },
  { id: "night-008", src: "/images/gallery-nt-0232.jpg", category: "night", title: "親子でヤシガニ観察", alt: "親子でヤシガニ観察", order: 470, planType: "S3" },
  { id: "night-009", src: "/images/gallery-nt-7944.jpg", category: "night", title: "家族でヤシガニと記念撮影", alt: "家族でヤシガニと記念撮影", order: 480, planType: "S3" },
  { id: "night-010", src: "/images/gallery-nt-7908.jpg", category: "night", title: "ナイトツアーの探検風景", alt: "ナイトツアーの探検風景", order: 490, planType: "S3" },
  { id: "night-011", src: "/images/gallery-nt-7884.jpg", category: "night", title: "ヒキガエルとの出会い", alt: "ヒキガエルとの出会い", order: 500, planType: "S3" },
  { id: "night-012", src: "/images/gallery-nt-7890.jpg", category: "night", title: "ナナフシを発見", alt: "ナナフシを発見", order: 510, planType: "S3" },
  { id: "night-013", src: "/images/gallery-nt-0263.jpg", category: "night", title: "巨大ヤシガニの迫力", alt: "巨大ヤシガニの迫力", order: 520, planType: "S3" },
  { id: "night-014", src: "/images/gallery-nt-9317.jpg", category: "night", title: "家族でヤシガニと記念写真", alt: "家族でヤシガニと記念写真", order: 530, planType: "S3" },
  { id: "night-015", src: "/images/gallery-nt-9301.jpg", category: "night", title: "少年とヤシガニの冒険", alt: "少年とヤシガニの冒険", order: 540, planType: "S3" },

  // --- AI編集フォルダから追加（2026-05 厳選30枚／WebP化） ---
  { id: "turtle-101", src: "/images/gallery/turtle/turtle-101.webp", category: "turtle", title: "ウミガメ・シュノーケラー・水中写真", alt: "ウミガメ・シュノーケラー・水中写真 - 宮古島ウミガメシュノーケルツアー", order: 600, planType: "S1" },
  { id: "turtle-102", src: "/images/gallery/turtle/turtle-102.webp", category: "turtle", title: "ウミガメ・太陽光・ワイド写真", alt: "ウミガメ・太陽光・ワイド写真 - 宮古島ウミガメシュノーケルツアー", order: 610, planType: "S1" },
  { id: "turtle-103", src: "/images/gallery/turtle/turtle-103.webp", category: "turtle", title: "ウミガメ・水面下・シュノーケラー", alt: "ウミガメ・水面下・シュノーケラー - 宮古島ウミガメシュノーケルツアー", featured: true, order: 70, planType: "S1" },
  { id: "turtle-104", src: "/images/gallery/turtle/turtle-104.webp", category: "turtle", title: "ウミガメ・透明な海・水中写真", alt: "ウミガメ・透明な海・水中写真 - 宮古島ウミガメシュノーケルツアー", order: 630, planType: "S1" },
  { id: "turtle-105", src: "/images/gallery/turtle/turtle-105.webp", category: "turtle", title: "ウミガメ・遊泳・水中写真", alt: "ウミガメ・遊泳・水中写真 - 宮古島ウミガメシュノーケルツアー", order: 640, planType: "S1" },
  { id: "turtle-106", src: "/images/gallery/turtle/turtle-106.webp", category: "turtle", title: "ウミガメとサンゴ礁・接近写真", alt: "ウミガメとサンゴ礁・接近写真 - 宮古島ウミガメシュノーケルツアー", order: 650, planType: "S1" },
  { id: "turtle-107", src: "/images/gallery/turtle/turtle-107.webp", category: "turtle", title: "ウミガメとシュノーケラー・サンゴ礁写真", alt: "ウミガメとシュノーケラー・サンゴ礁写真 - 宮古島ウミガメシュノーケルツアー", order: 660, planType: "S1" },
  { id: "turtle-108", src: "/images/gallery/turtle/turtle-108.webp", category: "turtle", title: "ウミガメとシュノーケラー横姿", alt: "ウミガメとシュノーケラー横姿 - 宮古島ウミガメシュノーケルツアー", order: 670, planType: "S1" },
  { id: "turtle-109", src: "/images/gallery/turtle/turtle-109.webp", category: "turtle", title: "ウミガメと二人のシュノーケラー", alt: "ウミガメと二人のシュノーケラー - 宮古島ウミガメシュノーケルツアー", order: 680, planType: "S1" },
  { id: "turtle-110", src: "/images/gallery/turtle/turtle-110.webp", category: "turtle", title: "ウミガメと水面のシュノーケラー", alt: "ウミガメと水面のシュノーケラー - 宮古島ウミガメシュノーケルツアー", order: 690, planType: "S1" },
  { id: "turtle-111", src: "/images/gallery/turtle/turtle-111.webp", category: "turtle", title: "ウミガメ接近・シュノーケラー写真", alt: "ウミガメ接近・シュノーケラー写真 - 宮古島ウミガメシュノーケルツアー", order: 700, planType: "S1" },
  { id: "turtle-112", src: "/images/gallery/turtle/turtle-112.webp", category: "turtle", title: "ウミガメ接近と二人", alt: "ウミガメ接近と二人 - 宮古島ウミガメシュノーケルツアー", order: 710, planType: "S1" },
  { id: "turtle-113", src: "/images/gallery/turtle/turtle-113.webp", category: "turtle", title: "ウミガメ横姿・グループ写真", alt: "ウミガメ横姿・グループ写真 - 宮古島ウミガメシュノーケルツアー", order: 720, planType: "S1" },
  { id: "turtle-114", src: "/images/gallery/turtle/turtle-114.webp", category: "turtle", title: "ウミガメ正面・シュノーケラー写真", alt: "ウミガメ正面・シュノーケラー写真 - 宮古島ウミガメシュノーケルツアー", order: 730, planType: "S1" },
  { id: "turtle-115", src: "/images/gallery/turtle/turtle-115.webp", category: "turtle", title: "ウミガメ正面とグループ", alt: "ウミガメ正面とグループ - 宮古島ウミガメシュノーケルツアー", order: 740, planType: "S1" },
  { id: "turtle-116", src: "/images/gallery/turtle/turtle-116.webp", category: "turtle", title: "ウミガメ目線の水面写真", alt: "ウミガメ目線の水面写真 - 宮古島ウミガメシュノーケルツアー", order: 750, planType: "S1" },
  { id: "turtle-117", src: "/images/gallery/turtle/turtle-117.webp", category: "turtle", title: "ウミガメ遊泳・サンゴ礁写真", alt: "ウミガメ遊泳・サンゴ礁写真 - 宮古島ウミガメシュノーケルツアー", order: 760, planType: "S1" },
  { id: "turtle-118", src: "/images/gallery/turtle/turtle-118.webp", category: "turtle", title: "ウミガメ・サンゴ礁・接近写真", alt: "ウミガメ・サンゴ礁・接近写真 - 宮古島ウミガメシュノーケルツアー", order: 770, planType: "S1" },
  { id: "turtle-119", src: "/images/gallery/turtle/turtle-119.webp", category: "turtle", title: "ウミガメ横姿・サンゴ礁写真", alt: "ウミガメ横姿・サンゴ礁写真 - 宮古島ウミガメシュノーケルツアー", order: 780, planType: "S1" },
  { id: "snorkel-101", src: "/images/gallery/snorkel/snorkel-101.webp", category: "snorkel", title: "イソギンチャク礁・ワイド写真", alt: "イソギンチャク礁・ワイド写真 - 宮古島ウミガメシュノーケルツアー", order: 790, planType: "S1" },
  { id: "snorkel-102", src: "/images/gallery/snorkel/snorkel-102.webp", category: "snorkel", title: "カクレクマノミ・サンゴ礁と二人・別カット", alt: "カクレクマノミ・サンゴ礁と二人・別カット - 宮古島ウミガメシュノーケルツアー", order: 800, planType: "S1" },
  { id: "snorkel-103", src: "/images/gallery/snorkel/snorkel-103.webp", category: "snorkel", title: "カクレクマノミと水中ペア", alt: "カクレクマノミと水中ペア - 宮古島ウミガメシュノーケルツアー", order: 810, planType: "S1" },
  { id: "snorkel-104", src: "/images/gallery/snorkel/snorkel-104.webp", category: "snorkel", title: "サンゴ礁・海底風景写真・別カット", alt: "サンゴ礁・海底風景写真・別カット - 宮古島ウミガメシュノーケルツアー", order: 820, planType: "S1" },
  { id: "snorkel-105", src: "/images/gallery/snorkel/snorkel-105.webp", category: "snorkel", title: "サンゴ礁・海底風景写真・追加カット", alt: "サンゴ礁・海底風景写真・追加カット - 宮古島ウミガメシュノーケルツアー", order: 830, planType: "S1" },
  { id: "snorkel-106", src: "/images/gallery/snorkel/snorkel-106.webp", category: "snorkel", title: "透明な浅瀬に浮かぶ人", alt: "透明な浅瀬に浮かぶ人 - 宮古島ウミガメシュノーケルツアー", featured: true, order: 80, planType: "S1" },
  { id: "snorkel-107", src: "/images/gallery/snorkel/snorkel-107.webp", category: "snorkel", title: "透明な海・サンゴ礁・海底写真", alt: "透明な海・サンゴ礁・海底写真 - 宮古島ウミガメシュノーケルツアー", order: 850, planType: "S1" },
  { id: "snorkel-108", src: "/images/gallery/snorkel/snorkel-108.webp", category: "snorkel", title: "透明な海・サンゴ礁・風景写真", alt: "透明な海・サンゴ礁・風景写真 - 宮古島ウミガメシュノーケルツアー", order: 860, planType: "S1" },
  { id: "family-101", src: "/images/gallery/family/family-101.webp", category: "family", title: "ビーチ家族集合近景", alt: "ビーチ家族集合近景 - 宮古島ウミガメシュノーケルツアー", order: 870, planType: "S1" },
  { id: "family-102", src: "/images/gallery/family/family-102.webp", category: "family", title: "三人シュノーケラー・手振り・別カット", alt: "三人シュノーケラー・手振り・別カット - 宮古島ウミガメシュノーケルツアー", order: 880, planType: "S1" },
  { id: "family-103", src: "/images/gallery/family/family-103.webp", category: "family", title: "浅瀬・グループ・マリン体験", alt: "浅瀬・グループ・マリン体験 - 宮古島ウミガメシュノーケルツアー", featured: true, order: 90, planType: "S1" },
]

/** 全ギャラリー画像（order 昇順でソート済み） */
export const galleryImages: GalleryImage[] = [...GALLERY_IMAGE_SOURCE].sort(
  (a, b) => a.order - b.order,
)

/** トップページ Gallery セクション用（featured のみ、order 昇順） */
export function getFeaturedGalleryImages(): GalleryImage[] {
  return galleryImages.filter((img) => img.featured)
}

/** 実際に画像が存在するカテゴリのみを表示順で返す（フィルタボタン用） */
export function getGalleryCategories(): GalleryCategory[] {
  const present = new Set(galleryImages.map((img) => img.category))
  return CATEGORY_DISPLAY_ORDER.filter((cat) => present.has(cat))
}
