// レンタル料金の運用ルールを固定するテスト。
//
// ルール: 通常プランは有料（1点 ¥1,000）、貸切プランは無料（単体・セットを問わず）。
// 過去に C4（貸切 海空セット）と S7（貸切 ドローンSUP）が有料のまま取り残された
// 設定漏れがあったため、貸切プランの追加時に自動で無料側へ入ることを検査する。

import assert from "node:assert/strict"
import test from "node:test"

import {
  calculateRentalTotal,
  getPlanRentalOptions,
  getRentalUnitPrice,
  planOffersRentals,
  RENTAL_INCLUDED_PLAN_IDS,
  RENTAL_UNIT_PRICE_YEN,
} from "./rental-options.ts"
import { PRIVATE_PLAN_IDS, isNightTourPlan } from "./plan-flags.ts"
import { PLAN_DETAILS } from "./plan-details.ts"
import { PLANS } from "./data.ts"

const twoAdults = [
  { category: "adult", wetsuitRental: true, prescriptionMaskRental: true },
  { category: "adult", wetsuitRental: true, prescriptionMaskRental: false },
]

test("every private plan gets rentals for free", () => {
  for (const planId of PRIVATE_PLAN_IDS) {
    assert.equal(
      getRentalUnitPrice(planId),
      0,
      `貸切プランなのにレンタルが有料: ${planId}`,
    )
  }
})

test("no group plan is accidentally made free", () => {
  for (const planId of Object.keys(PLAN_DETAILS)) {
    if (PRIVATE_PLAN_IDS.has(planId)) continue
    assert.equal(
      getRentalUnitPrice(planId),
      RENTAL_UNIT_PRICE_YEN,
      `通常プランなのにレンタルが無料になっている: ${planId}`,
    )
  }
})

test("the free-rental list is derived from the private plan list", () => {
  // 手書きの一覧に戻すと設定漏れが再発するため、導出であることを固定する
  assert.deepEqual([...RENTAL_INCLUDED_PLAN_IDS].sort(), [...PRIVATE_PLAN_IDS].sort())
})

test("charges 1,000 yen per item on group plans and nothing on private plans", () => {
  // ウェットスーツ2着＋度付きマスク1個（大人のみ）＝3点
  assert.equal(calculateRentalTotal("S1", twoAdults), 3000)
  assert.equal(calculateRentalTotal("C3", twoAdults), 3000)
  assert.equal(calculateRentalTotal("S2", twoAdults), 0)
  assert.equal(calculateRentalTotal("C4", twoAdults), 0)
  assert.equal(calculateRentalTotal("S7", twoAdults), 0)
})

test("night tours offer no rentals at all", () => {
  for (const planId of Object.keys(PLAN_DETAILS)) {
    if (!isNightTourPlan(planId)) continue
    assert.equal(planOffersRentals(planId), false, `ナイトツアーでレンタルが提供されている: ${planId}`)
    assert.equal(calculateRentalTotal(planId, twoAdults), 0)
  }
})

test("prescription masks are never charged for children", () => {
  const childOnly = [
    { category: "child", wetsuitRental: false, prescriptionMaskRental: true },
    { category: "under3", wetsuitRental: false, prescriptionMaskRental: true },
  ]
  assert.equal(calculateRentalTotal("S1", childOnly), 0)
})

test("legacy PLANS.options cannot reintroduce paid rentals for any private plan", () => {
  for (const plan of PLANS) {
    assert.deepEqual(plan.options, getPlanRentalOptions(plan.id), plan.id)
    if (isNightTourPlan(plan.id)) {
      assert.deepEqual(plan.options, [], `${plan.id}: ナイトにはレンタルを表示しない`)
      continue
    }
    assert.equal(plan.options.length, 2, plan.id)
    for (const option of plan.options) {
      assert.equal(option.price, getRentalUnitPrice(plan.id), `${plan.id}: ${option.name}`)
      if (PRIVATE_PLAN_IDS.has(plan.id)) assert.equal(option.price, 0, plan.id)
    }
  }
})

test("C4 legacy rental entries contain zero actual prices and an adult-only mask", () => {
  const plan = PLANS.find(({ id }) => id === "C4")
  assert.deepEqual(plan.options.map(({ price }) => price), [0, 0])
  const mask = plan.options.find(({ name }) => name.includes("度付きマスク"))
  assert.equal(mask.adultOnly, true)
  assert.match(mask.name, /大人用のみ/)
})

test("plan pages show rentals as included exactly when they are free", () => {
  for (const [planId, plan] of Object.entries(PLAN_DETAILS)) {
    if (!planOffersRentals(planId)) continue

    const listedAsIncluded = (plan.included ?? []).some((item) => item.includes("ウェットスーツ"))
    const listedAsPaid = (plan.notIncluded ?? []).some((item) => item.includes("ウェットスーツ"))
    if (!listedAsIncluded && !listedAsPaid) continue

    const isFree = getRentalUnitPrice(planId) === 0
    assert.equal(
      listedAsIncluded,
      isFree,
      `${planId}: 詳細ページの表示と実際の料金が食い違っている（無料=${isFree}）`,
    )
  }
})
