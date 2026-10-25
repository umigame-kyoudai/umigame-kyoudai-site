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
