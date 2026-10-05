// クーポン定義（サーバー側が唯一の真実）
// クライアントはプレビュー表示用にのみ参照し、最終的な割引額はサーバーが再計算する
export const COUPON_LIST: Record<string, number> = {
  UMIGAME500: 500,
  カメハメハ: 1000,
  // ナイトツアー限定（2026-10-05 オーナー要望）。使えるプランは COUPON_PLAN_LIMITS で指定
  YASHIGANI500: 500,
}

// 特定のプランでだけ使えるクーポン。ここに無いクーポンは、対象外プラン以外ならどのプランでも使える。
// label はプラン違いで使えないときの案内（「このクーポンは◯◯専用です」）に使う。
export const COUPON_PLAN_LIMITS: Record<string, { planIds: ReadonlySet<string>; label: string }> = {
  // ナイトツアー：通常（S3）・貸切（S5）。ナイトを含むセット（C1/C2/C5/C6）はクーポン対象外のまま
  YASHIGANI500: { planIds: new Set(['S3', 'S5']), label: 'ナイトツアー' },
}

/** プラン限定クーポンを対象外のプランで使おうとしているとき、そのクーポンの対象（例: ナイトツアー）を返す */
export function getCouponPlanLimitLabel(couponCode: unknown, planId: string | undefined | null): string | null {
  const code = typeof couponCode === 'string' ? couponCode.trim() : ''
  if (!Object.prototype.hasOwnProperty.call(COUPON_PLAN_LIMITS, code)) return null
  const limit = COUPON_PLAN_LIMITS[code]
  return planId && limit.planIds.has(planId) ? null : limit.label
}

// クーポン対象外のプラン。
// セットプラン（昼夜セットC1/C2・海空セットC3）は既に1人¥1,000のセット割引済みのため、
// クーポンの重ねがけ（二重割引）を不可とする。
export const COUPON_INELIGIBLE_PLAN_IDS = new Set(['C1', 'C2', 'C3', 'C4', 'C5', 'C6'])

export const isCouponEligiblePlan = (planId: string | undefined | null): boolean =>
  !planId || !COUPON_INELIGIBLE_PLAN_IDS.has(planId)

export type ParticipantCategory = 'adult' | 'child' | 'under3'

export function calculateCouponDiscount(
  couponCode: unknown,
  participants: Array<{ category: string }>,
  planId?: string | null
): { discount: number; code: string } {
  const code = typeof couponCode === 'string' ? couponCode.trim() : ''
  if (!code || !Object.prototype.hasOwnProperty.call(COUPON_LIST, code)) {
    return { discount: 0, code: '' }
  }
  // 対象外プラン・プラン限定クーポンの対象外プランは、コードが有効でも割引0
  if (!isCouponEligiblePlan(planId)) return { discount: 0, code: '' }
  if (getCouponPlanLimitLabel(code, planId)) return { discount: 0, code: '' }
  const discountPerPerson = COUPON_LIST[code]
  if (!Number.isFinite(discountPerPerson) || discountPerPerson <= 0) {
    return { discount: 0, code: '' }
  }
  const eligibleCount = participants.filter(
    (p) => p.category === 'adult' || p.category === 'child'
  ).length
  return { discount: eligibleCount * discountPerPerson, code }
}
