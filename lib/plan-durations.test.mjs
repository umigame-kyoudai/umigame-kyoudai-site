import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { BOOKING_PLAN_BY_ID } from "./booking-plans.ts"
import { PLANS } from "./data.ts"
import { PLAN_DETAILS } from "./plan-details.ts"
import { TOUR_MASTER } from "./tour-master.ts"
import {
  PLAN_CUSTOMER_DURATIONS,
  getCustomerDurationDetailLabel,
  getCustomerDurationHours,
  getCustomerDurationLabel,
  getCustomerDurationMinutes,
} from "./plan-durations.ts"

test("全プランの顧客向け数値時間・表示・予約要約・公開ツアーが同じ正本を使う", () => {
  assert.deepEqual(Object.keys(PLAN_CUSTOMER_DURATIONS).sort(), Object.keys(PLAN_DETAILS).sort())
  for (const plan of PLANS) {
    const minutes = getCustomerDurationMinutes(plan.id)
    assert.ok(Number.isFinite(minutes) && minutes > 0, plan.id)
    assert.equal(plan.durationHours, minutes / 60, plan.id)
    assert.equal(BOOKING_PLAN_BY_ID[plan.id].durationHours, minutes / 60, plan.id)
    assert.equal(PLAN_DETAILS[plan.id].duration, getCustomerDurationDetailLabel(plan.id), plan.id)
    const tour = TOUR_MASTER.find((item) => item.id === plan.id)
    assert.equal(tour.schedule.durationHours, minutes / 60, plan.id)
    assert.equal(tour.schedule.durationLabel, PLAN_DETAILS[plan.id].duration, plan.id)
  }
})

test("C1/C2は昼120分＋夜90分の顧客向け合計3.5時間", () => {
  for (const id of ["C1", "C2"]) {
    assert.deepEqual(PLAN_CUSTOMER_DURATIONS[id].segments, [
      { role: "snorkel", minutes: 120 }, { role: "night", minutes: 90 },
    ])
    assert.equal(getCustomerDurationHours(id), 3.5)
    assert.equal(getCustomerDurationLabel(id), "昼2時間＋夜1.5時間")
    assert.equal(BOOKING_PLAN_BY_ID[id].durationHours, 3.5)
  }
})

test("C3/C4は顧客向け90分＋90分、合計約3時間", () => {
  for (const id of ["C3", "C4"]) {
    assert.deepEqual(PLAN_CUSTOMER_DURATIONS[id].segments, [
      { role: "snorkel", minutes: 90 }, { role: "sup", minutes: 90 },
    ])
    assert.equal(getCustomerDurationMinutes(id), 180)
    assert.equal(getCustomerDurationLabel(id), "約3時間")
    assert.match(PLAN_DETAILS[id].precautions.join("\n"), /別のビーチへ移動.*移動時間の分だけ延長/)
  }
})

test("C5/C6の1日は1時間や24時間に変換せず、体験合計4.5時間として扱う", () => {
  for (const id of ["C5", "C6"]) {
    assert.equal(getCustomerDurationHours(id), 4.5)
    assert.equal(BOOKING_PLAN_BY_ID[id].durationHours, 4.5)
    assert.equal(getCustomerDurationLabel(id), "朝〜夜の1日")
    assert.equal(PLAN_CUSTOMER_DURATIONS[id].segments.length, 3)
  }
})

test("booking-plansは表示文章を数値として解釈せず、文章を変えても数値は変わらない", async () => {
  const source = readFileSync(new URL("./booking-plans.ts", import.meta.url), "utf8")
  assert.doesNotMatch(source, /(?:plan|detail)\.duration\s*\.(?:match|split|replace)|parseFloat\(|parseInt\(/)
  const original = PLAN_DETAILS.C1.duration
  try {
    PLAN_DETAILS.C1.duration = "昼と夜に楽しむセット（表示文を変更）"
    // 別モジュールURLで予約要約を再生成し、文字列への隠れた依存を検査する。
    const { BOOKING_PLAN_BY_ID: regenerated } = await import("./booking-plans.ts?duration-regression")
    assert.equal(regenerated.C1.durationHours, 3.5)
  } finally {
    PLAN_DETAILS.C1.duration = original
  }
})

test("時間の未設定は0時間で埋めず、定義漏れとして検知する", () => {
  assert.throws(() => getCustomerDurationHours("unknown"), /not configured/)
})
