import { createHmac, timingSafeEqual } from "node:crypto"
import { getCookieValue } from "@/lib/referral"
import { BOOKING_SOURCE_COOKIE, BOOKING_SOURCE_SIGNING_CONTEXT, decodeUnverifiedBookingSource, type BookingSource } from "@/lib/booking-source"

export function getBookingSourceSecret(): string | null {
  const secret = (process.env.BOOKING_SOURCE_SECRET || process.env.REFERRAL_COOKIE_SECRET || "").trim()
  return secret.length >= 32 ? secret : null
}
function signature(encoded: string, secret: string): string {
  return createHmac("sha256", secret).update(BOOKING_SOURCE_SIGNING_CONTEXT + encoded).digest("base64url")
}
export function signBookingSource(payload: BookingSource, secret: string): string {
  if (secret.trim().length < 32) throw new Error("Booking source secret is not configured")
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const token = `${encoded}.${signature(encoded, secret)}`
  if (!decodeUnverifiedBookingSource(token)) throw new Error("Invalid booking source")
  return token
}
export function verifyBookingSource(token: unknown, secret: string | null, now = Date.now()): BookingSource | null {
  const payload = decodeUnverifiedBookingSource(token, now)
  if (!payload || !secret || secret.length < 32 || typeof token !== "string") return null
  const [encoded, actual] = token.split(".")
  const expected = signature(encoded, secret)
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected)) ? payload : null
}
// CookieとLINE復帰後の引継ぎ値を検証し、最後の明示的な入口を採用する。
export function resolveBookingSource(cookieHeader: string | null, transportToken: unknown, secret = getBookingSourceSecret()) {
  const candidates = [getCookieValue(cookieHeader, BOOKING_SOURCE_COOKIE), transportToken]
    .flatMap(token => {
      const source = verifyBookingSource(token, secret)
      return source && typeof token === "string" ? [{ source, token }] : []
    })
    .sort((a, b) => Date.parse(b.source.acquiredAt) - Date.parse(a.source.acquiredAt))
  return candidates[0] || null
}
