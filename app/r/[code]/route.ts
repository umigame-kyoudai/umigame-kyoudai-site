import { type NextRequest, NextResponse } from "next/server"

import {
  REFERRAL_COOKIE_NAME,
  REFERRAL_MAX_AGE_SECONDS,
  buildReferralRedirectUrl,
  createSignedReferralCookie,
  normalizeReferralCampaign,
  normalizeReferralCode,
} from "@/lib/referral"
import { getReferralIssuanceSecret, resolveReferralCookie } from "@/lib/referral-migration"

interface ReferralRouteContext {
  params: Promise<{ code: string }>
}

export async function GET(request: NextRequest, context: ReferralRouteContext) {
  const referralCode = normalizeReferralCode((await context.params).code)
  const campaign = normalizeReferralCampaign(request.nextUrl.searchParams.get("c"))

  if (!referralCode) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  const response = NextResponse.redirect(
    buildReferralRedirectUrl(request.url, referralCode, campaign),
  )
  response.headers.set("cache-control", "private, no-store")
  const secret = getReferralIssuanceSecret()

  if (!secret) {
    console.error(
      "[referral] REFERRAL_COOKIE_SECRET is missing or shorter than 32 characters",
    )
    return response
  }

  const nowMs = Date.now()
  let existing
  try {
    existing = await resolveReferralCookie(request.cookies.get(REFERRAL_COOKIE_NAME)?.value, nowMs)
  } catch {
    // Preserve an unverifiable first referral during a temporary bridge outage.
    console.warn("[referral] Migration verification unavailable; original cookie preserved")
    return response
  }

  // First Referral Wins: a valid, unexpired first referral is never replaced or renewed.
  if (existing.referral && !existing.needsResign) return response

  const cookieValue = createSignedReferralCookie(
    existing.referral || {
      referralCode,
      campaign,
      acquiredAt: new Date(nowMs).toISOString(),
    },
    secret,
  )

  response.cookies.set({
    name: REFERRAL_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: existing.referral
      ? Math.max(0, Math.floor((Date.parse(existing.referral.acquiredAt) + REFERRAL_MAX_AGE_SECONDS * 1000 - nowMs) / 1000))
      : REFERRAL_MAX_AGE_SECONDS,
  })

  return response
}
