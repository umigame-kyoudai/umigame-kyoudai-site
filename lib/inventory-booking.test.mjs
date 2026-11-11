import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import { gasSourcePath } from "./test-helpers/gas-source.mjs"
import { buildInventoryBooking, buildInventoryRows, normalizeTime, addMinutes } from "./inventory-booking.ts"

// 管理システム docs/130：ホームページのリアルタイム受付で作る予約の行が、旧GAS（Code.gs）が「予約一覧」に書く行と同じになることを、
// 本物の Code.gs を vm で動かして1行ずつ比べる（シート・カレンダー・メールは合成。外部へは何も送らない）。
function runGas(payload) {
  let captured = null
  const sandbox = {
    console,
    Logger: { log() {} },
    SpreadsheetApp: { flush() {}, getActiveSpreadsheet: () => ({ toast() {} }), getUi: () => ({ createMenu: () => ({ addItem: () => ({ addToUi() {} }) }) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {}, deleteProperty() {} }), getDocumentProperties: () => null },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CalendarApp: {}, GmailApp: {}, UrlFetchApp: {},
    ContentService: { createTextOutput: (text) => ({ text, setMimeType() { return this } }), MimeType: { JSON: "json" } },
  }
  vm.createContext(sandbox)
  vm.runInContext(readFileSync(gasSourcePath(), "utf8"), sandbox)
  sandbox.getOrCreateSheet = () => ({})
  sandbox.writeBookingRows_ = (_sheet, rows) => { captured = rows; return true }
  sandbox.addToCalendar = () => {}
  sandbox.sendBookingEmail = () => {}
  sandbox.C5C6_ORIGINAL_ADD_TO_CALENDAR = () => {}
  sandbox.C5C6_ORIGINAL_SEND_BOOKING_EMAIL = () => {}
  // 予約を書く部分（紹介・金額の確かめの外側の包みの内側）を呼ぶ。
  sandbox.REFERRAL_ORIGINAL_DO_POST({ postData: { contents: JSON.stringify(payload) } })
  assert.ok(captured, "GAS did not write rows")
  return captured
}

const NAMES = { S1: "ウミガメと泳ぐシュノーケルツアー", S2: "【貸切】ウミガメシュノーケルツアー", S3: "本格ナイトツアー", S4: "【貸切】サンセットSUP", S5: "【貸切】本格ナイトツアー", S6: "宮古島ドローンSUP体験", S7: "【貸切】宮古島ドローンSUP体験", S8: "サンセットSUP",
  C1: "ウミガメシュノーケル＆ヤシガニ探検 昼夜セット", C2: "【貸切】ウミガメシュノーケル＆ヤシガニ探検 昼夜セット", C3: "ウミガメシュノーケル＆ドローンSUP 海空セット", C4: "【貸切】ウミガメシュノーケル＆ドローンSUP 海空セット",
  C5: "ウミガメシュノーケル＆ドローンSUP＆ナイトツアー まるごと1日セット", C6: "【貸切】ウミガメシュノーケル＆ドローンSUP＆ナイトツアー まるごと1日セット" }
const NIGHT = new Set(["C1", "C2", "C5", "C6"]), SUP = new Set(["C3", "C4", "C5", "C6"]), SUNSET = new Set(["S4", "S8"])
function payload(planId, { time = "09:00", night = "19:20", adult = 2, child = 1, under3 = 1, total = 25000, coupon = 0, couponCode = "", staff = "" } = {}) {
  const participants = [
    { name: "合成 一郎", age: 40, height: 170, weight: 65, footSize: 26, category: "adult", wetsuitRental: true },
    ...Array.from({ length: adult - 1 }, (_, i) => ({ name: `合成 大人${i}`, age: 35, height: 160, weight: 55, footSize: 24, category: "adult" })),
    ...Array.from({ length: child }, () => ({ name: "合成 子供", age: 8, height: 125, weight: 25, footSize: 19, category: "child", prescriptionMaskRental: true })),
    ...Array.from({ length: under3 }, () => ({ name: "合成 幼児", age: 2, height: 85, weight: 12, footSize: 13, category: "under3" })),
  ]
  const combo = planId.startsWith("C")
  const lines = combo ? ["[COMBO booking]", `プラン：${NAMES[planId]}`, "内容", `海亀希望時間：${time}`, ...(SUP.has(planId) ? ["ドローンSUP希望時間：海亀の後"] : []), ...(NIGHT.has(planId) ? [`ヤシガニ探検希望時間：${night}`] : [])] : []
  return {
    bookingNumber: "W0123456789ABCDEF", planId, planName: NAMES[planId], customerName: "合成 花子", customerEmail: "fixture@example.invalid", customerPhone: "09000000001", locale: "ja",
    selectedDate: "2026-11-20", selectedTime: SUNSET.has(planId) ? "サンセット時刻（前日にLINEでご案内）" : time, participants, adultCount: adult, childCount: child, under3Count: under3, totalPrice: total,
    staffName: staff, specialRequests: [lines.join("\n"), "[写真掲載・素材利用] 合成"].filter(Boolean).join("\n───\n"), lineUserId: "U" + "0123456789abcdef".repeat(2), lineDisplayName: "合成LINE",
    couponCode, couponDiscount: coupon, customerAnalytics: {}, attribution: null, trafficAttribution: null, referral: null, acquisitionToken: null,
  }
}

const CASES = [
  ["S1", {}], ["S1", { coupon: 1000, couponCode: "SPRING", total: 12000 }], ["S2", { total: 36000, staff: "山下" }], ["S3", { time: "21:10", total: 12000 }],
  ["S4", { total: 38000 }], ["S5", { time: "23:20", total: 32000 }], ["S6", { time: "13:00", total: 22500 }], ["S7", { time: "07:00", total: 38000 }], ["S8", { total: 20000 }],
  ["C1", { total: 27500 }], ["C1", { total: 26500, coupon: 1001, couponCode: "C1001" }], ["C2", { total: 48000 }], ["C2", { total: 47999, adult: 3, child: 0, under3: 0 }],
  ["C3", { total: 37500 }], ["C3", { total: 37499, coupon: 501, couponCode: "C501", time: "16:00" }], ["C4", { total: 52500 }],
  ["C5", { total: 46000 }], ["C5", { time: "16:00", night: "23:20", total: 46001, coupon: 1000, couponCode: "C1000" }], ["C6", { total: 70500, night: "21:10" }],
]

test("ホームページの予約の行は、旧GASが予約一覧に書く行と同じ（時刻・プラン・金額・クーポン割引・指名・人数内訳・参加者・年齢など）", () => {
  for (const [planId, options] of CASES) {
    const p = payload(planId, options)
    const gasRows = runGas(p)
    const night = NIGHT.has(planId) ? options.night ?? "19:20" : null
    const built = buildInventoryBooking(p, night)
    const rows = buildInventoryRows(p, night)
    const label = `${planId} ${JSON.stringify(options)}`
    assert.equal(rows.length, gasRows.length, label)
    rows.forEach((r, i) => {
      const g = gasRows[i]
      assert.deepEqual([r.time, r.planName, r.totalPrice, r.couponDiscount, r.staffName], [g[3], g[5], g[6], g[17], g[15]], `${label} row ${i}`)
      const s = built.details.sheet_rows[i]
      assert.deepEqual([s["参加日"], s["時間"], s["プラン"], s["合計金額"], s["人数内訳"], s["参加者詳細"], s["LINE名"], s["スタッフ指名"], s["クーポンコード"], s["クーポン割引額"], s["参加者年齢"], s["参加者身長"], s["参加者体重"], s["参加者足サイズ"], s["管理プランID"]],
        [g[2], g[3], g[5], String(g[6]), g[9], g[10], g[14], g[15], g[16], String(g[17]), g[39], g[40], g[41], g[42], g[44]], `${label} sheet ${i}`)
    })
    // 管理システムへ送る形（シートの取り込みと同じ）：金額は行の合計、クーポン割引は行の和、サンセットは時刻なし。
    assert.equal(built.item.amount, gasRows.reduce((sum, g) => sum + g[6], 0), label)
    assert.equal(built.item.coupon.discount, gasRows.reduce((sum, g) => sum + g[17], 0), label)
    assert.deepEqual(built.item.tours.map((t) => t.time), [...gasRows].map((g) => normalizeTime(g[3]) || null), label)
    assert.ok(built.item.tours.every((t) => t.plan_code === planId && t.date === "2026-11-20"), label)
  }
})

test("形：確定・お名前・人数・LINEの宛先。時刻の計算は日をまたいでも回り込む", () => {
  const built = buildInventoryBooking(payload("S1"), null)
  assert.equal(built.item.status, "CONFIRMED")
  assert.deepEqual(built.item.people, { adult: 2, child: 1, under3: 1 })
  assert.deepEqual(built.item.customer, { name: "合成 花子", phone: "09000000001", email: "fixture@example.invalid" })
  assert.deepEqual(built.item.coupon, { code: null, discount: 0 })
  assert.equal(built.details.line_user_id, "U" + "0123456789abcdef".repeat(2))
  assert.equal(buildInventoryBooking({ ...payload("S1"), lineUserId: "bad" }, null).details.line_user_id, null)
  assert.equal(addMinutes("23:00", 90), "00:30")
  assert.equal(normalizeTime("9時5"), "09:05")
  assert.throws(() => buildInventoryRows(payload("C1"), null))
})
