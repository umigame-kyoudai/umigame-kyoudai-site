/**
 * お客様向け所要時間の正本（分）。表示文章から数値を逆算しない。
 * セットは各体験の所要目安の合計で、昼夜の待ち時間・ビーチ間の移動は含まない。
 * GAS / Google Calendar の内部占有時間は別管理。この値を予定作成に使用しない。
 * 特に C1/C2 の昼は受付・準備等込みで120分、GASの海側ブロックは90分。
 */
export type CustomerDurationRole = "snorkel" | "sup" | "night" | "boat"

interface CustomerDuration {
  layout: "single" | "day-night" | "sea-sky" | "full-day"
  segments: readonly { role: CustomerDurationRole; minutes: number }[]
}

const snorkel: CustomerDuration = { layout: "single", segments: [{ role: "snorkel", minutes: 120 }] }
const sup: CustomerDuration = { layout: "single", segments: [{ role: "sup", minutes: 120 }] }
const night: CustomerDuration = { layout: "single", segments: [{ role: "night", minutes: 90 }] }
const dayNight: CustomerDuration = {
  layout: "day-night",
  segments: [{ role: "snorkel", minutes: 120 }, { role: "night", minutes: 90 }],
}
const seaSky: CustomerDuration = {
  layout: "sea-sky",
  segments: [{ role: "snorkel", minutes: 90 }, { role: "sup", minutes: 90 }],
}
const fullDay: CustomerDuration = {
  layout: "full-day",
  segments: [...seaSky.segments, ...night.segments],
}

export const PLAN_CUSTOMER_DURATIONS: Readonly<Record<string, CustomerDuration>> = {
  S1: snorkel, S2: snorkel,
  S3: night, S5: night,
  S4: sup, S8: sup, S6: sup, S7: sup,
  C1: dayNight, C2: dayNight,
  C3: seaSky, C4: seaSky,
  C5: fullDay, C6: fullDay,
  "slide-boat": { layout: "single", segments: [{ role: "boat", minutes: 180 }] },
}

function getCustomerDuration(planId: string): CustomerDuration {
  const duration = PLAN_CUSTOMER_DURATIONS[planId]
  if (!duration) throw new Error(`Customer duration is not configured: ${planId}`)
  return duration
}

export function getCustomerDurationMinutes(planId: string): number {
  return getCustomerDuration(planId).segments.reduce((total, segment) => total + segment.minutes, 0)
}

export function getCustomerDurationHours(planId: string): number {
  return getCustomerDurationMinutes(planId) / 60
}

export function getCustomerSegmentDurationLabel(planId: string, role: CustomerDurationRole): string {
  const segment = getCustomerDuration(planId).segments.find((item) => item.role === role)
  if (!segment) throw new Error(`Customer duration segment is not configured: ${planId}/${role}`)
  return `約${segment.minutes / 60}時間`
}

/** カード等で使う短い表示。朝〜夜のセットを連続4.5時間とは表示しない。 */
export function getCustomerDurationLabel(planId: string): string {
  const duration = getCustomerDuration(planId)
  if (duration.layout === "day-night") {
    return duration.segments.map((segment) => `${segment.role === "night" ? "夜" : "昼"}${segment.minutes / 60}時間`).join("＋")
  }
  if (duration.layout === "full-day") return "朝〜夜の1日"
  return `約${getCustomerDurationHours(planId)}時間`
}

/** 詳細ページ用。数値はカード・予約データと同じ分数から生成する。 */
export function getCustomerDurationDetailLabel(planId: string): string {
  const duration = getCustomerDuration(planId)
  const label = getCustomerDurationLabel(planId)
  if (duration.layout === "sea-sky") {
    return `${label}（ウミガメシュノーケル${getCustomerSegmentDurationLabel(planId, "snorkel")}＋ドローンSUP${getCustomerSegmentDurationLabel(planId, "sup")}）`
  }
  if (duration.layout === "full-day") {
    const names: Partial<Record<CustomerDurationRole, string>> = { snorkel: "シュノーケル", sup: "ドローンSUP", night: "ナイトツアー" }
    return `${label}（${duration.segments.map((segment) => `${names[segment.role]}約${segment.minutes / 60}h`).join("＋")}）`
  }
  return label
}
