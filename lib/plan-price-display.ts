import { PLANS } from "@/lib/data"

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

function formatYen(price: number): string {
  return `¥${price.toLocaleString()}`
}

function getChildAgeNote(planId: string): string {
  if (planId === "S3" || planId === "S5") return "4〜12歳"
  if (planId === "slide-boat") return "5〜12歳予定"
  return "5〜12歳"
}

export function getPlanPriceDisplay(planId: string): PlanPriceDisplay | null {
  const plan = PLANS.find((item) => item.id === planId)
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
  }

  return {
    rows,
    caption,
    compact: `大人${adultPrice} / 子供${childPrice}`,
  }
}
