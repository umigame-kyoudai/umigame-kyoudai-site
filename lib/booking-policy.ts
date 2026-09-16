/** お客様に適用するキャンセル・支払い条件。セット内部の売上配分とは別管理。 */
export const BOOKING_POLICY = {
  previousDayCancellationPercent: 0,
  sameDayCancellationPercent: 100,
  noShowCancellationPercent: 100,
  operatorWeatherCancellationPercent: 0,
  operatorWeatherTourChargePercent: 0,
  paymentTiming: "tour_day",
  paymentLocation: "on_site",
  paymentMethod: "cash",
  prepaid: false,
  setPaymentTiming: "first_tour_start",
  setPaymentAmount: "full_package_price",
  partialCancellationSettlement: "performed_single_tour_prices",
} as const

export type PolicyLocale = "ja" | "en" | "ko" | "zh-tw"

export function formatCancellationFee(percent: number, locale: PolicyLocale = "ja"): string {
  const free = { ja: "無料", en: "free", ko: "무료", "zh-tw": "免費" }
  return percent === 0 ? free[locale] : `${percent}%`
}

// lib/data.ts の従来の表示用exportとの互換性を維持する。
export const CANCELLATION_POLICY = {
  previousDay: formatCancellationFee(BOOKING_POLICY.previousDayCancellationPercent),
  sameDay: formatCancellationFee(BOOKING_POLICY.sameDayCancellationPercent),
  noShow: formatCancellationFee(BOOKING_POLICY.noShowCancellationPercent),
  weatherCancellation: formatCancellationFee(BOOKING_POLICY.operatorWeatherCancellationPercent),
}
