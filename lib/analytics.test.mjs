import assert from "node:assert/strict"
import test from "node:test"

import { buildGAEvent, trackEvent } from "./analytics.ts"

test("maps a successful booking request to the GA4 generate_lead event", () => {
  const event = buildGAEvent("booking_submitted", {
    locale: "ja",
    plan: "S1",
    planName: "Sea Turtle Snorkeling",
    headcount: 2,
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

test("sends one GA4 event for one successful booking tracking call", (t) => {
  const calls = []
  const previousWindow = globalThis.window
  globalThis.window = {
    gtag: (...args) => calls.push(args),
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
