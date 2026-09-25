import { NIGHT_GUIDE } from "@/lib/staff"
import { SITE_CONFIG } from "@/lib/site-config"

// 集客経由は担当ガイド・報酬付き紹介とは独立した予約情報。
export const BOOKING_SOURCE_COOKIE = "uk_booking_source_v1"
export const BOOKING_SOURCE_QUERY = "booking_source"
export const BOOKING_SOURCE_MAX_AGE = 30 * 24 * 60 * 60
export const BOOKING_SOURCE_SIGNING_CONTEXT = "uk-booking-source:v1:"
export const BOOKING_SOURCES = {
  souichiro: { name: `${NIGHT_GUIDE.name}さん`, landingPath: NIGHT_GUIDE.tourPage },
  yamachan: { name: "山ちゃん", landingPath: "/" },
  umigame: { name: `${SITE_CONFIG.siteNameJa}公式`, landingPath: "/" },
} as const
export type BookingSourceCode = keyof typeof BOOKING_SOURCES
export interface BookingSource {
  source: BookingSourceCode
  entry: "instagram"
  acquiredAt: string
}
export function isBookingSourceCode(value: unknown): value is BookingSourceCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(BOOKING_SOURCES, value)
}
// 署名検証はサーバーで必ず行う。この関数だけでは経由を認定しない。
export function decodeUnverifiedBookingSource(token: unknown, now = Date.now()): BookingSource | null {
  if (typeof token !== "string" || token.length > 512 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) return null
  try {
    const encoded = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")
    const payload = JSON.parse(atob(encoded))
    const acquiredAtMs = Date.parse(payload.acquiredAt)
    if (!isBookingSourceCode(payload.source) || payload.entry !== "instagram" ||
        typeof payload.acquiredAt !== "string" || !Number.isFinite(acquiredAtMs) ||
        acquiredAtMs > now + 5 * 60 * 1000 || now - acquiredAtMs >= BOOKING_SOURCE_MAX_AGE * 1000) return null
    return { source: payload.source, entry: "instagram", acquiredAt: new Date(acquiredAtMs).toISOString() }
  } catch { return null }
}
