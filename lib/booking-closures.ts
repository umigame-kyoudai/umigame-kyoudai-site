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

export function isBookingUnavailable(date: string, planId: string): boolean {
  return isBookingDateClosed(date) || isNightTourBookingClosed(date, planId)
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
  return isBookingDateClosed(date) ? bookingClosedMessage(locale) : nightTourClosureMessage(locale)
}
