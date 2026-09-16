import assert from "node:assert/strict"
import test from "node:test"

import { ADULT_PRICE, CHILD_PRICE, PLANS, TIME_SLOTS } from "./data.ts"
import { PLAN_DETAILS } from "./plan-details.ts"
import { PLAN_PRICE_DATA } from "./plan-price-display.ts"
import { getPlanMaxParticipants } from "./booking-rules.ts"
import { getCustomerDurationHours } from "./plan-durations.ts"
import {
  COMBO_TURTLE_TIMES,
  DAY_SUP_TIMES,
  NIGHT_TOUR_TIMES,
  SNORKEL_TOUR_TIMES,
  getAdultAgeMax,
  getParticipantAgeRange,
  isComboPlan,
  isNightTourPlan,
} from "./plan-flags.ts"

test("legacy plan data retains every published plan and canonical names and prices", () => {
  assert.deepEqual(PLANS.map(({ id }) => id).sort(), Object.keys(PLAN_DETAILS).sort())
  for (const plan of PLANS) {
    assert.equal(plan.name, PLAN_DETAILS[plan.id].name, plan.id)
    assert.equal(plan.price, PLAN_PRICE_DATA[plan.id].price, plan.id)
    assert.equal(plan.childPrice, PLAN_PRICE_DATA[plan.id].childPrice, plan.id)
  }
  assert.equal(ADULT_PRICE, PLAN_PRICE_DATA.S1.price)
  assert.equal(CHILD_PRICE, PLAN_PRICE_DATA.S1.childPrice)
})

test("legacy plan age and participant limits agree with booking rules", () => {
  for (const plan of PLANS) {
    const youngest = getParticipantAgeRange(plan.id, "under3") ?? getParticipantAgeRange(plan.id, "child")
    const expectedAge = `${youngest.min}〜${getAdultAgeMax(plan.id)}歳`
    assert.equal(plan.ageRange, `${expectedAge}${plan.status === "coming_soon" ? "（予定）" : ""}`, plan.id)
    assert.equal(plan.maxParticipants, getPlanMaxParticipants(plan.id), plan.id)
  }
})

test("legacy durations use customer totals, including day-night and full-day sets", () => {
  for (const plan of PLANS) {
    assert.equal(plan.durationHours, getCustomerDurationHours(plan.id), plan.id)
  }
  for (const [id, hours] of Object.entries({ C1: 3.5, C2: 3.5, C3: 3, C4: 3, C5: 4.5, C6: 4.5 })) {
    assert.equal(PLANS.find((plan) => plan.id === id).durationHours, hours, id)
  }
})

test("legacy selectable start times agree with plan flags", () => {
  assert.deepEqual(TIME_SLOTS, SNORKEL_TOUR_TIMES)
  for (const plan of PLANS) {
    const expected = isComboPlan(plan.id)
      ? COMBO_TURTLE_TIMES
      : isNightTourPlan(plan.id)
        ? NIGHT_TOUR_TIMES
        : ["S6", "S7"].includes(plan.id)
          ? DAY_SUP_TIMES
          : ["S1", "S2"].includes(plan.id)
            ? SNORKEL_TOUR_TIMES
            : null
    if (expected) assert.deepEqual(plan.timeTags, expected, plan.id)
  }
})
