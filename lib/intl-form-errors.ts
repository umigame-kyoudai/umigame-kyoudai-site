import type { IntlFormCopy } from "@/lib/i18n/types"

// API / SDK の自由文は表示しない。状態だけを受け取り、選択中の言語の案内を返す。
export function getIntlCouponError(copy: IntlFormCopy, status?: number, recalculating = false): string {
  if (status === 429) return copy.rateLimitError
  if (status === undefined || status >= 500) return recalculating ? copy.couponRecalcError : copy.couponNetworkError
  return recalculating ? copy.couponChangedInvalid : copy.couponInvalid
}

export function getIntlBookingError(
  copy: IntlFormCopy,
  status: number | undefined,
  code: string | undefined,
  deadlineMessage: string,
): string {
  if (code === "BOOKING_DEADLINE_PASSED") return deadlineMessage
  if (status === 401) return copy.lineExpiredError
  if (status === 429) return copy.rateLimitError
  if (status === 400) return copy.submitValidationError
  if (status === undefined) return copy.submitNetworkError
  return copy.submitFailedError
}
