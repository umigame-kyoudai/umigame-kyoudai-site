// 翻訳文に差し込む事実の導出ビュー。料金・年齢・人数・時間の値はここに持たない。
import { getPlanMaxParticipants } from "@/lib/booking-rules"
import { getCustomerDurationHours, getCustomerDurationMinutes } from "@/lib/plan-durations"
import {
  FREE_UNDER3_PLAN_IDS, NIGHT_TOUR_TIMES, PRIVATE_COUNTERPART, SENIOR_RESTRICTED_PLAN_IDS,
  getAdultAgeMax, getParticipantAgeRange,
} from "@/lib/plan-flags"
import { PLAN_PRICE_DATA } from "@/lib/plan-price-display"
import { getRentalUnitPrice, planOffersRentals } from "@/lib/rental-options"
import { getEnPrice } from "./en-prices"
import type { IntlLocale } from "./locales"

export function getIntlPlanFacts(planId: string) {
  const price = PLAN_PRICE_DATA[planId]
  if (!price) throw new Error(`Plan price is not configured: ${planId}`)
  const child = getParticipantAgeRange(planId, "child")!
  const freeAgeRange = FREE_UNDER3_PLAN_IDS.has(planId) ? getParticipantAgeRange(planId, "under3") : null
  const maxParticipants = getPlanMaxParticipants(planId)
  return {
    // 表示も予約フォーム・APIと同じ価格経路を通す（現在は日本語と同額）。
    ...getEnPrice({ id: planId, ...price }),
    minAge: freeAgeRange?.min ?? child.min,
    maxAge: getAdultAgeMax(planId),
    childMinAge: child.min,
    childMaxAge: child.max,
    freeAgeRange,
    maxParticipants,
    largeGroupMin: maxParticipants === undefined ? undefined : maxParticipants + 1,
    // お客様向け時間のみ。内部カレンダー占有時間を翻訳文へ流さない。
    durationMinutes: getCustomerDurationMinutes(planId),
    durationHours: getCustomerDurationHours(planId),
    rentalPrice: planOffersRentals(planId) ? getRentalUnitPrice(planId) : null,
    seniorRestricted: SENIOR_RESTRICTED_PLAN_IDS.has(planId),
    privateCounterpartId: PRIVATE_COUNTERPART[planId]?.id ?? null,
  }
}

export function formatIntlYen(price: number): string {
  return `¥${price.toLocaleString("en-US")}`
}

export function formatIntlAgeNote(planId: string, locale: IntlLocale): string {
  const { minAge, maxAge } = getIntlPlanFacts(planId)
  if (locale === "en") return `Ages ${minAge} to ${maxAge}`
  if (locale === "ko") return `${minAge}~${maxAge}세`
  return `${minAge}～${maxAge}歲`
}

export function formatIntlGroupLimit(planId: string, locale: IntlLocale): string {
  const max = getPlanMaxParticipants(planId)
  if (max === undefined) return ""
  if (locale === "en") return `Up to ${max} guests. For ${max + 1} or more, contact us on LINE.`
  if (locale === "ko") return `최대 ${max}명까지 웹 예약이 가능합니다. ${max + 1}명 이상은 LINE으로 문의해 주세요.`
  return `網路預約最多${max}人，${max + 1}人以上請透過LINE洽詢。`
}

export function formatIntlFreeChildNote(planId: string, locale: IntlLocale): string {
  const range = getIntlPlanFacts(planId).freeAgeRange
  if (!range) return ""
  if (locale === "en") return `free for ages ${range.max} and under`
  if (locale === "ko") return `${range.max}세 이하 무료`
  return `${range.max}歲以下免費`
}

export function formatIntlPriceNote(planId: string, locale: IntlLocale, short = false): string {
  const { price, childPrice } = getIntlPlanFacts(planId)
  const adult = formatIntlYen(price)
  const child = formatIntlYen(childPrice)
  const samePrice = price === childPrice
  const amount = {
    en: samePrice ? `${adult} / person` : `Adult ${adult} / Child ${child}`,
    ko: samePrice ? `1인 ${adult}` : `성인 ${adult} / 어린이 ${child}`,
    "zh-tw": samePrice ? `${adult}／人` : `成人${adult}／兒童${child}`,
  }[locale]
  if (short) return amount
  const free = formatIntlFreeChildNote(planId, locale)
  const freeNote = free ? (locale === "zh-tw" ? `（${free}）` : ` (${free})`) : ""
  return [amount + freeNote, formatIntlGroupLimit(planId, locale)].filter(Boolean).join(locale === "zh-tw" ? "。" : ". ")
}

export function formatIntlRentalFee(planId: string, locale: IntlLocale): string {
  const price = getIntlPlanFacts(planId).rentalPrice
  if (price === null) return ""
  if (price !== 0) return formatIntlYen(price)
  return { en: "free", ko: "무료", "zh-tw": "免費" }[locale]
}

// HH:MM は宮古島の現地時刻。端末のtimezoneやDateのローカル解釈を介さず整形する。
export function formatIntlTime(time: string, locale: IntlLocale): string {
  if (locale !== "en") return time
  const [hour, minute] = time.split(":").map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`
}

export function formatIntlTimeList(times: readonly string[], locale: IntlLocale): string {
  return times.map((time) => formatIntlTime(time, locale)).join(" / ")
}

export function formatIntlNightTimeNote(planId: string, locale: IntlLocale): string {
  const { durationHours, durationMinutes } = getIntlPlanFacts(planId)
  const last = NIGHT_TOUR_TIMES.at(-1)
  if (!last) return ""
  const [hour, minute] = last.split(":").map(Number)
  const endMinutes = hour * 60 + minute + durationMinutes
  const end = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`
  const nextDay = endMinutes >= 24 * 60
  const times = formatIntlTimeList(NIGHT_TOUR_TIMES, locale)
  const lastTime = formatIntlTime(last, locale)
  const endTime = formatIntlTime(end, locale)
  if (locale === "en") {
    return `About ${durationHours} hours (${durationMinutes} minutes). ${NIGHT_TOUR_TIMES.length} departures nightly: ${times} (meet at the start time; the ${lastTime} tour ends around ${endTime}${nextDay ? " the next day" : ""})`
  }
  if (locale === "ko") {
    return `약 ${durationHours}시간(${durationMinutes}분). 매일 밤 ${NIGHT_TOUR_TIMES.length}회 출발: ${times} (시작 시간에 집합, ${lastTime} 출발 투어는 ${nextDay ? "다음 날 " : ""}${endTime}경 종료)`
  }
  return `約${durationHours}小時（${durationMinutes}分鐘）。每晚${NIGHT_TOUR_TIMES.length}個出發時段：${times}（開始時間集合；${lastTime}出發的行程約於${nextDay ? "隔天" : ""}${endTime}結束）`
}
