import { getPlanMaxParticipants } from "@/lib/booking-rules"
import { PLAN_DETAILS } from "@/lib/plan-details"
import { getCustomerDurationLabel } from "@/lib/plan-durations"
import { getParticipantAgeRange, getPlanAgeLabel, isComboPlan, isPrivatePlan } from "@/lib/plan-flags"
import { getComboSavings, getPlanPriceDisplay } from "@/lib/plan-price-display"
import { getRentalUnitPrice } from "@/lib/rental-options"

// ホーム用の事実は保存し直さず、カード・比較表のどちらも同じ正本から導出する。
// キャッチコピー、画像、並び順、bestFor はホームコンポーネントに残す。
export function getHomePlanFacts(planId: string) {
  const detail = PLAN_DETAILS[planId]
  if (!detail) throw new Error(`Unknown home plan: ${planId}`)

  const maxParticipants = getPlanMaxParticipants(planId)
  const freeChildRange = getParticipantAgeRange(planId, "under3")
  const childRange = getParticipantAgeRange(planId, "child")

  return {
    name: detail.name,
    status: detail.status,
    age: `${getPlanAgeLabel(planId)}${detail.status === "coming_soon" ? "予定" : ""}`,
    minimumAge: freeChildRange?.min ?? childRange?.min,
    freeChildNote: freeChildRange ? `${freeChildRange.max}歳以下は無料` : "",
    duration: getCustomerDurationLabel(planId),
    priceDisplay: getPlanPriceDisplay(planId),
    included: detail.included,
    maxParticipants,
    capacityNote: maxParticipants === undefined
      ? undefined
      : `最大${maxParticipants}名・${maxParticipants + 1}名以上はLINE相談`,
    variantLabel: detail.status === "coming_soon"
      ? "近日公開"
      : `${isPrivatePlan(planId) ? "貸切" : "通常"}${isComboPlan(planId) ? "セット" : "プラン"}`,
  }
}

export function getHomeComboSavingsText(planId: string): string {
  const savings = getComboSavings(planId)?.savings
  return savings && savings > 0 ? `通常より${savings.toLocaleString("ja-JP")}円お得` : ""
}

export function getHomeRentalHighlight(planId: string, name: "ウェットスーツ" | "度付きマスク"): string {
  const price = getRentalUnitPrice(planId)
  return `${name}${price === 0 ? "無料" : `¥${price.toLocaleString("ja-JP")}`}${name === "度付きマスク" ? "（大人用のみ）" : ""}`
}
