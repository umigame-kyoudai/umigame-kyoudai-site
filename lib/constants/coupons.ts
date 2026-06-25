// クーポン定義（サーバー側が唯一の真実）
// クライアントはプレビュー表示用にのみ参照し、最終的な割引額はサーバーが再計算する
export const COUPON_LIST: Record<string, number> = {
  UMIGAME500: 500,
  カメハメハ: 1000,
}

// クーポン対象外のプラン。
// セットプラン（昼夜セットC1/C2・海空セットC3）は既に1人¥1,000のセット割引済みのため、
// クーポンの重ねがけ（二重割引）を不可とする。
export const COUPON_INELIGIBLE_PLAN_IDS = new Set(['C1', 'C2', 'C3', 'C4'])

export const isCouponEligiblePlan = (planId: string | undefined | null): boolean =>
  !planId || !COUPON_INELIGIBLE_PLAN_IDS.has(planId)

export type ParticipantCategory = 'adult' | 'child' | 'under3'

export function calculateCouponDiscount(
  couponCode: string | undefined | null,
  participants: Array<{ category: string }>,
  planId?: string | null
): { discount: number; code: string } {
  if (!couponCode) return { discount: 0, code: '' }
  // 対象外プランはコードが有効でも割引0
  if (!isCouponEligiblePlan(planId)) return { discount: 0, code: '' }
  const discountPerPerson = COUPON_LIST[couponCode]
  if (!discountPerPerson) return { discount: 0, code: '' }
  const eligibleCount = participants.filter(
    (p) => p.category === 'adult' || p.category === 'child'
  ).length
  return { discount: eligibleCount * discountPerPerson, code: couponCode }
}
