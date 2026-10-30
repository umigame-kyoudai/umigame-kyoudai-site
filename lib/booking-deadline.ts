import SunCalc from "suncalc"
import { TIME_OPTIONAL_PLAN_IDS, planHasNight } from "@/lib/plan-flags"
import { isValidCalendarDate } from "@/lib/utils/validation"

export const BOOKING_LEAD_TIME_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000
const MIYAKOJIMA = { lat: 24.805, lon: 125.281 }

type BookingSelection = {
  selectedPlan: string
  selectedDate: string
  selectedTime?: string
  nightTime?: string
}

export function getJapanStartTime(date: string, time: string): number | null {
  if (!isValidCalendarDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null
  return Date.parse(`${date}T${time}:00+09:00`)
}

// サイトの案内どおり日没の約90分前を開始目安にする。実際の集合時間はLINEで確定。
export function getSunsetReferenceStart(date: string): number | null {
  if (!isValidCalendarDate(date)) return null
  const sunset = SunCalc.getTimes(new Date(`${date}T12:00:00+09:00`), MIYAKOJIMA.lat, MIYAKOJIMA.lon).sunset
  const start = sunset.getTime() - 90 * MINUTE_MS
  return Number.isFinite(start) ? Math.round(start / (5 * MINUTE_MS)) * 5 * MINUTE_MS : null
}

export function getBookingDeadline(selection: BookingSelection): number | null {
  const { selectedPlan, selectedDate, selectedTime = "", nightTime = "" } = selection
  if (!selectedPlan) return null
  const start = TIME_OPTIONAL_PLAN_IDS.has(selectedPlan)
    ? getSunsetReferenceStart(selectedDate)
    : getJapanStartTime(selectedDate, selectedTime)
  const nightStart = planHasNight(selectedPlan) ? getJapanStartTime(selectedDate, nightTime) : null
  const starts = [start, nightStart].filter((value): value is number => value !== null)
  return starts.length ? Math.min(...starts) - BOOKING_LEAD_TIME_MS : null
}

export function isBookingDeadlinePassed(selection: BookingSelection, now = Date.now()): boolean {
  const deadline = getBookingDeadline(selection)
  return deadline !== null && now > deadline
}

export function isBookingTimeOpen(date: string, time: string, now: number): boolean {
  const start = getJapanStartTime(date, time)
  return start !== null && now <= start - BOOKING_LEAD_TIME_MS
}

const COPY = {
  ja: {
    notice: "Web予約は開始1時間前まで受け付けています（日本時間）。セットプランは最初のツアーが基準です。",
    closed: "受付締切を過ぎました。開始まで1時間以上ある時間、または別の日付を選んでください。",
    slotClosed: "受付終了",
    allClosed: "この日の時間枠はすべて受付を終了しました。別の日付を選んでください。",
    sunset: (time: string) => `この日のWeb受付締切は${time}です（日没の約90分前を開始目安として計算）。`,
  },
  en: {
    notice: "Online requests close 1 hour before the start (Japan time). For a combo tour, the first activity determines the deadline.",
    closed: "The booking deadline has passed. Choose a start time at least 1 hour from now, or another date.",
    slotClosed: "Closed",
    allClosed: "All start times on this date are closed for booking. Please choose another date.",
    sunset: (time: string) => `Online booking for this date closes at ${time} (Japan time), based on an estimated start 90 minutes before sunset.`,
  },
  ko: {
    notice: "온라인 예약은 시작 1시간 전까지 가능합니다(일본 시간). 세트 투어는 첫 일정의 시작 시간을 기준으로 합니다.",
    closed: "예약 마감 시간이 지났습니다. 지금부터 1시간 이상 남은 시작 시간이나 다른 날짜를 선택해 주세요.",
    slotClosed: "접수 마감",
    allClosed: "이 날짜의 모든 시간대가 예약 마감되었습니다. 다른 날짜를 선택해 주세요.",
    sunset: (time: string) => `이 날짜의 온라인 예약 마감은 ${time}(일본 시간)입니다. 일몰 약 90분 전을 시작 시간으로 계산합니다.`,
  },
  "zh-tw": {
    notice: "網路預約受理至開始前1小時（日本時間）。套裝行程以第一項活動的開始時間為準。",
    closed: "已超過預約截止時間。請選擇距現在至少1小時的開始時間，或其他日期。",
    slotClosed: "已截止",
    allClosed: "此日期的所有時段均已截止預約，請選擇其他日期。",
    sunset: (time: string) => `此日期的網路預約於${time}（日本時間）截止，以日落前約90分鐘作為開始時間計算。`,
  },
}

export function getBookingDeadlineCopy(locale?: string) {
  return locale === "en" || locale === "ko" || locale === "zh-tw" ? COPY[locale] : COPY.ja
}

export function formatBookingDeadline(deadline: number): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }).format(deadline)
}
