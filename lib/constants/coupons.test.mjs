import assert from "node:assert/strict"
import test from "node:test"
import { calculateCouponDiscount, getCouponPlanLimitLabel } from "./coupons.ts"

test("unregistered and inherited property names never produce a non-finite discount", () => {
  for (const code of ['toString', 'constructor', '__proto__', 'valueOf', 'hasOwnProperty', {}, [], 500, null, undefined]) {
    assert.deepEqual(calculateCouponDiscount(code, [{ category: 'adult' }], 'S1'), { discount: 0, code: '' })
  }
})

test("normalizes surrounding whitespace before calculating a coupon", () => {
  assert.deepEqual(calculateCouponDiscount(' \tUMIGAME500\n', [{ category: 'adult' }], 'S1'), { discount: 500, code: 'UMIGAME500' })
})

test("recalculates coupon value when the eligible headcount changes", () => {
  const oneGuest = calculateCouponDiscount("UMIGAME500", [{ category: "adult" }], "S1")
  const threeGuests = calculateCouponDiscount(
    "UMIGAME500",
    [{ category: "adult" }, { category: "child" }, { category: "child" }],
    "S1",
  )

  assert.deepEqual(oneGuest, { discount: 500, code: "UMIGAME500" })
  assert.deepEqual(threeGuests, { discount: 1500, code: "UMIGAME500" })
})

test("does not discount under-3 guests or coupon-ineligible plans", () => {
  assert.deepEqual(
    calculateCouponDiscount("UMIGAME500", [{ category: "adult" }, { category: "under3" }], "S3"),
    { discount: 500, code: "UMIGAME500" },
  )
  assert.deepEqual(
    calculateCouponDiscount("UMIGAME500", [{ category: "adult" }], "C2"),
    { discount: 0, code: "" },
  )
})

test("YASHIGANI500 takes ¥500 per guest off the night tour only", () => {
  const guests = [{ category: "adult" }, { category: "child" }, { category: "under3" }]
  assert.deepEqual(calculateCouponDiscount("YASHIGANI500", guests, "S3"), { discount: 1000, code: "YASHIGANI500" })
  assert.deepEqual(calculateCouponDiscount(" YASHIGANI500 ", guests, "S5"), { discount: 1000, code: "YASHIGANI500" })
  for (const planId of ["S1", "S2", "S4", "S6", "S7", "S8", "slide-boat", "C1", "C2", "C5", "C6", "", undefined]) {
    assert.deepEqual(calculateCouponDiscount("YASHIGANI500", guests, planId), { discount: 0, code: "" }, String(planId))
  }
})

test("plan-limited coupons explain which tour they are for; other coupons are unaffected", () => {
  assert.equal(getCouponPlanLimitLabel("YASHIGANI500", "S1"), "ナイトツアー")
  assert.equal(getCouponPlanLimitLabel("YASHIGANI500", undefined), "ナイトツアー")
  assert.equal(getCouponPlanLimitLabel("YASHIGANI500", "S3"), null)
  assert.equal(getCouponPlanLimitLabel("UMIGAME500", "S1"), null)
  assert.equal(getCouponPlanLimitLabel("toString", "S1"), null)
  assert.deepEqual(calculateCouponDiscount("UMIGAME500", [{ category: "adult" }], "S3"), { discount: 500, code: "UMIGAME500" })
})
