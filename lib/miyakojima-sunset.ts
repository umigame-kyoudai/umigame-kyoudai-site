import SunCalc from "suncalc"
import { getSunsetSupGuide } from "@/lib/beach-info"
import { isValidCalendarDate } from "@/lib/utils/validation"

const TIME_ZONE = "Asia/Tokyo"
const MIYAKOJIMA = { lat: 24.805, lon: 125.281 }

/** 予約欄の YYYY-MM-DD は宮古島の暦日。端末のローカル日時へ変換しない。 */
export function getMiyakojimaSunsetGuide(dateYmd: string) {
  if (!isValidCalendarDate(dateYmd)) return null

  // 日本時間の正午を渡し、SunCalc が計算する日付も宮古島の当日に固定する。
  const date = new Date(`${dateYmd}T12:00:00+09:00`)
  const sunset = SunCalc.getTimes(date, MIYAKOJIMA.lat, MIYAKOJIMA.lon).sunset

  return {
    label: new Intl.DateTimeFormat("ja-JP", {
      timeZone: TIME_ZONE, month: "long", day: "numeric",
    }).format(date),
    sunset: new Intl.DateTimeFormat("ja-JP", {
      timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).format(sunset),
    ...getSunsetSupGuide(Number(dateYmd.slice(5, 7))),
  }
}
