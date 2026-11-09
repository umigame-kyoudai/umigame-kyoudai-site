import { isNightTourPlan, planHasNight } from "@/lib/plan-flags"

// ユーザー指定の終日休業日。年も含めて指定し、翌年へ繰り返さない。
// 日本語・国際版フォームと予約APIで共通利用する。
export const BOOKING_CLOSED_DATES: readonly string[] = [
  "2026-10-27",
  "2026-10-28",
]

export const isBookingDateClosed = (date: string): boolean => BOOKING_CLOSED_DATES.includes(date)

export function bookingClosedMessage(locale: string = "ja"): string {
  switch (locale) {
    case "en": return "We are closed on this date. Please choose another date."
    case "ko": return "선택하신 날짜는 휴무일입니다. 다른 날짜를 선택해 주세요."
    case "zh-tw": return "所選日期為公休日，請選擇其他日期。"
    default: return "選択した日付は休業日です。別の日付をお選びください。"
  }
}

// ナイトツアーを含むプランのみ、この期間は開催しない（両端を含む）。
export const NIGHT_TOUR_CLOSURE_START = "2027-01-23"
export const NIGHT_TOUR_CLOSURE_END = "2027-02-28"

export function isNightTourBookingClosed(date: string, planId: string): boolean {
  return (isNightTourPlan(planId) || planHasNight(planId)) &&
    date >= NIGHT_TOUR_CLOSURE_START && date <= NIGHT_TOUR_CLOSURE_END
}

// 強風による海況不良のため、該当日だけ海の体験とそのセットを停止する。
// ナイトツアー単体は対象外。
const SEA_TOUR_CLOSED_DATE = "2026-11-10"
const SEA_TOUR_PLAN_IDS = new Set(["S1", "S2", "S4", "S6", "S7", "S8", "C1", "C2", "C3", "C4", "C5", "C6"])

export function isSeaTourBookingClosed(date: string, planId: string): boolean {
  return date === SEA_TOUR_CLOSED_DATE && SEA_TOUR_PLAN_IDS.has(planId)
}

function seaTourClosureMessage(locale: string): string {
  switch (locale) {
    case "en": return "Sea tours and plans including them are unavailable on November 10 due to strong winds."
    case "ko": return "강풍으로 인해 11월 10일 해양 체험과 이를 포함한 세트는 예약할 수 없습니다."
    case "zh-tw": return "因強風影響，11月10日海上體驗及包含海上體驗的套裝行程暫停預約。"
    default: return "強風のため、11月10日の海の体験とそれを含むセットは予約できません。"
  }
}

// 11月11日のナイトツアー2便のみ停止（単品と夜を含むセット）。
export function isNightSlotUnavailable(date: string, planId: string, selectedTime: string, nightTime = ""): boolean {
  return date === "2026-11-11" && ((isNightTourPlan(planId) && selectedTime === "21:10") || (planHasNight(planId) && nightTime === "21:10"))
}

export function nightSlotUnavailableMessage(locale = "ja"): string {
  switch (locale) {
    case "en": return "The 21:10 night tour is unavailable on November 11."
    case "ko": return "11월 11일 21:10 나이트 투어는 예약할 수 없습니다."
    case "zh-tw": return "11月11日21:10夜間導覽暫停預約。"
    default: return "11月11日のナイトツアー21:10便は予約できません。"
  }
}

export function isBookingUnavailable(date: string, planId: string): boolean {
  return isBookingDateClosed(date) || isSeaTourBookingClosed(date, planId) || isNightTourBookingClosed(date, planId)
}

export function nightTourClosureMessage(locale: string = "ja"): string {
  switch (locale) {
    case "en": return "Night tours and plans including a night tour are unavailable from January 23 through February 28, 2027."
    case "ko": return "2027년 1월 23일부터 2월 28일까지 나이트 투어 및 나이트 투어가 포함된 플랜은 예약할 수 없습니다."
    case "zh-tw": return "2027年1月23日至2月28日，夜間導覽及包含夜間導覽的行程暫停預約。"
    default: return "2027年1月23日〜2月28日は、ナイトツアーおよびナイトツアーを含むプランを予約できません。"
  }
}

export function bookingUnavailableMessage(date: string, planId: string, locale: string = "ja"): string {
  if (isBookingDateClosed(date)) return bookingClosedMessage(locale)
  if (isSeaTourBookingClosed(date, planId)) return seaTourClosureMessage(locale)
  return nightTourClosureMessage(locale)
}
