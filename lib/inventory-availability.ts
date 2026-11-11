// 予約在庫（管理システム docs/130）：ホームページの予約画面に出す空き。プランと期間から、時刻の候補ごとの問い合わせを作り、結果を表にする。
// main：ウミガメ・ナイト・SUPなど最初のツアー（海空・まるごと1日はSUP〈ウミガメの90分後〉も一緒に確かめる）。night：昼夜・まるごと1日のナイト。
// サンセット（S4・S8）は時刻を選ばないので、1日1枠（time は "-"）。人数は1人で問い合わせ、残りの人数で画面が選べるかを決める。
import { buildInventoryRows, type InventoryGasPayload } from "@/lib/inventory-booking"
import type { AvailabilityRequest, AvailabilityResult } from "@/lib/inventory-client"
import { COMBO_TURTLE_TIMES, DAY_SUP_TIMES, NIGHT_TOUR_TIMES, TIME_OPTIONAL_PLAN_IDS, planHasNight } from "@/lib/plan-flags"

export const DAY_TIME = "-"
export function mainTimes(planId: string): string[] {
  if (TIME_OPTIONAL_PLAN_IDS.has(planId)) return [DAY_TIME]
  if (planId === "S3" || planId === "S5") return [...NIGHT_TOUR_TIMES]
  if (planId === "S6" || planId === "S7") return [...DAY_SUP_TIMES]
  return [...COMBO_TURTLE_TIMES]
}
const dates = (from: string, to: string) => {
  const out: string[] = []
  for (let d = new Date(`${from}T00:00:00Z`); d < new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10))
  return out
}
const rowsFor = (planId: string, planName: string, date: string, time: string, night: string | null) => {
  const p: InventoryGasPayload = { bookingNumber: "", planId, planName, customerName: "", customerEmail: "", customerPhone: "", selectedDate: date, selectedTime: time === DAY_TIME ? "サンセット時刻（前日にLINEでご案内）" : time,
    participants: [], adultCount: 1, childCount: 0, under3Count: 0, totalPrice: 0, staffName: "", specialRequests: "", lineUserId: "", lineDisplayName: "", couponCode: "", couponDiscount: 0 }
  return buildInventoryRows(p, night).map((r) => ({ date, time: /^\d{2}:\d{2}$/.test(r.time) ? r.time : null, plan_code: planId, plan_text: r.planName }))
}
// 問い合わせ（日付×時刻）。昼夜・まるごと1日は、main にウミガメ（とSUP）、night にナイトだけを入れる。
export function availabilityRequests(planId: string, planName: string, from: string, to: string): AvailabilityRequest[] {
  const out: AvailabilityRequest[] = []
  const nightPlan = planHasNight(planId)
  for (const date of dates(from, to)) {
    for (const time of mainTimes(planId)) {
      const tours = rowsFor(planId, planName, date, time, nightPlan ? NIGHT_TOUR_TIMES[0] : null)
      out.push({ key: `${date}|main|${time}`, people: 1, tours: nightPlan ? tours.filter((t) => !t.plan_text.includes("ヤシガニ")) : tours })
    }
    if (nightPlan) {
      for (const night of NIGHT_TOUR_TIMES) {
        const tours = rowsFor(planId, planName, date, COMBO_TURTLE_TIMES[0], night).filter((t) => t.plan_text.includes("ヤシガニ"))
        out.push({ key: `${date}|night|${night}`, people: 1, tours })
      }
    }
  }
  return out
}
import type { SlotState } from "@/lib/inventory-slot"
export type AvailabilityTable = Record<string, { main: Record<string, SlotState>; night: Record<string, SlotState> }>
export function availabilityTable(results: AvailabilityResult[]): AvailabilityTable {
  const table: AvailabilityTable = {}
  for (const r of results) {
    const [date, kind, time] = r.key.split("|")
    if (!date || (kind !== "main" && kind !== "night") || !time) continue
    table[date] ??= { main: {}, night: {} }
    table[date][kind][time] = { state: r.state, remaining: r.remaining }
  }
  return table
}
