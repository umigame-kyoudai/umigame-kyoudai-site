import { getPlanMaxParticipants } from "@/lib/booking-rules"
import { ADULT_AGE_MIN, COMBO_COMPONENT_PLAN_IDS, FREE_UNDER3_PLAN_IDS, getParticipantAgeRange, isPrivatePlan } from "@/lib/plan-flags"

export interface PlanPriceRow {
  label: string
  price: string
  note?: string
}

export interface PlanPriceDisplay {
  rows: PlanPriceRow[]
  caption?: string
  compact: string
}

export const PLAN_PRICE_DATA: Record<string, { price: number; childPrice?: number; status?: "active" | "coming_soon" }> = {
  S1: { price: 6500, childPrice: 6000 },
  S2: { price: 9000, childPrice: 9000 },
  S3: { price: 4000, childPrice: 4000 },
  S4: { price: 9500, childPrice: 8500 },
  S8: { price: 7500, childPrice: 6500 },
  S5: { price: 8000, childPrice: 8000 },
  S6: { price: 7500, childPrice: 6500 },
  S7: { price: 9500, childPrice: 8500 },
  C1: { price: 9500, childPrice: 9000 },
  C2: { price: 16000, childPrice: 16000 },
  C3: { price: 13000, childPrice: 11500 },
  C4: { price: 17500, childPrice: 16500 },
  C5: { price: 16000, childPrice: 14500 },
  C6: { price: 24500, childPrice: 23500 },
  "slide-boat": { price: 14000, childPrice: 12000, status: "coming_soon" },
}

// プランの呼び名コード（お客様・スタッフが「S1のプラン」等と呼ぶための短い識別タグ）。
// 内部IDがそのままコード（S1〜S7・C1〜C4）。slide-boatのみ短縮コードを割り当てる。
export function getPlanCode(planId: string): string {
  return planId === "slide-boat" ? "SB" : planId.toUpperCase()
}

function formatYen(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`
}

function getChildAgeNote(planId: string): string {
  const range = getParticipantAgeRange(planId, "child")!
  return `${range.min}〜${range.max}歳${PLAN_PRICE_DATA[planId]?.status === "coming_soon" ? "予定" : ""}`
}

/** セット割引は単品の大人料金合計との差額。GASの内部配分額とは別。 */
export function getComboSavings(planId: string): { regularPrice: number; savings: number } | null {
  const componentIds = COMBO_COMPONENT_PLAN_IDS[planId]
  if (!componentIds) return null
  const regularPrice = componentIds.reduce((total, id) => total + PLAN_PRICE_DATA[id].price, 0)
  return { regularPrice, savings: regularPrice - PLAN_PRICE_DATA[planId].price }
}

export function getPlanPriceDisplay(planId: string): PlanPriceDisplay | null {
  const plan = PLAN_PRICE_DATA[planId]
  if (!plan) return null

  const adultPrice = formatYen(plan.price)
  const childPrice = formatYen(plan.childPrice ?? plan.price)
  const rows: PlanPriceRow[] = [
    { label: "大人", price: adultPrice, note: `${ADULT_AGE_MIN}歳以上` },
    { label: "子供", price: childPrice, note: getChildAgeNote(planId) },
  ]

  let caption: string | undefined
  const comboSavings = getComboSavings(planId)
  if (plan.status === "coming_soon") {
    caption = "料金・対象年齢は予定です"
  } else if (FREE_UNDER3_PLAN_IDS.has(planId)) {
    caption = `${getParticipantAgeRange(planId, "under3")!.max}歳以下無料`
  } else if (planId === "S2") {
    caption = `1名あたり・最大${getPlanMaxParticipants(planId)}名まで`
  } else if (planId === "S4") {
    caption = "1組貸切・ドローン撮影付き"
  } else if (planId === "S6" || planId === "S8") {
    caption = "ドローン撮影付き"
  } else if (planId === "S7") {
    caption = "1組貸切・ドローン撮影付き"
  } else if (comboSavings) {
    caption = `${isPrivatePlan(planId) ? "貸切" : ""}通常${formatYen(comboSavings.regularPrice)}・${comboSavings.savings.toLocaleString("ja-JP")}円お得`
  }

  return {
    rows,
    caption,
    compact: `大人${adultPrice} / 子供${childPrice}`,
  }
}
