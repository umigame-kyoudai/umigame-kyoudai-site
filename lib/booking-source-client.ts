import { BOOKING_SOURCE_QUERY, decodeUnverifiedBookingSource } from "@/lib/booking-source"

const STORAGE_KEY = "booking_source_transport_v1"
// 個人情報や閲覧履歴は保存せず、専用入口の署名付き引継ぎ値だけを保持する。
// 信頼できる経由の判定は予約APIとGASで行う。
export function getBookingSourceToken(): string | null {
  if (typeof window === "undefined") return null
  const candidates: unknown[] = [new URLSearchParams(window.location.search).get(BOOKING_SOURCE_QUERY)]
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try { candidates.push(window[storage].getItem(STORAGE_KEY)) } catch { /* storage may be unavailable */ }
  }
  return candidates.flatMap(token => {
    const payload = decodeUnverifiedBookingSource(token)
    return payload && typeof token === "string" ? [{ token, time: Date.parse(payload.acquiredAt) }] : []
  }).sort((a, b) => b.time - a.time)[0]?.token || null
}
export function captureBookingSource(): void {
  if (typeof window === "undefined") return
  const token = getBookingSourceToken()
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try {
      if (token) window[storage].setItem(STORAGE_KEY, token)
      else window[storage].removeItem(STORAGE_KEY)
    } catch { /* Cookie or the current URL can still carry the source */ }
  }
}
export function bookingSourceLoginReturnUrl(currentUrl: string): string {
  const url = new URL(currentUrl)
  const token = getBookingSourceToken()
  if (token) url.searchParams.set(BOOKING_SOURCE_QUERY, token)
  else url.searchParams.delete(BOOKING_SOURCE_QUERY)
  return url.toString()
}
