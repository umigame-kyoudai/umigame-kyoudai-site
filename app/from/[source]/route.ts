import { NextRequest, NextResponse } from "next/server"
import { BOOKING_SOURCE_COOKIE, BOOKING_SOURCE_MAX_AGE, BOOKING_SOURCE_QUERY, BOOKING_SOURCES, isBookingSourceCode } from "@/lib/booking-source"
import { getBookingSourceSecret, signBookingSource } from "@/lib/booking-source-server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" }

export function GET(request: NextRequest, { params }: { params: { source: string } }) {
  const source = params.source
  if (!isBookingSourceCode(source)) return new NextResponse("このリンクは見つかりませんでした。", { status: 404, headers })
  const secret = getBookingSourceSecret()
  if (!secret) return new NextResponse("現在この予約リンクは準備中です。時間をおいてお試しください。", { status: 503, headers })
  const token = signBookingSource({ source, entry: "instagram", acquiredAt: new Date().toISOString() }, secret)
  const url = new URL(BOOKING_SOURCES[source].landingPath, request.url)
  url.searchParams.set(BOOKING_SOURCE_QUERY, token)
  url.searchParams.set("utm_source", "instagram")
  url.searchParams.set("utm_medium", "profile")
  url.searchParams.set("utm_campaign", source)
  // Relative Location keeps the browser on its original host behind a reverse proxy.
  const response = new NextResponse(null, { status: 307, headers: { ...headers, Location: url.pathname + url.search } })
  response.cookies.set({ name: BOOKING_SOURCE_COOKIE, value: token, httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: BOOKING_SOURCE_MAX_AGE })
  return response
}
