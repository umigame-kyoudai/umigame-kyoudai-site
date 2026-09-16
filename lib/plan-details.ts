import { getBookingPolicyCopy } from "@/lib/booking-policy-copy"


import { PLAN_COVER_IMAGE, TOUR_IMAGE_PATHS } from "@/lib/tour-assets"
import { SNORKEL_BEACHES } from "@/lib/beach-info"
import { getPlanMaxParticipants } from "@/lib/booking-rules"
import { COMBO_COMPONENT_PLAN_IDS, COMBO_NIGHT_TIMES, COMBO_TURTLE_TIMES, DAY_SUP_TIMES, NIGHT_TOUR_TIMES, getParticipantAgeRange, getPlanAgeLabel } from "@/lib/plan-flags"
import { PLAN_PRICE_DATA, getComboSavings } from "@/lib/plan-price-display"
import { getCustomerDurationDetailLabel, getCustomerDurationLabel, getCustomerSegmentDurationLabel } from "@/lib/plan-durations"
import { getPlanRentalOptions } from "@/lib/rental-options"

const policyCopy = getBookingPolicyCopy()

const formatYen = (amount: number): string => `¥${amount.toLocaleString("ja-JP")}`
const planPrice = (planId: string, child = false): string => {
  const plan = PLAN_PRICE_DATA[planId]
  return formatYen(child ? plan.childPrice ?? plan.price : plan.price)
}
const regularComboChildPrice = (planId: string): string => formatYen(
  COMBO_COMPONENT_PLAN_IDS[planId].reduce((sum, id) => sum + (PLAN_PRICE_DATA[id].childPrice ?? PLAN_PRICE_DATA[id].price), 0),
)
const regularComboPrice = (planId: string): string => formatYen(getComboSavings(planId)!.regularPrice)
const comboSaving = (planId: string): string => `${getComboSavings(planId)!.savings.toLocaleString("ja-JP")}円`
const nightTimes = NIGHT_TOUR_TIMES.join(" / ")
const comboNightTimes = COMBO_NIGHT_TIMES.join(" / ")
const comboTurtleTimes = COMBO_TURTLE_TIMES.map((time) => time.replace(/^0/, "")).join(" / ")
function formatStartTimeChoices(times: string[]): string {
  const labels = times.map((time) => time.replace(/^0/, ""))
  const minutes = times.map((time) => {
    const [hours, minute] = time.split(":").map(Number)
    return hours * 60 + minute
  })
  const interval = minutes[1] - minutes[0]
  if (times.length > 2 && interval > 0 && minutes.slice(1).every((minute, index) => minute - minutes[index] === interval)) {
    const intervalLabel = interval % 60 === 0 ? `${interval / 60}時間` : `${interval}分`
    return `${labels[0]}〜${labels[labels.length - 1]}（${intervalLabel}おき）`
  }
  return labels.join(" / ")
}
const daySupTimes = formatStartTimeChoices(DAY_SUP_TIMES)

// レンタルの有無・料金・大人用限定は、予約時の計算と同じ正本から表示する。
const includedRentals = (planId: string): string[] =>
  getPlanRentalOptions(planId).filter((option) => option.price === 0).map((option) => option.name)
const paidRentals = (planId: string): string[] =>
  getPlanRentalOptions(planId).filter((option) => option.price > 0).map((option) =>
    `${option.name.replace(/（.*）$/, "")}（${formatYen(option.price)}${option.adultOnly ? "・大人用のみ" : ""}）`,
  )
const rentalOptions = (planId: string, suffix = "", mentionPrivate = false): NonNullable<PlanDetail["options"]> =>
  getPlanRentalOptions(planId).map((option) => ({
    name: `${option.name.replace(/（.*）$/, "")}${suffix}`,
    price: option.price === 0 ? "無料" : formatYen(option.price),
    note: option.adultOnly
      ? `大人用のみ・子供用なし${mentionPrivate ? "（貸切プランなら無料）" : ""}`
      : mentionPrivate ? "貸切プランなら無料" : undefined,
  }))

export interface PlanDetail {
  id: string
  brand?: "umigame-kyodai" | string
  status?: "active" | "coming_soon"
  name: string
  tagline: string
  heroDescription: string
  image: string
  images?: readonly string[]
  heroVideo?: string
  color: string // theme color class
  gradientFrom: string
  gradientTo: string
  price: string
  priceNote: string
  childPrice?: string
  duration: string
  age: string
  highlights: { title: string; description: string; icon: string }[]
  flow: { step: number; title: string; description: string; time?: string }[]
  included: string[]
  notIncluded?: string[]
  whatToBring: string[]
  precautions: string[]
  options?: { name: string; price: string; note?: string }[]
  location: string
  locationNote?: string
  meetingPoint?: {
    name: string
    mapUrl: string
    embedUrl?: string
  }
  meetingTime: string
  paymentMethod: string
  faqs: { q: string; a: string }[]
  locations?: {
    name: string
    encounterRate: number
    parking: string
    toilet: boolean
    shower: boolean
    note?: string
  }[]
}

export const PLAN_DETAILS: Record<string, PlanDetail> = {
  S1: {
    id: "S1",
    name: "ウミガメと泳ぐシュノーケルツアー",
    tagline: "安全管理を徹底した少人数制。宮古島一番人気のツアー",
    heroDescription: "透き通る宮古島の海で、ウミガメと一緒に泳ぐ感動体験。安全管理を徹底した少人数制だから初心者もお子様も安心。高画質の写真・動画は全て無料プレゼント！",
    image: PLAN_COVER_IMAGE.snorkel,
    images: TOUR_IMAGE_PATHS.snorkel,
    color: "emerald",
    gradientFrom: "from-emerald-600",
    gradientTo: "to-cyan-500",
    price: planPrice("S1"),
    priceNote: "大人1名あたり",
    childPrice: `${planPrice("S1", true)}（子供）`,
    duration: getCustomerDurationDetailLabel("S1"),
    age: getPlanAgeLabel("S1"),
    highlights: [
      { title: "安全管理の徹底", description: "安全講習・保険加入は当然。少人数制でスタッフの目が全員に行き届き、浅瀬のポイントを選定。ライフジャケット・浮き輪完備で、泳ぎが苦手な方も安心です。", icon: "shield" },
      { title: "写真・動画すべて無料", description: "Ace Pro 2の高画質カメラでプロ級の写真・動画を撮影。枚数制限なしで全データ無料プレゼント。SNS映え間違いなし！", icon: "camera" },
      { title: "少人数制で安心", description: "基本的に少人数制で実施。スタッフの目が全員に行き届くから、初心者やお子様連れでも安心して楽しめます。", icon: "users" },
      { title: "浅瀬だから怖くない", description: "実施海岸はかなり浅く、潮の満ち引きによっては足がつく深さに。ライフジャケット着用で沈む心配もなし。浮き輪も常備しています。", icon: "shield" },
    ],
    flow: [
      { step: 1, title: "集合・受付", description: "催行海岸にて現地集合。ガイドがお出迎えし、注意事項やツアーの流れを説明します。", time: "開始15分前" },
      { step: 2, title: "器材準備・レクチャー", description: "おしゃれな器材をお貸出し。お客様のほとんどが初めてなので、丁寧にレクチャーいたします。" },
      { step: 3, title: "シュノーケリング体験", description: "いよいよ海へ！ウミガメやクマノミ、熱帯魚たちと一緒に泳ぎます。写真撮影のリクエストもお気軽に。", time: "約1時間" },
      { step: 4, title: "お会計・解散", description: "ツアー終了後、現地でお会計。撮影データは当日中にお渡しします。" },
    ],
    included: ["シュノーケル器材一式", "ライフジャケット", "浮き輪", "写真・動画データ（枚数無制限）", "保険", "安全講習"],
    notIncluded: paidRentals("S1"),
    whatToBring: ["着替え", "タオル", "日焼け止め", "飲み物", "サンダル（推奨）"],
    precautions: [policyCopy.pregnancyNotice, "持病・健康上の不安がある方は必ず予約前にご相談ください。内容を確認したうえで参加可否をご案内します。", "飲酒されている方は参加不可", "お体に不自由がある場合は必ず事前にご相談ください"],
    options: rentalOptions("S1", "", true),
    location: "新城海岸・シギラビーチ・東平安名ビーチ・ワイワイビーチなど",
    locationNote: "当日の風向き・波・潮位などを確認し、安全に楽しめるビーチを選んで開催します。最終的な集合場所は前日にLINEでご案内します。",
    meetingTime: "開始時刻の15分前",
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）`,
    faqs: [
      { q: "本当にウミガメに会えますか？", a: "宮古島の海を知り尽くしたガイドが、ウミガメに高確率で会えるポイント・時間帯を熟知しています。ただし自然相手のため、海況やポイントによっては会えない場合もございます。会えなかった場合も美しいサンゴ礁や熱帯魚をお楽しみいただけます。" },
      { q: "泳げなくても大丈夫？", a: "全く問題ありません。ライフジャケットを着用するので沈む心配はなく、浮き輪も常備しています。浅瀬での実施なので足がつく場所もあり、泳ぎに自信がない方でも安心です。" },
      { q: "子供は何歳から参加できますか？", a: `${getParticipantAgeRange("S1", "child")!.min}歳から参加可能です。少人数制でスタッフの目が行き届くため、お子様連れのご家族にも大人気です。お子様用の器材もご用意しています。` },
      { q: "写真データはいつもらえますか？", a: "基本的に当日中にお渡しします。繁忙期はお時間をいただく場合がございます。LINEで高画質データをお送りします。" },
      { q: "雨でも開催しますか？", a: `小雨程度なら開催します。海の中に入れば雨は気になりません。台風や強風など安全が確保できない場合は中止とします。${policyCopy.weatherNotice}お支払いは${policyCopy.paymentSummary}です。${policyCopy.prepaymentNotice} ${policyCopy.setPaymentNotice}` },
    ],
    locations: SNORKEL_BEACHES,
  },
  S2: {
    id: "S2",
    name: "【貸切】ウミガメシュノーケルツアー",
    tagline: "人気のウミガメシュノーケルを完全貸切で。専属ガイドで安心。",
    heroDescription: "一番人気のウミガメシュノーケルツアーを、1組限定で完全貸切。専属ガイドが付きっきりだから、お子様や泳ぎが苦手な方も絶対安心。他のお客様を気にせず自分たちだけのペースで楽しめます。",
    image: PLAN_COVER_IMAGE.snorkelPrivate,
    images: TOUR_IMAGE_PATHS.snorkel,
    color: "purple",
    gradientFrom: "from-purple-600",
    gradientTo: "to-indigo-500",
    price: planPrice("S2"),
    priceNote: `1名あたり（最大${getPlanMaxParticipants("S2")}名）`,
    duration: getCustomerDurationDetailLabel("S2"),
    age: getPlanAgeLabel("S2"),
    highlights: [
      { title: "ウミガメシュノーケルを貸切で", description: "一番人気のウミガメシュノーケルツアーを、1組限定の完全貸切で。他のお客様を気にせず、安全管理も万全の環境でゆっくり楽しめます。", icon: "turtle" },
      { title: "完全貸切・専属ガイド", description: "お客様専属のガイドが付きっきり。「子供がぐずらないか心配」「泳ぐのが遅くて迷惑をかけないか不安」という方に大好評！海に入るタイミングも休憩も自由自在。", icon: "crown" },
      { title: "こだわりの撮影", description: "貸切だからこそ実現する、こだわりのアングルでの写真撮影。「こういう写真が撮りたい！」というリクエストにもお応えします。", icon: "camera" },
      { title: "自由自在なペース", description: "海に入るタイミングも休憩も、すべてお客様のペース。初めての方にこそおすすめのプランです。", icon: "clock" },
    ],
    flow: [
      { step: 1, title: "集合・受付", description: "催行海岸にて現地集合。お客様専属のガイドがお出迎えし、ツアーの流れをご説明。", time: "開始15分前" },
      { step: 2, title: "マンツーマンレクチャー", description: "他のお客様を待つ必要なし。お客様のペースに合わせて丁寧にレクチャーいたします。" },
      { step: 3, title: "貸切シュノーケリング", description: "完全プライベートの海でウミガメと泳ぐ！こだわりのアングルで特別な写真・動画を撮影。", time: "約1時間" },
      { step: 4, title: "お会計・解散", description: "お会計後、解散。撮影データは当日中にお渡しします。" },
    ],
    included: ["シュノーケル器材一式", "ライフジャケット", "浮き輪", ...includedRentals("S2"), "写真・動画データ（枚数無制限）", "保険", "専属ガイド"],
    whatToBring: ["着替え", "タオル", "日焼け止め", "飲み物", "サンダル（推奨）"],
    precautions: [policyCopy.pregnancyNotice, "持病・健康上の不安がある方は必ず予約前にご相談ください。内容を確認したうえで参加可否をご案内します。", "飲酒されている方は参加不可", "お体に不自由がある場合は必ず事前にご相談ください", `${getPlanMaxParticipants("S2")! + 1}名以上はLINEよりご相談ください`],
    location: "新城海岸・シギラビーチ・東平安名ビーチ・ワイワイビーチなど",
    locationNote: "当日の風向き・波・潮位などを確認し、安全に楽しめるビーチを選んで開催します。最終的な集合場所は前日にLINEでご案内します。",
    meetingTime: "開始時刻の15分前",
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）`,
    faqs: [
      { q: "何名まで参加できますか？", a: `最大${getPlanMaxParticipants("S2")}名まで参加可能です。${getPlanMaxParticipants("S2")! + 1}名以上の場合はLINEでご相談ください。別途対応いたします。` },
      { q: "通常プランとの違いは？", a: "完全貸切なのでご自身のペースで楽しめます。さらにウェットスーツ・度付きマスク（大人用のみ）が無料、こだわりの撮影リクエストにもお応えできます。" },
      { q: "カップルでも利用できますか？", a: "もちろんです！カップルでのご利用も大人気。プライベートな空間で特別な思い出をお作りいただけます。" },
    ],
    locations: SNORKEL_BEACHES,
  },
  S3: {
    id: "S3",
    name: "本格ナイトツアー",
    tagline: "アマゾン帰りの男と行く、夜の大冒険",
    heroDescription: "懐中電灯を持って夜のジャングルへ！巨大ヤシガニや夜行性の生き物を探す冒険ツアー。0歳から参加OK。60歳以上の方を含むグループは【貸切】本格ナイトツアーをご予約ください。",
    image: PLAN_COVER_IMAGE.night,
    images: TOUR_IMAGE_PATHS.night,
    color: "indigo",
    gradientFrom: "from-indigo-700",
    gradientTo: "to-purple-900",
    price: planPrice("S3"),
    priceNote: "一律料金（3歳以下無料）",
    duration: getCustomerDurationDetailLabel("S3"),
    age: getPlanAgeLabel("S3"),
    highlights: [
      { title: "0歳から参加OK", description: "3歳以下は無料！お子様の夏の自由研究にもぴったりです。60歳以上の方を含むグループは【貸切】本格ナイトツアーをご予約ください。", icon: "baby" },
      { title: "巨大ヤシガニに遭遇", description: "絶滅危惧種に指定されている巨大なヤシガニに遭遇できるかも！他にも夜にしか見られない珍しい植物や生き物たちがたくさん。", icon: "bug" },
      { title: "夜行性の生き物たち", description: "ヤシガニのほか、オカヤドカリや珍しい夜の生き物に出会えるかも。昼間は見られない宮古島の夜の住人を観察できます。", icon: "bug" },
      { title: "本格派ガイド", description: "アマゾン帰りの経験豊富なガイドが、その日一番生き物に出会えそうなポイントへご案内。ワクワクの解説付き！", icon: "compass" },
    ],
    flow: [
      { step: 1, title: "集合・受付", description: "開催場所にて現地集合。ガイドがお出迎えし、注意事項や生き物を探すコツを説明します。", time: `${nightTimes}` },
      { step: 2, title: "探検準備", description: "専用の懐中電灯などをお貸出し。ワクワクの夜のジャングルへ出発準備！" },
      { step: 3, title: "ナイトサファリ", description: "絶滅危惧種の巨大ヤシガニなどの生き物を探しながら夜の亜熱帯を探検！", time: getCustomerDurationLabel("S3") },
      { step: 4, title: "お会計・解散", description: "お会計後、解散。探検中の写真データも無料でお渡しします。" },
    ],
    included: ["懐中電灯", "ガイド同行", "写真データ", "保険"],
    whatToBring: ["歩きやすい靴（サンダルでも参加可能ですが、歩きやすい靴をおすすめします）", "虫よけスプレー", "飲み物", "懐中電灯（貸出あり）"],
    precautions: [policyCopy.pregnancyNotice, "持病・健康上の不安がある方は必ず予約前にご相談ください。内容を確認したうえで参加可否をご案内します。", "お体に不自由がある場合は必ず事前にご相談ください", "23:20便は翌日0:50頃の解散予定です"],
    location: "インギャーマリンガーデン付近・上比屋山遺跡など（集合場所は当日LINEにてご案内）",
    meetingTime: `開始時間と同じ（${nightTimes}）`,
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）`,
    faqs: [
      { q: "赤ちゃん連れでも大丈夫ですか？", a: "はい！0歳から参加OK、3歳以下は無料です。抱っこ紐やベビーカーでのご参加も問題ありません。" },
      { q: "虫が苦手でも楽しめますか？", a: "虫を触る必要はありませんのでご安心ください。観察を楽しむスタイルです。虫よけスプレーを持参いただくと快適です。" },
      { q: "どんな生き物に会えますか？", a: "巨大ヤシガニ、オカヤドカリ、ナイトバタフライ、夜行性のトカゲなど、宮古島ならではの生き物に出会えます。季節によって会える生き物が変わるのも魅力です。" },
      { q: "開催場所はどこですか？", a: "当日の天候や気温で生き物の出やすい場所が変わるため、集合場所は当日にLINEでご案内します。その日いちばん生き物に会えそうなポイントをガイドが選定します（海のツアーは前日のご案内です）。" },
    ],
  },
  S4: {
    id: "S4",
    name: "【貸切】サンセットSUP",
    tagline: "1組貸切だけの特別な夕日。ドローン空撮付きで黄金の海を残す。",
    heroDescription: "1組貸切だから叶う、完全プライベートのサンセット体験。他のお客様を気にせず、海の上から眺める夕日のグラデーションを独り占め。ドローン空撮付きで、夕日に染まる海に浮かぶ姿を上空からも残せます。初心者でも安定のボードで安心。エモーショナルなシルエット写真が大人気！",
    image: PLAN_COVER_IMAGE.sup,
    images: TOUR_IMAGE_PATHS.sup,
    color: "orange",
    gradientFrom: "from-orange-500",
    gradientTo: "to-pink-500",
    price: planPrice("S4"),
    priceNote: "大人1名あたり",
    childPrice: `${planPrice("S4", true)}（子供）`,
    duration: getCustomerDurationDetailLabel("S4"),
    age: getPlanAgeLabel("S4"),
    highlights: [
      { title: "ドローン撮影付き", description: "夕日に染まる海に浮かぶ姿を上空から撮影。手持ちのカメラでは残せない、マジックアワーの絶景カットが手に入ります。", icon: "camera" },
      { title: "1組貸切の特別感", description: "お客様のグループだけの完全プライベート。他のお客様がいない海で、夕日を独り占めできます。特別な日の思い出にぴったりです。", icon: "crown" },
      { title: "初心者でも安心", description: "安定感抜群の大きめのボードを使用。ガイドが波の穏やかなポイントを選んで丁寧にレクチャーします。座ったままでもOK！", icon: "lifebuoy" },
      { title: "シルエット写真が映える", description: "夕日をバックにしたシルエット写真は、このツアーでしか撮れない特別な一枚。写真にこだわりのあるガイドが撮影します。", icon: "sparkles" },
      { title: "究極の癒し体験", description: "波の音を聞きながら、SUPボードの上で寝転んだり座ったり。日常を忘れる究極のリラックスタイムをお約束。", icon: "heart" },
    ],
    flow: [
      { step: 1, title: "集合・受付", description: "催行地にて現地集合。集合はその日の日没の約90分前です（8月なら17:45頃）。正確な時間と集合場所は前日にLINEでご案内します。", time: "日没の約90分前" },
      { step: 2, title: "陸上レクチャー", description: "SUPの漕ぎ方や乗り方を陸上でしっかり丁寧にレクチャー。初めての方も安心です。" },
      { step: 3, title: "海上SUP＆夕日鑑賞＆ドローン撮影", description: "海へ出発！夕日を浴びながらのんびり海上散歩。絶景をバックに手持ち撮影とドローン空撮を行います。", time: getCustomerDurationLabel("S4") },
      { step: 4, title: "お会計・解散", description: "マジックアワーの余韻に浸りながらお会計。撮影データは当日中にお渡し。", time: "日没の約30分後" },
    ],
    included: ["SUPボード", "パドル", "ライフジャケット", ...includedRentals("S4"), "ドローン撮影", "写真・動画データ（枚数無制限）", "保険", "陸上レクチャー", "専属ガイド"],
    whatToBring: ["着替え", "タオル", "日焼け止め", "飲み物", "サンダル"],
    precautions: [policyCopy.pregnancyNotice, "持病・健康上の不安がある方は必ず予約前にご相談ください。内容を確認したうえで参加可否をご案内します。", "飲酒されている方は参加不可", "お体に不自由がある場合は必ず事前にご相談ください", "強風・雨・飛行制限・安全判断によりドローン撮影ができない場合があります。その場合も海上からの写真撮影は行います"],
    location: "トゥリバー海浜公園／パシャビーチ／与那覇ビーチ北／インギャーマリンガーデン／西浜ビーチ のいずれか",
    locationNote: "上記5か所から当日の風向き・海況がベストな場所を選び、前日にLINEで地図付きでご案内します。各候補地の地図は「集合場所・アクセス」ページをご覧ください。",
    meetingTime: "日没の約90分前（8月は17:45頃・12月は16:30頃。正確な時間は前日にLINEで確定）",
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）`,
    faqs: [
      { q: "SUP初めてでも立てますか？", a: "はい！安定感抜群の大きめボードを使用し、波の穏やかなポイントで実施します。最初は座ったまま漕ぎ始め、慣れたら自分のペースで立ち上がりましょう。座ったままでも十分楽しめます。" },
      { q: "集合時間は何時ですか？", a: `日没の約90分前にご集合いただきます。月別の目安は、1月16:45／2月17:00／3月17:15／4月17:30／5月17:45／6月18:00／7月18:00／8月17:45／9月17:15／10月16:45／11月16:30／12月16:30頃です。ツアーは${getCustomerDurationLabel("S4")}で、日没の約30分後（8月なら19:45頃）に解散します。正確な時間は前日にLINEでご案内いたします。` },
      { q: "開催場所はどこですか？", a: "トゥリバー海浜公園・パシャビーチ・与那覇ビーチ北・インギャーマリンガーデン・西浜ビーチの5か所から、当日の風向き・海況がいちばん良い場所を選んで開催します。前日にLINEで地図付きでご案内するので、当日はナビ通りに向かうだけでOKです。" },
      { q: "雨の日はどうなりますか？", a: `小雨程度なら開催します。むしろ雨上がりの夕日は格別に美しいことも。${policyCopy.weatherNotice}お支払いは${policyCopy.paymentSummary}です。${policyCopy.prepaymentNotice} ${policyCopy.setPaymentNotice}` },
    ],
  },
  S8: {
    id: "S8",
    name: "サンセットSUP",
    tagline: "黄金に染まる海へ。ドローン空撮付きの夕日SUP。",
    heroDescription: "宮古島の夕日を海の上から楽しむSUP体験。ドローン空撮付きで、夕日に染まる海に浮かぶ姿を上空からも残せます。少人数の相乗りツアーなので、貸切より気軽にご参加いただけます。初心者でも安定のボードで安心。エモーショナルなシルエット写真が大人気！",
    image: PLAN_COVER_IMAGE.sup,
    images: TOUR_IMAGE_PATHS.sup,
    color: "orange",
    gradientFrom: "from-orange-500",
    gradientTo: "to-pink-500",
    price: planPrice("S8"),
    priceNote: "大人1名あたり",
    childPrice: `${planPrice("S8", true)}（子供）`,
    duration: getCustomerDurationDetailLabel("S8"),
    age: getPlanAgeLabel("S8"),
    highlights: [
      { title: "ドローン撮影付き", description: "夕日に染まる海に浮かぶ姿を上空から撮影。手持ちのカメラでは残せない、マジックアワーの絶景カットが手に入ります。", icon: "camera" },
      { title: "気軽に参加できる価格", description: "少人数の相乗りツアーなので、貸切より手に取りやすい価格でサンセットSUPを体験できます。おひとり様でもご参加いただけます。", icon: "heart" },
      { title: "初心者でも安心", description: "安定感抜群の大きめのボードを使用。ガイドが波の穏やかなポイントを選んで丁寧にレクチャーします。座ったままでもOK！", icon: "lifebuoy" },
      { title: "シルエット写真が映える", description: "夕日をバックにしたシルエット写真は、このツアーでしか撮れない特別な一枚。写真にこだわりのあるガイドが撮影します。", icon: "sparkles" },
      { title: "究極の癒し体験", description: "波の音を聞きながら、SUPボードの上で寝転んだり座ったり。日常を忘れる究極のリラックスタイムをお約束。", icon: "sunset" },
    ],
    flow: [
      { step: 1, title: "集合・受付", description: "催行地にて現地集合。集合はその日の日没の約90分前です（8月なら17:45頃）。正確な時間と集合場所は前日にLINEでご案内します。", time: "日没の約90分前" },
      { step: 2, title: "陸上レクチャー", description: "SUPの漕ぎ方や乗り方を陸上でしっかり丁寧にレクチャー。初めての方も安心です。" },
      { step: 3, title: "海上SUP＆夕日鑑賞＆ドローン撮影", description: "海へ出発！夕日を浴びながらのんびり海上散歩。絶景をバックに手持ち撮影とドローン空撮を行います。", time: getCustomerDurationLabel("S8") },
      { step: 4, title: "お会計・解散", description: "マジックアワーの余韻に浸りながらお会計。撮影データは当日中にお渡し。", time: "日没の約30分後" },
    ],
    included: ["SUPボード", "パドル", "ライフジャケット", "ドローン撮影", "写真・動画データ（枚数無制限）", "保険", "陸上レクチャー"],
    notIncluded: paidRentals("S8"),
    options: rentalOptions("S8", "レンタル"),
    whatToBring: ["着替え", "タオル", "日焼け止め", "飲み物", "サンダル"],
    precautions: [policyCopy.pregnancyNotice, "持病・健康上の不安がある方は必ず予約前にご相談ください。内容を確認したうえで参加可否をご案内します。", "飲酒されている方は参加不可", "お体に不自由がある場合は必ず事前にご相談ください", "他のお客様との相乗りツアーです。貸切をご希望の場合は【貸切】サンセットSUPをご予約ください", "強風・雨・飛行制限・安全判断によりドローン撮影ができない場合があります。その場合も海上からの写真撮影は行います"],
    location: "トゥリバー海浜公園／パシャビーチ／与那覇ビーチ北／インギャーマリンガーデン／西浜ビーチ のいずれか",
    locationNote: "上記5か所から当日の風向き・海況がベストな場所を選び、前日にLINEで地図付きでご案内します。各候補地の地図は「集合場所・アクセス」ページをご覧ください。",
    meetingTime: "日没の約90分前（8月は17:45頃・12月は16:30頃。正確な時間は前日にLINEで確定）",
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）`,
    faqs: [
      { q: "貸切プランとの違いは？", a: "こちらは他のお客様と一緒に参加する相乗りツアーです。グループだけで貸切にしたい場合は【貸切】サンセットSUPをご予約ください。ウェットスーツ・度付きマスクのレンタルも貸切プランは無料です。" },
      { q: "SUP初めてでも立てますか？", a: "はい！安定感抜群の大きめボードを使用し、波の穏やかなポイントで実施します。最初は座ったまま漕ぎ始め、慣れたら自分のペースで立ち上がりましょう。座ったままでも十分楽しめます。" },
      { q: "集合時間は何時ですか？", a: `日没の約90分前にご集合いただきます。月別の目安は、1月16:45／2月17:00／3月17:15／4月17:30／5月17:45／6月18:00／7月18:00／8月17:45／9月17:15／10月16:45／11月16:30／12月16:30頃です。ツアーは${getCustomerDurationLabel("S8")}で、日没の約30分後（8月なら19:45頃）に解散します。正確な時間は前日にLINEでご案内いたします。` },
      { q: "雨の日はどうなりますか？", a: `小雨程度なら開催します。むしろ雨上がりの夕日は格別に美しいことも。${policyCopy.weatherNotice}お支払いは${policyCopy.paymentSummary}です。${policyCopy.prepaymentNotice} ${policyCopy.setPaymentNotice}` },
    ],
  },
  S6: {
    id: "S6",
    name: "宮古島ドローンSUP体験",
    tagline: "宮古ブルーを海上と空から残す、日中開催のSUPツアー。",
    heroDescription: "透明度の高い宮古ブルーの海で楽しむ日中SUP体験。初心者でも扱いやすい安定感のあるボードで、海上散歩を楽しみながらドローン空撮も行います。水面ギリギリの迫力ある写真から、空から見下ろす絶景カットまで、宮古島らしい思い出を残せるプランです。",
    image: PLAN_COVER_IMAGE.daySup,
    images: TOUR_IMAGE_PATHS.daySup,
    color: "cyan",
    gradientFrom: "from-cyan-600",
    gradientTo: "to-emerald-500",
    price: planPrice("S6"),
    priceNote: "大人1名あたり",
    childPrice: `${planPrice("S6", true)}（子供）`,
    duration: getCustomerDurationDetailLabel("S6"),
    age: getPlanAgeLabel("S6"),
    highlights: [
      { title: "ドローン撮影付き", description: "宮古ブルーの海を上空から撮影。SUPに乗っている姿を、通常の手持ちカメラでは残せない角度で記録します。", icon: "camera" },
      { title: "透明度の高い日中の海", description: "明るい時間帯だからこそ、海の色・水面の透明感・サンゴ礁の雰囲気が写真に残りやすいプランです。", icon: "sparkles" },
      { title: "初心者でも安心", description: "安定感のあるSUPボードを使用し、ガイドが漕ぎ方や乗り方を丁寧にレクチャーします。座ったままでも楽しめます。", icon: "lifebuoy" },
      { title: "開始時間を選べる", description: `ご予約時に${daySupTimes}からご希望の開始時間を選べます。海況・水位により前後する場合は、事前にLINEでご案内します。`, icon: "shield" },
    ],
    flow: [
      { step: 1, title: "集合・受付", description: "ご予約時に選んだ開始時間に合わせて現地集合。集合場所は前日にガイドよりLINEでご案内します。", time: "選んだ開始時間の15分前" },
      { step: 2, title: "陸上レクチャー", description: "SUPの乗り方・漕ぎ方・安全面を丁寧に説明します。初めての方も安心です。" },
      { step: 3, title: "海上SUP＆ドローン撮影", description: "宮古ブルーの海へ出発。海上SUPを楽しみながら、状況に応じてドローン空撮を行います。", time: getCustomerDurationLabel("S6") },
      { step: 4, title: "お会計・解散", description: "お会計後、解散。撮影データは準備でき次第お渡しします。" },
    ],
    included: ["SUPボード", "パドル", "ライフジャケット", "ドローン撮影", "写真・動画データ", "保険", "陸上レクチャー"],
    notIncluded: paidRentals("S6"),
    options: rentalOptions("S6", "レンタル"),
    whatToBring: ["着替え", "タオル", "日焼け止め", "飲み物", "サンダル"],
    precautions: [
      policyCopy.pregnancyNotice,
      "持病・健康上の不安がある方は必ず予約前にご相談ください。内容を確認したうえで参加可否をご案内します。",
      "飲酒されている方は参加不可",
      "お体に不自由がある場合は必ず事前にご相談ください",
      "開始時間は当日の海況・水位により前後する場合があります",
      "強風・雨・飛行制限・安全判断により、ドローン撮影ができない場合があります",
    ],
    location: "当日の海況・水位により変動",
    locationNote: "安全に開催でき、写真が綺麗に残りやすい場所を選び、前日にLINEで集合場所をご案内します。",
    meetingTime: "選んだ開始時間の15分前に集合（海況・水位により時間が前後する場合があります）",
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）`,
    faqs: [
      { q: "開始時間は何時ですか？", a: `ご予約時に${daySupTimes}からお選びいただけます。当日の海況・水位により時間が前後する場合は、事前にLINEでご案内します。` },
      { q: "SUPが初めてでも参加できますか？", a: "はい。安定感のあるボードを使用し、陸上で漕ぎ方や乗り方をレクチャーします。最初は座ったままでも楽しめます。" },
      { q: "必ずドローン撮影できますか？", a: "風・雨・周辺環境・安全判断により、ドローンを飛ばせない場合があります。その場合も通常の写真・動画撮影で思い出を残します。" },
    ],
  },
  S7: {
    id: "S7",
    name: "【貸切】宮古島ドローンSUP体験",
    tagline: "宮古ブルーを海上と空から、1組貸切で。日中開催の貸切ドローンSUP。",
    heroDescription: "透明度の高い宮古ブルーの海を、お客様グループだけの完全貸切で楽しむ日中SUP体験。専属ガイドが付きっきりで、漕ぎ方のサポートからドローン空撮までゆっくり対応。周りを気にせず、自分たちのペースで水面ギリギリの写真から空撮の絶景カットまで残せる貸切プランです。",
    image: PLAN_COVER_IMAGE.daySup,
    images: TOUR_IMAGE_PATHS.daySup,
    color: "violet",
    gradientFrom: "from-violet-700",
    gradientTo: "to-cyan-500",
    price: planPrice("S7"),
    priceNote: "大人1名あたり",
    childPrice: `${planPrice("S7", true)}（子供）`,
    duration: getCustomerDurationDetailLabel("S7"),
    age: getPlanAgeLabel("S7"),
    highlights: [
      { title: "1組貸切・専属ガイド", description: "お客様グループだけの完全貸切。専属ガイドが付きっきりで、漕ぎ方のサポートや写真のリクエストに自由に対応します。", icon: "crown" },
      { title: "ドローン撮影付き", description: "宮古ブルーの海を上空から撮影。SUPに乗っている姿を、通常の手持ちカメラでは残せない角度で記録します。", icon: "camera" },
      { title: "透明度の高い日中の海", description: "明るい時間帯だからこそ、海の色・水面の透明感・サンゴ礁の雰囲気が写真に残りやすいプランです。", icon: "sparkles" },
      { title: "初心者でも安心", description: "安定感のあるSUPボードを使用し、専属ガイドが漕ぎ方や乗り方を丁寧にレクチャー。座ったままでも楽しめます。", icon: "lifebuoy" },
    ],
    flow: [
      { step: 1, title: "集合・受付", description: "ご予約時に選んだ開始時間に合わせて現地集合。集合場所は前日にガイドよりLINEでご案内します。", time: "選んだ開始時間の15分前" },
      { step: 2, title: "陸上レクチャー", description: "専属ガイドがSUPの乗り方・漕ぎ方・安全面を丁寧に説明します。初めての方も安心です。" },
      { step: 3, title: "海上SUP＆ドローン撮影", description: "宮古ブルーの海へ出発。貸切なので自分たちのペースで海上SUPを楽しみ、状況に応じてドローン空撮を行います。", time: getCustomerDurationLabel("S7") },
      { step: 4, title: "お会計・解散", description: "お会計後、解散。撮影データは準備でき次第お渡しします。" },
    ],
    included: ["SUPボード", "パドル", "ライフジャケット", ...includedRentals("S7"), "ドローン撮影", "写真・動画データ", "保険", "陸上レクチャー", "専属ガイド"],
    whatToBring: ["着替え", "タオル", "日焼け止め", "飲み物", "サンダル"],
    precautions: [
      policyCopy.pregnancyNotice,
      "持病・健康上の不安がある方は必ず予約前にご相談ください。内容を確認したうえで参加可否をご案内します。",
      "飲酒されている方は参加不可",
      "お体に不自由がある場合は必ず事前にご相談ください",
      "開始時間は当日の海況・水位により前後する場合があります",
      "強風・雨・飛行制限・安全判断により、ドローン撮影ができない場合があります",
      `${getPlanMaxParticipants("S7")! + 1}名以上はLINEよりご相談ください`,
    ],
    location: "当日の海況・水位により変動",
    locationNote: "安全に開催でき、写真が綺麗に残りやすい場所を選び、前日にLINEで集合場所をご案内します。",
    meetingTime: "選んだ開始時間の15分前に集合（海況・水位により時間が前後する場合があります）",
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）`,
    faqs: [
      { q: "通常のドローンSUPとの違いは？", a: "お客様のグループだけの完全貸切になります。専属ガイドが付き、周りを気にせず自分たちのペースで楽しめます。写真や空撮のリクエストもしやすい貸切体験です。" },
      { q: "開始時間は何時ですか？", a: `ご予約時に${daySupTimes}からお選びいただけます。当日の海況・水位により時間が前後する場合は、事前にLINEでご案内します。` },
      { q: "SUPが初めてでも参加できますか？", a: "はい。安定感のあるボードを使用し、専属ガイドが陸上で漕ぎ方や乗り方をレクチャーします。最初は座ったままでも楽しめます。" },
      { q: "必ずドローン撮影できますか？", a: "風・雨・周辺環境・安全判断により、ドローンを飛ばせない場合があります。その場合も通常の写真・動画撮影で思い出を残します。" },
    ],
  },
  S5: {
    id: "S5",
    name: "【貸切】本格ナイトツアー",
    tagline: "専属ガイドと行く、お客様だけのプライベート夜の大冒険",
    heroDescription: "通常ナイトツアーを1組限定で完全貸切。お子様のペースに合わせて自由に探検でき、専属ガイドがじっくり解説。三世代でも安心して楽しめます。",
    image: PLAN_COVER_IMAGE.nightPrivate,
    images: TOUR_IMAGE_PATHS.night,
    color: "violet",
    gradientFrom: "from-violet-700",
    gradientTo: "to-indigo-900",
    price: planPrice("S5"),
    priceNote: "一律料金（3歳以下無料）",
    duration: getCustomerDurationDetailLabel("S5"),
    age: getPlanAgeLabel("S5"),
    highlights: [
      { title: "完全貸切・専属ガイド", description: "お客様のグループだけの完全プライベートツアー。他のお客様を気にせず、立ち止まったり写真を撮ったり自由に探検できます。", icon: "crown" },
      { title: "じっくり解説付き", description: "通常プランでは伝えきれない生き物の生態や宮古島の自然について、専属ガイドがお客様の興味に合わせてたっぷり解説。お子様の「なぜ？」にもじっくりお答え。", icon: "compass" },
      { title: "0歳から参加OK", description: "赤ちゃんからおじいちゃんおばあちゃんまで、三世代でのご参加も大歓迎。3歳以下は無料！貸切だからペースも自由自在。", icon: "baby" },
      { title: "巨大ヤシガニに遭遇", description: "絶滅危惧種の巨大ヤシガニや夜行性の生き物を専属ガイドが徹底的に探します。貸切ならではのじっくり観察体験。", icon: "bug" },
    ],
    flow: [
      { step: 1, title: "集合・受付", description: "開催場所にて現地集合。専属ガイドがお出迎えし、注意事項や生き物を探すコツを説明します。", time: `${nightTimes}` },
      { step: 2, title: "探検準備", description: "専用の懐中電灯などをお貸出し。お客様のペースで出発準備。" },
      { step: 3, title: "貸切ナイトサファリ", description: "お客様だけのプライベート探検！気になる生き物を見つけたら、立ち止まってじっくり観察＆撮影。", time: getCustomerDurationLabel("S5") },
      { step: 4, title: "お会計・解散", description: "お会計後、解散。探検中の写真データも無料でお渡しします。" },
    ],
    included: ["懐中電灯", "専属ガイド", "写真データ", "保険"],
    whatToBring: ["歩きやすい靴（サンダルでも参加可能ですが、歩きやすい靴をおすすめします）", "虫よけスプレー", "飲み物", "懐中電灯（貸出あり）"],
    precautions: [policyCopy.pregnancyNotice, "持病・健康上の不安がある方は必ず予約前にご相談ください。内容を確認したうえで参加可否をご案内します。", "お体に不自由がある場合は必ず事前にご相談ください", "23:20便は翌日0:50頃の解散予定です"],
    location: "インギャーマリンガーデン付近・上比屋山遺跡など（集合場所は当日LINEにてご案内）",
    meetingTime: `開始時間と同じ（${nightTimes}）`,
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）`,
    faqs: [
      { q: "通常ナイトツアーとの違いは？", a: "完全貸切なのでお客様のペースで探検できます。専属ガイドがじっくり解説するので、通常プランより深い体験ができます。小さなお子様連れやご年配の方がいるグループに特におすすめです。" },
      { q: "何名まで参加できますか？", a: "人数制限は特にありません。大人数の場合はLINEでご相談ください。" },
      { q: "通常プランとどちらがおすすめ？", a: "60歳以上の方を含むグループは本貸切プランのご予約が必要です。60歳未満の方のみのグループでは、気軽に楽しむなら通常プラン、じっくり楽しむなら貸切プランをお選びいただけます。" },
    ],
  },
  C1: {
    id: "C1",
    name: "ウミガメシュノーケル＆ヤシガニ探検 昼夜セット",
    tagline: "昼はウミガメ、夜はヤシガニ探検。宮古島の海と夜を1日で楽しむ満喫セット",
    heroDescription: `昼は宮古島の海でウミガメシュノーケル、夜はヤシガニや夜行性の生き物を探すヤシガニ探検へ。海と夜の自然を1日で楽しめる、宮古島満喫セットプラン。通常より${comboSaving("C1")}お得です。`,
    image: PLAN_COVER_IMAGE.combo,
    images: TOUR_IMAGE_PATHS.combo,
    color: "emerald",
    gradientFrom: "from-emerald-600",
    gradientTo: "to-indigo-800",
    price: planPrice("C1"),
    priceNote: `大人1名あたり（通常${regularComboPrice("C1")}）`,
    childPrice: `${planPrice("C1", true)}（子供）`,
    duration: getCustomerDurationDetailLabel("C1"),
    age: getPlanAgeLabel("C1"),
    highlights: [
      { title: "人気2ツアーのお得なセット", description: `ウミガメシュノーケル（通常${planPrice("S1")}）とヤシガニ探検（通常${planPrice("S3")}）をセットに。単品合計${regularComboPrice("C1")}のところ、${planPrice("C1")}で${comboSaving("C1")}お得です。`, icon: "gift" },
      { title: "昼はウミガメと泳ぐ", description: "透き通る宮古島の海で、ウミガメと一緒に泳ぐ感動体験。少人数制・浅瀬での実施で、初心者やお子様も安心です。写真・動画は無料プレゼント。", icon: "turtle" },
      { title: "夜はヤシガニ探検", description: "懐中電灯を持って夜の亜熱帯ジャングルへ。絶滅危惧種の巨大ヤシガニや、オカヤドカリなど夜行性の生き物を探します。", icon: "compass" },
      { title: "海と夜を1日で満喫", description: "昼の海と夜の自然、宮古島ならではの体験を1日で遊び尽くせる欲張りプラン。家族旅行やカップルの思い出作りに最適です。", icon: "sparkles" },
    ],
    flow: [
      { step: 1, title: "【昼】集合・受付", description: `催行海岸にて現地集合。ガイドがお出迎えし、注意事項やツアーの流れを説明します。${policyCopy.setPaymentNotice}`, time: `${comboTurtleTimes} から選択` },
      { step: 2, title: "【昼】ウミガメシュノーケル", description: "器材レクチャーのあと、いよいよ海へ。ウミガメや熱帯魚と一緒に泳ぎます。", time: getCustomerSegmentDurationLabel("C1", "snorkel") },
      { step: 3, title: "【夜】集合・受付", description: "夜は開催場所に再集合。懐中電灯などをお貸出しし、生き物を探すコツを説明します。", time: `${comboNightTimes} から選択` },
      { step: 4, title: "【夜】ヤシガニ探検", description: "夜の亜熱帯を探検。巨大ヤシガニや夜行性の生き物を探します。終了後に解散。", time: getCustomerSegmentDurationLabel("C1", "night") },
    ],
    included: ["シュノーケル器材一式", "ライフジャケット", "浮き輪", "懐中電灯", "写真・動画データ（枚数無制限）", "保険", "安全講習", "ガイド同行"],
    notIncluded: paidRentals("C1"),
    whatToBring: ["着替え", "タオル", "日焼け止め", "飲み物", "サンダル（推奨）", "歩きやすい靴（夜用・サンダルでも参加可能ですが、歩きやすい靴をおすすめします）", "虫よけスプレー"],
    precautions: [
      "海況・天候により、ウミガメシュノーケルまたはヤシガニ探検の開催時間・開催場所が変更になる場合があります。",
      "ウミガメは野生生物のため、遭遇を保証するものではありません。",
      "ヤシガニ探検で観察できる生き物は、天候や季節により変わります。",
      `参加者全員が${getParticipantAgeRange("C1", "child")!.min}歳以上であることが必要です（0〜${getParticipantAgeRange("C1", "child")!.min - 1}歳のお子様は参加できません）。`,
      policyCopy.pregnancyNotice, "飲酒されている方は参加不可", policyCopy.healthConsultationNotice,
    ],
    options: rentalOptions("C1"),
    location: "昼：新城海岸・シギラビーチなど ／ 夜：インギャーマリンガーデン付近・上比屋山遺跡など（当日LINEにて詳細案内）",
    locationNote: "ウミガメツアーの集合場所は前日にLINEでご案内します（当日の風向き・波・潮位を確認し、安全に楽しめるビーチを選定）。ヤシガニ探検の集合場所は、当日の天候や気温で生き物の出やすい場所が変わるため、当日にLINEでご案内します。",
    meetingTime: `ウミガメツアー開始の15分前 ／ ヤシガニ探検は ${comboNightTimes}`,
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）。${policyCopy.setPaymentNotice}`,
    faqs: [
      { q: "ウミガメツアーとヤシガニ探検は同じ日に行いますか？", a: `はい。昼にウミガメシュノーケル、夜にヤシガニ探検を同日に体験いただくセットプランです。ウミガメツアーの時間（${comboTurtleTimes}）とヤシガニ探検の時間（${comboNightTimes}）を、それぞれご予約時にお選びください。` },
      { q: "どちらか一方が中止になったら料金はどうなりますか？", a: `${policyCopy.partialCancellationNotice}両方開催：大人${planPrice("C1")} / 子供${planPrice("C1", true)}、ウミガメのみ開催（夜中止）：大人${planPrice("S1")} / 子供${planPrice("S1", true)}、夜のみ開催（ウミガメ中止）：大人・子供${planPrice("S3")}。すべて中止の場合：${policyCopy.weatherNotice}` },
      { q: "通常より本当にお得ですか？", a: `はい。ウミガメシュノーケル（通常${planPrice("S1")}）とヤシガニ探検（通常${planPrice("S3")}）を個別に予約すると${regularComboPrice("C1")}ですが、本プランは${planPrice("C1")}（子供は${regularComboChildPrice("C1")}→${planPrice("C1", true)}）と、${comboSaving("C1")}お得です。` },
      { q: "子供は何歳から参加できますか？", a: `ウミガメシュノーケルを含むため、${getParticipantAgeRange("C1", "child")!.min}歳から参加可能です。0〜${getParticipantAgeRange("C1", "child")!.min - 1}歳のお子様はご参加いただけません（ヤシガニ探検単体プランとは対象年齢が異なります）。` },
      { q: "集合場所はいつ分かりますか？", a: "ウミガメシュノーケルの集合場所は前日にLINEでご案内します。ヤシガニ探検は、当日の天候や気温で生き物の出やすい場所が変わるため、当日にLINEでご案内します。海況・天候により開催場所が変更になる場合があります。" },
    ],
  },
  C2: {
    id: "C2",
    name: "【貸切】ウミガメシュノーケル＆ヤシガニ探検 昼夜セット",
    tagline: "昼も夜も貸切。宮古島の海と夜を自分たちのペースで楽しむ特別セット",
    heroDescription: `昼は貸切ウミガメシュノーケル、夜は貸切ヤシガニ探検へ。専属ガイドが昼も夜もお客様のペースに合わせて案内する、1日満喫の貸切セットプランです。通常より${comboSaving("C2")}お得です。`,
    image: PLAN_COVER_IMAGE.combo,
    images: TOUR_IMAGE_PATHS.combo,
    color: "violet",
    gradientFrom: "from-violet-700",
    gradientTo: "to-emerald-700",
    price: planPrice("C2"),
    priceNote: `大人・子供1名あたり（通常${regularComboPrice("C2")}）`,
    childPrice: `${planPrice("C2", true)}（子供）`,
    duration: getCustomerDurationDetailLabel("C2"),
    age: getPlanAgeLabel("C2"),
    highlights: [
      { title: "昼も夜も完全貸切", description: `貸切ウミガメシュノーケル（通常${planPrice("S2")}）と貸切ヤシガニ探検（通常${planPrice("S5")}）をセットに。単品合計${regularComboPrice("C2")}のところ、${planPrice("C2")}で${comboSaving("C2")}お得です。`, icon: "crown" },
      { title: "昼は貸切ウミガメシュノーケル", description: "他のお客様を気にせず、専属ガイドと自分たちのペースでウミガメシュノーケルを楽しめます。写真のリクエストもしやすい貸切体験です。", icon: "turtle" },
      { title: "夜は貸切ヤシガニ探検", description: "夜は専属ガイドとヤシガニや夜行性の生き物を探しに出発。立ち止まって観察したり、写真を撮ったり、貸切ならではの自由度があります。", icon: "compass" },
      { title: "家族・カップルにおすすめ", description: "小さなお子様連れ、泳ぎが苦手な方、記念日旅行など、周りを気にせず宮古島の自然を楽しみたい方におすすめです。", icon: "sparkles" },
    ],
    flow: [
      { step: 1, title: "【昼】集合・受付", description: `催行海岸にて現地集合。専属ガイドがお出迎えし、貸切ツアーの流れを説明します。${policyCopy.setPaymentNotice}`, time: `${comboTurtleTimes} から選択` },
      { step: 2, title: "【昼】貸切ウミガメシュノーケル", description: "お客様のペースに合わせて海へ。ウミガメや熱帯魚と一緒に泳ぎ、こだわりの写真・動画を撮影します。", time: getCustomerSegmentDurationLabel("C2", "snorkel") },
      { step: 3, title: "【夜】集合・受付", description: "夜は開催場所に再集合。専属ガイドが生き物の探し方や注意点を案内します。", time: `${comboNightTimes} から選択` },
      { step: 4, title: "【夜】貸切ヤシガニ探検", description: "お客様だけのペースで夜の亜熱帯を探検。巨大ヤシガニや夜行性の生き物を探します。終了後に解散。", time: getCustomerSegmentDurationLabel("C2", "night") },
    ],
    included: ["シュノーケル器材一式", "ライフジャケット", "浮き輪", ...includedRentals("C2"), "懐中電灯", "写真・動画データ（枚数無制限）", "保険", "安全講習", "専属ガイド"],
    whatToBring: ["着替え", "タオル", "日焼け止め", "飲み物", "サンダル（推奨）", "歩きやすい靴（夜用・サンダルでも参加可能ですが、歩きやすい靴をおすすめします）", "虫よけスプレー"],
    precautions: [
      "海況・天候により、ウミガメシュノーケルまたはヤシガニ探検の開催時間・開催場所が変更になる場合があります。",
      "ウミガメは野生生物のため、遭遇を保証するものではありません。",
      "ヤシガニ探検で観察できる生き物は、天候や季節により変わります。",
      `参加者全員が${getParticipantAgeRange("C2", "child")!.min}歳以上であることが必要です（0〜${getParticipantAgeRange("C2", "child")!.min - 1}歳のお子様は参加できません）。`,
      policyCopy.pregnancyNotice, "飲酒されている方は参加不可", policyCopy.healthConsultationNotice,
      `${getPlanMaxParticipants("C2")! + 1}名以上はLINEよりご相談ください。`,
    ],
    location: "昼：新城海岸・シギラビーチなど ／ 夜：インギャーマリンガーデン付近・上比屋山遺跡など（当日LINEにて詳細案内）",
    locationNote: "ウミガメツアーの集合場所は前日にLINEでご案内します（当日の風向き・波・潮位を確認し、安全に楽しめるビーチを選定）。ヤシガニ探検の集合場所は、当日の天候や気温で生き物の出やすい場所が変わるため、当日にLINEでご案内します。",
    meetingTime: `ウミガメツアー開始の15分前 ／ ヤシガニ探検は ${comboNightTimes}`,
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）。${policyCopy.setPaymentNotice}`,
    faqs: [
      { q: "通常セットとの違いは？", a: "昼のウミガメシュノーケルも夜のヤシガニ探検も、どちらもお客様のグループだけの貸切になります。周りを気にせず、休憩や写真撮影も自分たちのペースで楽しめます。" },
      { q: "何名まで参加できますか？", a: `目安は最大${getPlanMaxParticipants("C2")}名までです。${getPlanMaxParticipants("C2")! + 1}名以上の場合はLINEでご相談ください。` },
      { q: "通常より本当にお得ですか？", a: `はい。貸切ウミガメシュノーケル（通常${planPrice("S2")}）と貸切ヤシガニ探検（通常${planPrice("S5")}）を個別に予約すると${regularComboPrice("C2")}ですが、本プランは${planPrice("C2")}と、${comboSaving("C2")}お得です。` },
      { q: "どちらか一方が中止になったら料金はどうなりますか？", a: `${policyCopy.partialCancellationNotice}両方開催：大人・子供${planPrice("C2")}、ウミガメのみ開催（夜中止）：大人・子供${planPrice("S2")}、夜のみ開催（ウミガメ中止）：大人・子供${planPrice("S5")}。すべて中止の場合：${policyCopy.weatherNotice}` },
      { q: "集合場所はいつ分かりますか？", a: "ウミガメシュノーケルの集合場所は前日にLINEでご案内します。ヤシガニ探検は、当日の天候や気温で生き物の出やすい場所が変わるため、当日にLINEでご案内します。海況・天候により開催場所が変更になる場合があります。" },
    ],
  },
  C3: {
    id: "C3",
    name: "ウミガメシュノーケル＆ドローンSUP 海空セット",
    tagline: "昼は海でウミガメ、空からドローンSUP。宮古ブルーを海と空で1日楽しむ海空セット",
    heroDescription: `宮古島の海でウミガメシュノーケル、そのまま同じビーチでドローンSUP体験へ。海に潜って遊び、海上＆空撮で宮古ブルーを丸ごと残す、昼の海をとことん楽しむ海空セットプラン。所要時間は${getCustomerDurationLabel("C3")}。別のビーチへ移動する場合は、移動時間の分だけ延長する場合があります。通常より${comboSaving("C3")}お得です。`,
    image: PLAN_COVER_IMAGE.comboSeaSky,
    images: TOUR_IMAGE_PATHS.comboSeaSky,
    color: "cyan",
    gradientFrom: "from-cyan-600",
    gradientTo: "to-emerald-600",
    price: planPrice("C3"),
    priceNote: `大人1名あたり（通常${regularComboPrice("C3")}）`,
    childPrice: `${planPrice("C3", true)}（子供）`,
    duration: getCustomerDurationDetailLabel("C3"),
    age: getPlanAgeLabel("C3"),
    highlights: [
      { title: "人気2ツアーのお得なセット", description: `ウミガメシュノーケル（通常${planPrice("S1")}）とドローンSUP体験（通常${planPrice("S6")}）をセットに。単品合計${regularComboPrice("C3")}のところ、${planPrice("C3")}で${comboSaving("C3")}お得です。`, icon: "gift" },
      { title: "昼はウミガメと泳ぐ", description: "透き通る宮古島の海で、ウミガメと一緒に泳ぐ感動体験。少人数制・浅瀬での実施で、初心者やお子様も安心です。写真・動画は無料プレゼント。", icon: "turtle" },
      { title: "海上＆空からドローン撮影", description: "宮古ブルーの海上をSUPでクルージング。ドローンで海と空からの絶景を撮影し、SNS映えする特別な思い出を残せます。", icon: "camera" },
      { title: "海を1日とことん満喫", description: "潜って泳いで、海上から眺めて、空から撮る。宮古島の海を1日で遊び尽くせる欲張りプラン。カップル・家族旅行の思い出作りに最適です。", icon: "sparkles" },
    ],
    flow: [
      { step: 1, title: "集合・受付", description: `催行ビーチにて現地集合。ガイドがお出迎えし、注意事項やツアーの流れを説明します。${policyCopy.setPaymentNotice}`, time: `${comboTurtleTimes} から選択` },
      { step: 2, title: "ウミガメシュノーケル", description: "器材レクチャーのあと、いよいよ海へ。ウミガメや熱帯魚と一緒に泳ぎます。", time: getCustomerSegmentDurationLabel("C3", "snorkel") },
      { step: 3, title: "そのままドローンSUPへ", description: "基本的に同じビーチで、続けてドローンSUPの準備。器材の使い方をレクチャーします。海況・水位によっては別のビーチで開催する場合があります。" },
      { step: 4, title: "ドローンSUP体験", description: "宮古ブルーの海上をSUPでクルージング。ドローンで海上＆空撮を行い、データは無料プレゼント。終了後に解散。", time: getCustomerSegmentDurationLabel("C3", "sup") },
    ],
    included: ["シュノーケル器材一式", "ライフジャケット", "浮き輪", "SUPボード一式", "写真・動画データ（枚数無制限）", "ドローン撮影データ", "保険", "安全講習", "ガイド同行"],
    notIncluded: paidRentals("C3"),
    whatToBring: ["着替え", "タオル", "日焼け止め", "飲み物", "サンダル（推奨）"],
    precautions: [
      "当日は基本的に同じビーチでウミガメシュノーケルとドローンSUPを連続して開催します。ただし海況・水位によっては、異なるビーチでの開催になる場合があります。",
      "別のビーチへ移動する場合は、移動時間の分だけ延長する場合があります。",
      "海況・水位・天候により、開催時間・開催場所が変更になる場合があります。",
      "ウミガメは野生生物のため、遭遇を保証するものではありません。",
      "ドローン撮影は天候・風により実施できない場合があります。",
      `参加者全員が${getParticipantAgeRange("C3", "child")!.min}歳以上であることが必要です（0〜${getParticipantAgeRange("C3", "child")!.min - 1}歳のお子様は参加できません）。`,
      policyCopy.pregnancyNotice, "飲酒されている方は参加不可", policyCopy.healthConsultationNotice,
    ],
    options: rentalOptions("C3"),
    location: "新城海岸・シギラビーチなど。基本的に同じビーチで2つのツアーを連続開催します。",
    locationNote: "集合場所は前日にLINEでご案内します（当日の風向き・波・潮位を確認し、安全に楽しめるビーチを選定）。ウミガメシュノーケルとドローンSUPは基本的に同じビーチで連続して行いますが、海況・水位によっては異なるビーチでの開催になる場合があります。",
    meetingTime: "ウミガメツアー開始の15分前（ドローンSUPはそのまま同じビーチで続けて開催）",
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）。${policyCopy.setPaymentNotice}`,
    faqs: [
      { q: "シュノーケルとドローンSUPは同じ日に行いますか？", a: `はい。同日に、基本的に同じビーチで連続して体験いただくセットプランです。ウミガメシュノーケル（${getCustomerSegmentDurationLabel("C3", "snorkel")}）のあと、そのまま続けてドローンSUP（${getCustomerSegmentDurationLabel("C3", "sup")}）へ。所要時間は受付から解散まで${getCustomerDurationLabel("C3")}が目安です（別のビーチへ移動する場合は伸びることがあります）。シュノーケルの開始時間（${comboTurtleTimes}）をご予約時にお選びください。海況・水位によっては異なるビーチでの開催になる場合があります。` },
      { q: "どちらか一方が中止になったら料金はどうなりますか？", a: `${policyCopy.partialCancellationNotice}両方開催：大人${planPrice("C3")} / 子供${planPrice("C3", true)}、シュノーケルのみ開催：大人${planPrice("S1")} / 子供${planPrice("S1", true)}、ドローンSUPのみ開催：大人${planPrice("S6")} / 子供${planPrice("S6", true)}。すべて中止の場合：${policyCopy.weatherNotice}` },
      { q: "通常より本当にお得ですか？", a: `はい。ウミガメシュノーケル（通常${planPrice("S1")}）とドローンSUP体験（通常${planPrice("S6")}）を個別に予約すると${regularComboPrice("C3")}ですが、本プランは${planPrice("C3")}（子供は${regularComboChildPrice("C3")}→${planPrice("C3", true)}）と、${comboSaving("C3")}お得です。` },
      { q: "子供は何歳から参加できますか？", a: `${getParticipantAgeRange("C3", "child")!.min}歳から参加可能です。0〜${getParticipantAgeRange("C3", "child")!.min - 1}歳のお子様はご参加いただけません。` },
      { q: "泳げなくても参加できますか？", a: "はい。シュノーケルはライフジャケット着用・浅瀬での実施で、SUPも安定したボードを使用します。泳ぎが苦手な方やお子様連れでも安心してご参加いただけます。" },
    ],
  },
  C4: {
    id: "C4",
    name: "【貸切】ウミガメシュノーケル＆ドローンSUP 海空セット",
    tagline: "海も空も1組貸切。宮古ブルーを自分たちのペースで楽しむ貸切海空セット",
    heroDescription: `貸切ウミガメシュノーケル、そのまま同じビーチで貸切ドローンSUPへ。専属ガイドがお客様グループだけに付き、海に潜って遊び、海上＆空撮で宮古ブルーを丸ごと残す貸切の海空セット。所要時間は${getCustomerDurationLabel("C4")}。別のビーチへ移動する場合は、移動時間の分だけ延長する場合があります。通常より${comboSaving("C4")}お得です。`,
    image: PLAN_COVER_IMAGE.comboSeaSky,
    images: TOUR_IMAGE_PATHS.comboSeaSky,
    color: "violet",
    gradientFrom: "from-violet-700",
    gradientTo: "to-cyan-500",
    price: planPrice("C4"),
    priceNote: `大人1名あたり（通常${regularComboPrice("C4")}）`,
    childPrice: `${planPrice("C4", true)}（子供）`,
    duration: getCustomerDurationDetailLabel("C4"),
    age: getPlanAgeLabel("C4"),
    highlights: [
      { title: "海も空も完全貸切", description: `貸切ウミガメシュノーケル（通常${planPrice("S2")}）と貸切ドローンSUP（通常${planPrice("S7")}）をセットに。単品合計${regularComboPrice("C4")}のところ、${planPrice("C4")}で${comboSaving("C4")}お得です。`, icon: "crown" },
      { title: "昼は貸切ウミガメシュノーケル", description: "他のお客様を気にせず、専属ガイドと自分たちのペースでウミガメシュノーケル。写真のリクエストもしやすい貸切体験です。", icon: "turtle" },
      { title: "海上＆空からドローン撮影", description: "そのまま貸切ドローンSUPへ。宮古ブルーの海上をクルージングし、ドローンで海と空からの絶景を撮影します。", icon: "camera" },
      { title: "家族・カップルにおすすめ", description: "小さなお子様連れ、泳ぎが苦手な方、記念日旅行など、周りを気にせず宮古島の海を1日楽しみたい方におすすめです。", icon: "sparkles" },
    ],
    flow: [
      { step: 1, title: "集合・受付", description: `催行ビーチにて現地集合。専属ガイドがお出迎えし、貸切ツアーの流れを説明します。${policyCopy.setPaymentNotice}`, time: `${comboTurtleTimes} から選択` },
      { step: 2, title: "貸切ウミガメシュノーケル", description: "お客様のペースで海へ。ウミガメや熱帯魚と一緒に泳ぎ、こだわりの写真・動画を撮影します。", time: getCustomerSegmentDurationLabel("C4", "snorkel") },
      { step: 3, title: "そのまま貸切ドローンSUPへ", description: "基本的に同じビーチで、続けて貸切ドローンSUPの準備。器材の使い方をレクチャーします。海況・水位によっては別のビーチで開催する場合があります。" },
      { step: 4, title: "貸切ドローンSUP体験", description: "宮古ブルーの海上を自分たちのペースでクルージング。ドローンで海上＆空撮を行い、データは無料プレゼント。終了後に解散。", time: getCustomerSegmentDurationLabel("C4", "sup") },
    ],
    included: ["シュノーケル器材一式", "ライフジャケット", "浮き輪", "SUPボード一式", ...includedRentals("C4"), "写真・動画データ（枚数無制限）", "ドローン撮影データ", "保険", "安全講習", "専属ガイド"],
    whatToBring: ["着替え", "タオル", "日焼け止め", "飲み物", "サンダル（推奨）"],
    precautions: [
      "当日は基本的に同じビーチで貸切ウミガメシュノーケルと貸切ドローンSUPを連続して開催します。ただし海況・水位によっては、異なるビーチでの開催になる場合があります。",
      "別のビーチへ移動する場合は、移動時間の分だけ延長する場合があります。",
      "海況・水位・天候により、開催時間・開催場所が変更になる場合があります。",
      "ウミガメは野生生物のため、遭遇を保証するものではありません。",
      "ドローン撮影は天候・風により実施できない場合があります。",
      `参加者全員が${getParticipantAgeRange("C4", "child")!.min}歳以上であることが必要です（0〜${getParticipantAgeRange("C4", "child")!.min - 1}歳のお子様は参加できません）。`,
      policyCopy.pregnancyNotice, "飲酒されている方は参加不可", policyCopy.healthConsultationNotice,
      `${getPlanMaxParticipants("C4")! + 1}名以上はLINEよりご相談ください。`,
    ],
    location: "新城海岸・シギラビーチなど。基本的に同じビーチで2つのツアーを連続開催します。",
    locationNote: "集合場所は前日にLINEでご案内します（当日の風向き・波・潮位を確認し、安全に楽しめるビーチを選定）。貸切ウミガメシュノーケルと貸切ドローンSUPは基本的に同じビーチで連続して行いますが、海況・水位によっては異なるビーチでの開催になる場合があります。",
    meetingTime: "ウミガメツアー開始の15分前（ドローンSUPはそのまま同じビーチで続けて開催）",
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）。${policyCopy.setPaymentNotice}`,
    faqs: [
      { q: "通常の海空セットとの違いは？", a: "ウミガメシュノーケルもドローンSUPも、どちらもお客様のグループだけの貸切になります。専属ガイドが付き、周りを気にせず自分たちのペースで楽しめます。" },
      { q: "シュノーケルとドローンSUPは同じ日に行いますか？", a: `はい。同日に、基本的に同じビーチで連続して体験いただく貸切セットプランです。貸切ウミガメシュノーケル（${getCustomerSegmentDurationLabel("C4", "snorkel")}）のあと、そのまま続けて貸切ドローンSUP（${getCustomerSegmentDurationLabel("C4", "sup")}）へ。所要時間は受付から解散まで${getCustomerDurationLabel("C4")}が目安です（別のビーチへ移動する場合は伸びることがあります）。シュノーケルの開始時間（${comboTurtleTimes}）をご予約時にお選びください。` },
      { q: "どちらか一方が中止になったら料金はどうなりますか？", a: `${policyCopy.partialCancellationNotice}両方開催：大人${planPrice("C4")} / 子供${planPrice("C4", true)}、シュノーケルのみ開催：大人・子供${planPrice("S2")}、ドローンSUPのみ開催：大人${planPrice("S7")} / 子供${planPrice("S7", true)}。すべて中止の場合：${policyCopy.weatherNotice}` },
      { q: "何名まで参加できますか？", a: `目安は最大${getPlanMaxParticipants("C4")}名までです。${getPlanMaxParticipants("C4")! + 1}名以上の場合はLINEでご相談ください。` },
    ],
  },
  C5: {
    id: "C5",
    name: "ウミガメシュノーケル＆ドローンSUP＆ナイトツアー まるごと1日セット",
    tagline: "朝は海でウミガメ、昼は空からドローンSUP、夜はジャングルでナイトツアー。宮古島を1日で遊び尽くす完全セット",
    heroDescription: `宮古島の海・空・夜を1日で遊び尽くす欲張りプラン。朝はウミガメシュノーケル、昼はドローンSUPで海上＆空撮、夜はナイトツアーでヤシガニや夜行性の生き物を探検。人気3ツアーをまとめたまるごと1日セットで、単品より${comboSaving("C5")}お得です。`,
    image: PLAN_COVER_IMAGE.comboFullDay,
    images: TOUR_IMAGE_PATHS.comboFullDay,
    color: "emerald",
    gradientFrom: "from-emerald-600",
    gradientTo: "to-indigo-800",
    price: planPrice("C5"),
    priceNote: `大人1名あたり（通常${regularComboPrice("C5")}）`,
    childPrice: `${planPrice("C5", true)}（子供）`,
    duration: getCustomerDurationDetailLabel("C5"),
    age: getPlanAgeLabel("C5"),
    highlights: [
      { title: "人気3ツアーのまるごとセット", description: `ウミガメシュノーケル（通常${planPrice("S1")}）・ドローンSUP（通常${planPrice("S6")}）・ナイトツアー（通常${planPrice("S3")}）をセットに。単品合計${regularComboPrice("C5")}のところ、${planPrice("C5")}で${comboSaving("C5")}お得です。`, icon: "gift" },
      { title: "朝はウミガメと泳ぐ", description: "透き通る宮古島の海で、ウミガメと一緒に泳ぐ感動体験。少人数制・浅瀬での実施で、初心者やお子様も安心。写真・動画は無料プレゼント。", icon: "turtle" },
      { title: "昼は海上＆空からドローン撮影", description: "宮古ブルーの海上をSUPでクルージング。ドローンで海と空からの絶景を撮影し、SNS映えする思い出を残せます。", icon: "camera" },
      { title: "夜はジャングルでナイトツアー", description: "懐中電灯を持って夜の亜熱帯ジャングルへ。絶滅危惧種の巨大ヤシガニや、夜行性の生き物を探します。", icon: "compass" },
    ],
    flow: [
      { step: 1, title: "【朝】集合・受付", description: `催行ビーチにて現地集合。ガイドがお出迎えし、1日の流れと注意事項を説明します。${policyCopy.setPaymentNotice}`, time: `${comboTurtleTimes} から選択` },
      { step: 2, title: "【朝】ウミガメシュノーケル", description: "器材レクチャーのあと海へ。ウミガメや熱帯魚と一緒に泳ぎます。", time: getCustomerSegmentDurationLabel("C5", "snorkel") },
      { step: 3, title: "【昼】そのままドローンSUP", description: "基本的に同じビーチで続けてドローンSUP。海上クルージングと空撮を楽しみます。海況・水位により別ビーチの場合あり。", time: getCustomerSegmentDurationLabel("C5", "sup") },
      { step: 4, title: "【夕方】一旦解散・自由時間", description: "夜のナイトツアーまでは自由時間。夕食や休憩をお取りください。" },
      { step: 5, title: "【夜】ナイトツアー集合・探検", description: "夜は開催場所に再集合。懐中電灯を持って夜の亜熱帯を探検し、巨大ヤシガニや夜行性の生き物を探します。終了後に解散。", time: `${comboNightTimes} から選択・${getCustomerSegmentDurationLabel("C5", "night")}` },
    ],
    included: ["シュノーケル器材一式", "ライフジャケット", "浮き輪", "SUPボード一式", "懐中電灯", "写真・動画データ（枚数無制限）", "ドローン撮影データ", "保険", "安全講習", "ガイド同行"],
    notIncluded: paidRentals("C5"),
    whatToBring: ["着替え", "タオル", "日焼け止め", "飲み物", "サンダル（推奨）", "歩きやすい靴（夜用・サンダルでも参加可能ですが、歩きやすい靴をおすすめします）", "虫よけスプレー"],
    precautions: [
      "1日に3つのツアーを行うため、体力に余裕を持ってご参加ください。",
      "海況・水位・天候により、各ツアーの開催時間・開催場所が変更になる場合があります。",
      "ウミガメは野生生物のため、遭遇を保証するものではありません。",
      "ドローン撮影は天候・風により実施できない場合があります。",
      `参加者全員が${getParticipantAgeRange("C5", "child")!.min}歳以上であることが必要です（0〜${getParticipantAgeRange("C5", "child")!.min - 1}歳のお子様は参加できません）。`,
      policyCopy.pregnancyNotice, "飲酒されている方は参加不可", policyCopy.healthConsultationNotice,
    ],
    options: rentalOptions("C5"),
    location: "昼：新城海岸・シギラビーチなど ／ 夜：インギャーマリンガーデン付近・上比屋山遺跡など（当日LINEにて詳細案内）",
    locationNote: "ウミガメシュノーケルとドローンSUPは前日にLINEで集合場所をご案内します（基本的に同じビーチで連続開催／海況・水位により別ビーチの場合あり）。ナイトツアーの集合場所は、当日の天候や気温で生き物の出やすい場所が変わるため、当日にLINEでご案内します。",
    meetingTime: `ウミガメツアー開始の15分前 ／ ナイトツアーは ${comboNightTimes}`,
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）。${policyCopy.setPaymentNotice}`,
    faqs: [
      { q: "3つのツアーは同じ日に行いますか？", a: `はい。朝にウミガメシュノーケル、昼にドローンSUP、夜にナイトツアーを同日に体験いただく1日セットプランです。シュノーケルの時間とナイトツアーの時間（${comboNightTimes}）をご予約時にお選びください。ドローンSUPはシュノーケルから続けて開催します。` },
      { q: "1日でも体力的に大丈夫ですか？", a: "夕方に一旦解散して自由時間があるため、夕食や休憩をはさんで夜のナイトツアーに参加できます。とはいえ1日で3ツアーを行うため、体力に余裕を持ってご参加ください。" },
      { q: "通常より本当にお得ですか？", a: `はい。ウミガメシュノーケル（${planPrice("S1")}）・ドローンSUP（${planPrice("S6")}）・ナイトツアー（${planPrice("S3")}）を個別に予約すると${regularComboPrice("C5")}ですが、本プランは${planPrice("C5")}（子供は${regularComboChildPrice("C5")}→${planPrice("C5", true)}）と、${comboSaving("C5")}お得です。` },
      { q: "どれか中止になったら料金はどうなりますか？", a: `${policyCopy.partialCancellationNotice}単品料金は、ウミガメ：大人${planPrice("S1")} / 子供${planPrice("S1", true)}、ドローンSUP：大人${planPrice("S6")} / 子供${planPrice("S6", true)}、ナイトツアー：大人・子供${planPrice("S3")}です。すべて中止の場合：${policyCopy.weatherNotice}` },
      { q: "子供は何歳から参加できますか？", a: `${getParticipantAgeRange("C5", "child")!.min}歳から参加可能です。シュノーケル・SUPを含むため、0〜${getParticipantAgeRange("C5", "child")!.min - 1}歳のお子様はご参加いただけません。` },
    ],
  },
  C6: {
    id: "C6",
    name: "【貸切】ウミガメシュノーケル＆ドローンSUP＆ナイトツアー まるごと1日セット",
    tagline: "海も空も夜も完全貸切。宮古島を1日まるごと自分たちのペースで遊び尽くす特別セット",
    heroDescription: `朝のウミガメシュノーケル、昼のドローンSUP、夜のナイトツアーをすべて1組貸切で。専属ガイドが1日付きっきりで、海・空・夜の宮古島を自分たちのペースで遊び尽くす最上級のまるごと1日セット。単品より${comboSaving("C6")}お得です。`,
    image: PLAN_COVER_IMAGE.comboFullDay,
    images: TOUR_IMAGE_PATHS.comboFullDay,
    color: "violet",
    gradientFrom: "from-violet-700",
    gradientTo: "to-indigo-800",
    price: planPrice("C6"),
    priceNote: `大人1名あたり（通常${regularComboPrice("C6")}）`,
    childPrice: `${planPrice("C6", true)}（子供）`,
    duration: getCustomerDurationDetailLabel("C6"),
    age: getPlanAgeLabel("C6"),
    highlights: [
      { title: "海も空も夜も完全貸切", description: `貸切ウミガメシュノーケル（通常${planPrice("S2")}）・貸切ドローンSUP（通常${planPrice("S7")}）・貸切ナイトツアー（通常${planPrice("S5")}）をセットに。単品合計${regularComboPrice("C6")}のところ、${planPrice("C6")}で${comboSaving("C6")}お得です。`, icon: "crown" },
      { title: "朝は貸切ウミガメシュノーケル", description: "他のお客様を気にせず、専属ガイドと自分たちのペースでウミガメシュノーケル。写真のリクエストもしやすい貸切体験です。", icon: "turtle" },
      { title: "昼は貸切ドローンSUP", description: "宮古ブルーの海上を貸切でクルージング。ドローンで海と空からの絶景をたっぷり撮影します。", icon: "camera" },
      { title: "夜は貸切ナイトツアー", description: "専属ガイドと夜の亜熱帯を探検。立ち止まって観察したり写真を撮ったり、貸切ならではの自由度で巨大ヤシガニを探します。", icon: "compass" },
    ],
    flow: [
      { step: 1, title: "【朝】集合・受付", description: `催行ビーチにて現地集合。専属ガイドがお出迎えし、1日の流れを説明します。${policyCopy.setPaymentNotice}`, time: `${comboTurtleTimes} から選択` },
      { step: 2, title: "【朝】貸切ウミガメシュノーケル", description: "お客様のペースで海へ。ウミガメや熱帯魚と泳ぎ、こだわりの写真・動画を撮影します。", time: getCustomerSegmentDurationLabel("C6", "snorkel") },
      { step: 3, title: "【昼】そのまま貸切ドローンSUP", description: "基本的に同じビーチで続けて貸切ドローンSUP。海上クルージングと空撮を楽しみます。海況・水位により別ビーチの場合あり。", time: getCustomerSegmentDurationLabel("C6", "sup") },
      { step: 4, title: "【夕方】一旦解散・自由時間", description: "夜のナイトツアーまでは自由時間。夕食や休憩をお取りください。" },
      { step: 5, title: "【夜】貸切ナイトツアー集合・探検", description: "夜は開催場所に再集合。専属ガイドと夜の亜熱帯を探検し、巨大ヤシガニや夜行性の生き物を探します。終了後に解散。", time: `${comboNightTimes} から選択・${getCustomerSegmentDurationLabel("C6", "night")}` },
    ],
    included: ["シュノーケル器材一式", "ライフジャケット", "浮き輪", "SUPボード一式", ...includedRentals("C6"), "懐中電灯", "写真・動画データ（枚数無制限）", "ドローン撮影データ", "保険", "安全講習", "専属ガイド"],
    whatToBring: ["着替え", "タオル", "日焼け止め", "飲み物", "サンダル（推奨）", "歩きやすい靴（夜用・サンダルでも参加可能ですが、歩きやすい靴をおすすめします）", "虫よけスプレー"],
    precautions: [
      "1日に3つのツアーを行うため、体力に余裕を持ってご参加ください。",
      "海況・水位・天候により、各ツアーの開催時間・開催場所が変更になる場合があります。",
      "ウミガメは野生生物のため、遭遇を保証するものではありません。",
      "ドローン撮影は天候・風により実施できない場合があります。",
      `参加者全員が${getParticipantAgeRange("C6", "child")!.min}歳以上であることが必要です（0〜${getParticipantAgeRange("C6", "child")!.min - 1}歳のお子様は参加できません）。`,
      policyCopy.pregnancyNotice, "飲酒されている方は参加不可", policyCopy.healthConsultationNotice,
      `${getPlanMaxParticipants("C6")! + 1}名以上はLINEよりご相談ください。`,
    ],
    location: "昼：新城海岸・シギラビーチなど ／ 夜：インギャーマリンガーデン付近・上比屋山遺跡など（当日LINEにて詳細案内）",
    locationNote: "ウミガメシュノーケルとドローンSUPは前日にLINEで集合場所をご案内します（基本的に同じビーチで連続開催／海況・水位により別ビーチの場合あり）。ナイトツアーの集合場所は、当日の天候や気温で生き物の出やすい場所が変わるため、当日にLINEでご案内します。",
    meetingTime: `ウミガメツアー開始の15分前 ／ ナイトツアーは ${comboNightTimes}`,
    paymentMethod: `${policyCopy.paymentSummary}（できるだけお釣りが出ないようご協力ください）。${policyCopy.setPaymentNotice}`,
    faqs: [
      { q: "通常のまるごと1日セットとの違いは？", a: "朝のウミガメシュノーケル・昼のドローンSUP・夜のナイトツアーのすべてが、お客様グループだけの貸切になります。専属ガイドが1日付き、周りを気にせず自分たちのペースで楽しめます。" },
      { q: "何名まで参加できますか？", a: `目安は最大${getPlanMaxParticipants("C6")}名までです。${getPlanMaxParticipants("C6")! + 1}名以上の場合はLINEでご相談ください。` },
      { q: "通常より本当にお得ですか？", a: `はい。貸切3ツアー（ウミガメ${planPrice("S2")}・ドローンSUP${planPrice("S7")}・ナイトツアー${planPrice("S5")}）を個別に予約すると${regularComboPrice("C6")}ですが、本プランは${planPrice("C6")}と${comboSaving("C6")}お得です。` },
      { q: "どれか中止になったら料金はどうなりますか？", a: `${policyCopy.partialCancellationNotice}単品料金は、貸切ウミガメ：大人・子供${planPrice("S2")}、貸切ドローンSUP：大人${planPrice("S7")} / 子供${planPrice("S7", true)}、貸切ナイトツアー：大人・子供${planPrice("S5")}です。すべて中止の場合：${policyCopy.weatherNotice}` },
    ],
  },
  "slide-boat": {
    id: "slide-boat",
    brand: "umigame-kyodai",
    status: "coming_soon",
    name: "海亀兄弟のスライダーボートシュノーケル",
    tagline: "滑り台も飛び込み台も。宮古島の海をもっとアクティブに遊ぶ新プラン",
    heroDescription: "トゥリバーマリーナ集合の滑り台付きボートシュノーケルがまもなく登場。ファミリーもグループも、海へ滑って、飛び込んで、宮古島の透明な海を思い切り楽しめる新しい海遊びです。",
    image: "/images/slide-boat-photo.jpg",
    images: TOUR_IMAGE_PATHS.slideBoat,
    color: "cyan",
    gradientFrom: "from-cyan-600",
    gradientTo: "to-emerald-500",
    price: planPrice("slide-boat"),
    priceNote: "大人1名あたり",
    childPrice: `${planPrice("slide-boat", true)}（子供）`,
    duration: getCustomerDurationDetailLabel("slide-boat"),
    age: `${getPlanAgeLabel("slide-boat")}${PLAN_PRICE_DATA["slide-boat"].status === "coming_soon" ? "（予定）" : ""}`,
    highlights: [
      { title: "滑り台付きボート", description: "ボートから海へそのまま滑り込める、遊び心のある新体験。海に入る瞬間から盛り上がるので、お子様連れやグループ旅行にぴったりです。", icon: "lifebuoy" },
      { title: "飛び込み台でアクティブに遊べる", description: "飛び込み台付きだから、ただ移動するだけのボートではなく、海の上そのものが遊び場になります。写真や動画にも残したくなる体験です。", icon: "sparkles" },
      { title: "ボートシュノーケル", description: "トゥリバーマリーナから出発し、海況を見ながらシュノーケルを楽しむ予定です。ビーチエントリーとは違う開放感を味わえます。", icon: "compass" },
      { title: "ファミリー・グループ向け", description: "午前便・午後便の2便制を予定。家族旅行、友人グループ、アクティブに遊びたい方に向けた新しい選択肢です。", icon: "users" },
    ],
    flow: [
      { step: 1, title: "トゥリバーマリーナ集合・受付", description: "集合後、受付と体調確認を行います。船の設備や安全ルールも出発前にご案内します。", time: "開始15分前" },
      { step: 2, title: "出港・安全説明", description: "ボートでポイントへ向かいます。滑り台・飛び込み台の使い方、シュノーケル時の注意点を丁寧に説明します。" },
      { step: 3, title: "スライダーボート遊び・シュノーケル", description: "滑り台、飛び込み台、ボートシュノーケルを楽しむメイン時間。宮古島の透明な海でアクティブに遊びます。", time: "約2時間" },
      { step: 4, title: "帰港・解散", description: "トゥリバーマリーナへ戻り、片付け後に解散予定です。" },
    ],
    included: ["乗船料", "シュノーケル器材一式", "ライフジャケット", "ガイド同行", "保険", "安全説明"],
    whatToBring: ["水着（着用して集合）", "着替え", "タオル", "日焼け止め", "飲み物", "酔い止め（必要な方）"],
    precautions: ["現在は近日公開のため予約受付前です", policyCopy.pregnancyNotice, "持病・健康上の不安がある方は必ず予約前にご相談ください。内容を確認したうえで参加可否をご案内します。", "飲酒されている方は参加不可", "海況・天候により内容や開催可否が変更になる場合があります"],
    location: "トゥリバーマリーナ",
    locationNote: "集合場所はトゥリバーマリーナを予定しています。受付開始時に詳細をご案内します。",
    meetingPoint: {
      name: "トゥリバーマリーナ",
      mapUrl: "https://maps.app.goo.gl/5EFXTxxksYLeeSGL7?g_st=ic",
      embedUrl: "https://www.google.com/maps?q=%E3%83%88%E3%82%A5%E3%83%AA%E3%83%90%E3%83%BC%E3%83%9E%E3%83%AA%E3%83%BC%E3%83%8A%20%E5%AE%AE%E5%8F%A4%E5%B3%B6&output=embed",
    },
    meetingTime: "午前便 8:45 / 午後便 12:45（予定）",
    paymentMethod: `${policyCopy.paymentSummary}予定（受付開始時に正式案内）`,
    faqs: [
      { q: "いつから予約できますか？", a: "現在は近日公開の告知段階です。予約受付開始日は決まり次第、このページとLINEでご案内します。" },
      { q: "開催時間は決まっていますか？", a: "午前便 9:00〜12:00、午後便 13:00〜16:00を予定しています。海況や運航準備により変更になる場合があります。" },
      { q: "集合場所はどこですか？", a: "トゥリバーマリーナを予定しています。Google Mapsのリンクはページ内の集合場所マップから確認できます。" },
      { q: "子供も参加できますか？", a: `${getParticipantAgeRange("slide-boat", "child")!.min}歳以上を想定しています。正式な参加条件は予約受付開始時に安全基準とあわせてご案内します。` },
    ],
  },
}
