import assert from "node:assert/strict"
import test from "node:test"
import { calculateCouponDiscount } from "./coupons.ts"

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
