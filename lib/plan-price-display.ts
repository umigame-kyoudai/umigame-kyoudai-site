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

const UNDER3_FREE_PLAN_IDS = new Set(["S3", "S5"])

export const PLAN_PRICE_DATA: Record<string, { price: number; childPrice?: number; status?: "active" | "coming_soon" }> = {
  S1: { price: 6500, childPrice: 6000 },
  S2: { price: 9000, childPrice: 9000 },
  S3: { price: 4000, childPrice: 4000 },
  S4: { price: 8000, childPrice: 6000 },
  S5: { price: 8000, childPrice: 8000 },
  C1: { price: 9500, childPrice: 9000 },
  "slide-boat": { price: 14000, childPrice: 12000, status: "coming_soon" },
}

function formatYen(price: number): string {
  return `¥${price.toLocaleString()}`
}

function getChildAgeNote(planId: string): string {
  if (planId === "S3" || planId === "S5") return "4〜12歳"
  if (planId === "slide-boat") return "5〜12歳予定"
  return "5〜12歳"
}

export function getPlanPriceDisplay(planId: string): PlanPriceDisplay | null {
  const plan = PLAN_PRICE_DATA[planId]
  if (!plan) return null

  const adultPrice = formatYen(plan.price)
  const childPrice = formatYen(plan.childPrice ?? plan.price)
  const rows: PlanPriceRow[] = [
    { label: "大人", price: adultPrice, note: "13歳以上" },
    { label: "子供", price: childPrice, note: getChildAgeNote(planId) },
  ]

  let caption: string | undefined
  if (plan.status === "coming_soon") {
    caption = "料金・対象年齢は予定です"
  } else if (UNDER3_FREE_PLAN_IDS.has(planId)) {
    caption = "3歳以下無料"
  } else if (planId === "S2") {
    caption = "1名あたり・最大6名まで"
  } else if (planId === "C1") {
    caption = "通常¥10,500・1,000円お得"
  }

  return {
    rows,
    caption,
    compact: `大人${adultPrice} / 子供${childPrice}`,
  }
}
