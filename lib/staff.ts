// ============================================================
// スタッフ情報の単一ソース（Single Source of Truth）
// ------------------------------------------------------------
// /staff のカード(staff-grid)・トップのOur Team(home/staff-section)・
// 構造化データ(json-ld 経由の data.ts STAFFS) が全てここを参照する。
// スタッフを増減するときは、この配列だけを編集すれば3箇所に反映される。
//
// ※ lucide アイコン等のUI依存は持たない純データ（サーバー側からも安全に import 可能）。
// ============================================================

export interface StaffMember {
  id: string
  name: string
  role: string
  /** 役割バッジの色（Tailwind クラス） */
  badgeColor: string
  image: string
  /** 写真のフォーカス位置（object-position） */
  objectPosition: string
  /** カードの一言キャッチ */
  catchphrase: string
  /** /staff カード用の紹介文（長め） */
  description: string
  /** トップ Our Team 用の紹介文（短め） */
  shortDescription: string
  /** /staff カードの強み箇条書き */
  details: string[]
  /** 担当ツアー */
  tours: string[]
}

export const STAFF_MEMBERS: StaffMember[] = [
  {
    id: "yamachan",
    name: "やまちゃん",
    role: "現場責任者",
    badgeColor: "bg-emerald-500",
    image: "/yamachan-staff-photo.jpg",
    objectPosition: "center 20%",
    catchphrase: "安全に、楽しく、最高の思い出を。",
    description: "宮古島の海を知り尽くした頼れるリーダー。安全第一で楽しい海の時間をお約束します。",
    shortDescription: "宮古島の海を知り尽くした頼れるリーダー",
    details: [
      "宮古島在住歴10年以上",
      "安全管理のプロフェッショナル",
      "お子様からシニアまで丁寧に対応",
      "海況判断のエキスパート",
    ],
    tours: ["ウミガメシュノーケル", "【貸切】ウミガメシュノーケルツアー"],
  },
  {
    id: "hikaru",
    name: "ひかる",
    role: "やまちゃんの右腕",
    badgeColor: "bg-blue-500",
    image: "/hikaru-staff-photo.jpg",
    objectPosition: "center 30%",
    catchphrase: "海の生き物の魅力、伝えます！",
    description: "海の生き物が大好きな優しいガイド。初心者やお子さまも安心してお任せください。",
    shortDescription: "海の生き物が大好きな優しいガイド",
    details: [
      "海洋生物の知識が豊富",
      "初心者対応の名手",
      "写真撮影のセンス抜群",
      "穏やかで安心感のある接客",
    ],
    tours: ["ウミガメシュノーケル", "【貸切】ウミガメシュノーケルツアー"],
  },
  {
    id: "sotaro",
    name: "そうたろう",
    role: "ツアーガイド",
    badgeColor: "bg-amber-500",
    image: "/img-2102-staff-photo.jpg",
    objectPosition: "center center",
    catchphrase: "宮古島の自然を、丁寧にご案内します。",
    description: "明るく丁寧なサポートで、初めての方にも安心して楽しんでいただけるようご案内します。",
    shortDescription: "初めての方に寄り添うガイド",
    details: [
      "初めての方にもわかりやすく案内",
      "安全確認を大切にしたサポート",
      "自然を楽しむ時間づくりが得意",
      "写真撮影も丁寧にサポート",
    ],
    tours: ["ウミガメシュノーケル", "【貸切】ウミガメシュノーケルツアー"],
  },
  {
    id: "souichiro",
    name: "そういちろう",
    role: "ナイトツアー専門",
    badgeColor: "bg-purple-500",
    image: "/images/night-tour-coconut-crab.jpg",
    objectPosition: "center center",
    catchphrase: "夜の宮古島、冒険しよう。",
    description: "アマゾン帰りの冒険家。夜のジャングルのスペシャリストとして、ワクワクする生き物探しをご案内。",
    shortDescription: "夜の冒険のスペシャリスト",
    details: [
      "アマゾン探検の経験あり",
      "夜行性生物のエキスパート",
      "子どもを夢中にさせるトーク力",
      "安全な夜間ガイドの技術",
    ],
    tours: ["本格ナイトツアー", "貸切ナイトツアー"],
  },
  {
    id: "nagi",
    name: "凪",
    role: "ドローンパイロット",
    badgeColor: "bg-sky-500",
    image: "/nagi-staff-photo.jpg",
    objectPosition: "center center",
    catchphrase: "空から見る宮古島、最高ですよ。",
    description: "国家資格を持つドローンパイロット。空からの美しい映像であなたの思い出を特別な一枚に。",
    shortDescription: "空からの絶景を記録するプロ",
    details: [
      "ドローン国家資格保持",
      "空撮映像のプロフェッショナル",
      "SNS映え間違いなしの撮影技術",
      "サンセットSUPの撮影担当",
    ],
    tours: ["サンセットSUP"],
  },
  {
    id: "mana",
    name: "まなちゃん",
    role: "宮古島出身ガイド",
    badgeColor: "bg-rose-500",
    image: "/mana-staff-photo.jpg",
    objectPosition: "center 30%",
    catchphrase: "地元目線で、宮古島の海をご案内します！",
    description: "宮古島出身、身長147cmの小柄で明るいガイド。地元ならではの目線で宮古島の海を楽しくご案内します。女性やお子さま連れの方も安心してお任せください。",
    shortDescription: "地元目線で案内する小柄で明るいガイド",
    details: [
      "宮古島出身の地元ガイド",
      "身長147cm・小柄で親しみやすい",
      "女性・お子さま連れも安心",
      "明るく元気なご案内",
    ],
    tours: ["ウミガメシュノーケル", "本格ナイトツアー"],
  },
]
