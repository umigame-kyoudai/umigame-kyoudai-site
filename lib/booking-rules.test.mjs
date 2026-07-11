import assert from "node:assert/strict"
import test from "node:test"
import {
  getPlanMaxParticipants,
  validateBookingRules,
} from "./booking-rules.ts"
import { isParticipantAgeValid } from "./plan-flags.ts"

const adult = { category: "adult", age: 30 }
const child = { category: "child", age: 8 }

test("requires at least one adult", () => {
  assert.deepEqual(
    validateBookingRules({ planId: "S1", participants: [child], agreedToTerms: true }),
    { code: "ADULT_REQUIRED" },
  )
})

test("enforces the ten-person web limit on every plan that advertises LINE consultation for 11+ guests", () => {
  for (const planId of ["S2", "S7", "C2", "C4", "C6"]) {
    assert.equal(getPlanMaxParticipants(planId), 10)
    assert.deepEqual(
      validateBookingRules({
        planId,
        participants: [adult, child, child, child, child, child, child, child, child, child, child],
        agreedToTerms: true,
      }),
      { code: "MAX_PARTICIPANTS", maxParticipants: 10 },
    )
  }
})

test("requires explicit terms acceptance", () => {
  assert.deepEqual(
    validateBookingRules({ planId: "S1", participants: [adult], agreedToTerms: false }),
    { code: "TERMS_REQUIRED" },
  )
})

test("accepts a valid party and matching age categories", () => {
  assert.equal(validateBookingRules({ planId: "S2", participants: [adult, child], agreedToTerms: true }), null)
  assert.equal(isParticipantAgeValid("S1", "adult", 13), true)
  assert.equal(isParticipantAgeValid("S1", "child", 4), false)
  assert.equal(isParticipantAgeValid("S3", "child", 4), true)
  assert.equal(isParticipantAgeValid("S3", "under3", 0), true)
  assert.equal(isParticipantAgeValid("S1", "under3", 2), false)
})
