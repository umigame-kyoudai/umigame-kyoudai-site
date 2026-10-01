import assert from "node:assert/strict"
import test from "node:test"

import { ANALYTICS_EVENT_NAMES, ANALYTICS_PROPERTY_KEYS } from "./analytics-schema.ts"

import {
  buildGAEvent,
  buildVercelEventProperties,
  categorizeBookingFailure,
  sanitizeAnalyticsProperties,
  trackEvent,
} from "./analytics.ts"

test("maps a successful booking request to the GA4 generate_lead event", () => {
  const event = buildGAEvent("booking_submitted", {
    locale: "ja",
    plan: "S1",
    planName: "Sea Turtle Snorkeling",
    headcount: 2,
    adultCount: 1,
    childCount: 1,
    under3Count: 0,
    total: 15000,
    source: "google / organic",
  })

  assert.deepEqual(event, {
    name: "generate_lead",
    params: {
      currency: "JPY",
      value: 15000,
      lead_source: "google / organic",
      plan_id: "S1",
      plan_name: "Sea Turtle Snorkeling",
      locale: "ja",
      headcount: 2,
      adult_count: 1,
      child_count: 1,
      under_3_count: 0,
    },
  })
})

test("does not forward unexpected or personally identifiable booking properties to GA4", () => {
  const event = buildGAEvent("booking_submitted", {
    total: 6500,
    customerEmail: "guest@example.com",
    customerPhone: "09012345678",
    lineUserId: "U-secret",
  })

  assert.deepEqual(event, {
    name: "generate_lead",
    params: {
      currency: "JPY",
      value: 6500,
    },
  })
})

test("does not send booking failures to GA4", () => {
  assert.equal(buildGAEvent("booking_failed", { plan: "S1" }), null)
})

test("keeps only allowlisted analytics scalar properties", () => {
  assert.deepEqual(
    sanitizeAnalyticsProperties({
      locale: "ja",
      plan: "S1",
      adultCount: 2,
      childCount: 1,
      under3Count: 0,
      total: 19500,
      line_logged_in: true,
      customerName: "Test Guest",
      customerEmail: "guest@example.com",
      customerPhone: "09012345678",
      lineUserId: "U-secret",
      visitor_id: "visitor-secret",
      session_id: "session-secret",
      occurred_at: "2026-07-22T00:00:00.000Z",
      nested: { email: "guest@example.com" },
      list: ["secret"],
      vitalValue: Number.POSITIVE_INFINITY,
    }),
    {
      locale: "ja",
      plan: "S1",
      adultCount: 2,
      childCount: 1,
      under3Count: 0,
      total: 19500,
      line_logged_in: true,
    },
  )
})

test("categorizes booking failures without exposing response details", () => {
  assert.equal(categorizeBookingFailure(), "network")
  assert.equal(categorizeBookingFailure(422), "validation")
  assert.equal(categorizeBookingFailure(403), "authentication")
  assert.equal(categorizeBookingFailure(409), "conflict")
  assert.equal(categorizeBookingFailure(429), "rate_limited")
  assert.equal(categorizeBookingFailure(503), "server")
  assert.equal(categorizeBookingFailure(418), "unexpected_response")
})

test("sends one GA4 event for one successful booking tracking call", (t) => {
  const calls = []
  const previousWindow = globalThis.window
  globalThis.window = {
    gtag: (...args) => calls.push(args),
    localStorage: {
      getItem: (key) => key === "customer_tracking_consent_v1"
        ? JSON.stringify({ status: "accepted", version: "2026-08-13", decidedAt: "2026-08-13T00:00:00.000Z" })
        : null,
    },
  }
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  })

  trackEvent("booking_submitted", {
    locale: "en",
    plan: "S2",
    planName: "Private Sea Turtle Snorkeling",
    headcount: 3,
    total: 28000,
    source: "instagram / social",
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], "event")
  assert.equal(calls[0][1], "generate_lead")
})

test("keeps the existing CTA event mapping", () => {
  assert.deepEqual(buildGAEvent("book_cta_click", { location: "hero" }), {
    name: "reservation_click",
    params: { location: "hero" },
  })
})

// 詳細計測が付ける共通の文脈項目（lib/detailed-analytics.ts の forwardToAnalyticsClients と同じ）
const CONTEXT = {
  page_path: "/book",
  locale: "ja",
  device_type: "mobile",
  viewport_width: 390,
  viewport_height: 844,
  referrer_host: "www.instagram.com",
  landing_page: "/",
  utm_source: "instagram",
  utm_medium: "story",
  utm_campaign: "",
  utm_content: "",
  utm_term: "",
  browser: "Safari",
  os: "iOS",
  screen_width: 390,
  screen_height: 844,
  connection_type: "4g",
}

test("sends Vercel only the plan and lead source for a completed booking", () => {
  assert.deepEqual(
    buildVercelEventProperties("booking_submitted", {
      ...CONTEXT,
      plan: "S1",
      planName: "ウミガメシュノーケルツアー",
      headcount: 2,
      adultCount: 1,
      childCount: 1,
      under3Count: 0,
      total: 12500,
      currency: "JPY",
      source: "instagram / story",
      outcome: "success",
      booking_id: "UK-0001",
    }),
    { plan: "S1", source: "instagram / story" },
  )
})

test("sends Vercel the plan and error category for a failed booking", () => {
  assert.deepEqual(
    buildVercelEventProperties("booking_failed", {
      ...CONTEXT,
      plan: "S3",
      source: "google / organic",
      outcome: "failed",
      errorCategory: "network",
    }),
    { plan: "S3", errorCategory: "network" },
  )
})

test("keeps simple CTA clicks unchanged for Vercel", () => {
  assert.deepEqual(buildVercelEventProperties("book_cta_click", { location: "hero" }), { location: "hero" })
})

test("does not use empty values for the two Vercel slots", () => {
  assert.deepEqual(
    buildVercelEventProperties("booking_abandoned", { plan: "", location: null, last_stage: "date", stage: "time" }),
    { last_stage: "date", stage: "time" },
  )
})

test("does not send page views or Web Vitals to Vercel custom events", () => {
  assert.equal(buildVercelEventProperties("page_view", CONTEXT), null)
  assert.equal(buildVercelEventProperties("web_vital", { ...CONTEXT, vitalName: "LCP", vitalValue: 1200 }), null)
})

test("never sends more than 2 properties or values over 255 characters to Vercel", () => {
  const everything = Object.fromEntries(ANALYTICS_PROPERTY_KEYS.map((key) => [key, "x".repeat(300)]))
  for (const name of ANALYTICS_EVENT_NAMES) {
    const props = buildVercelEventProperties(name, { ...CONTEXT, ...everything })
    if (props === null) continue
    assert.ok(Object.keys(props).length <= 2, `${name}: ${Object.keys(props).join(", ")}`)
    for (const value of Object.values(props)) {
      assert.ok(String(value).length <= 255, `${name}: value too long`)
    }
  }
})
