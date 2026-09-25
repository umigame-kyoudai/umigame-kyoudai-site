/** 公開サイトで使用する事業者情報。管理通知先や認証情報はここへ追加しない。 */
const phone = "08053442439"
const phoneDisplayJa = `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
const address = {
  postalCode: "906-0014",
  country: "JP",
  region: "沖縄県",
  locality: "宮古島市",
  streetName: "平良松原",
  streetNumber: "107-1",
  regionEn: "Okinawa",
  localityEn: "Miyakojima City",
  streetNameEn: "Hirara Matsubara",
} as const

export const SITE_CONFIG = {
  siteNameJa: "海亀兄弟",
  siteNameEn: "Sea Turtle Brothers",
  siteUrl: "https://www.umigamekyoudaimiyakojima.com",
  phone,
  phoneDisplayJa,
  phoneDisplayIntl: `+81-${phoneDisplayJa.slice(1)}`,
  publicEmail: "info@umigamekyoudaimiyakojima.com",
  lineUrl: "https://lin.ee/jfp4laz",
  address: {
    ...address,
    streetAddress: `${address.streetName}${address.streetNumber}`,
    formattedJa: `〒${address.postalCode} ${address.region}${address.locality}${address.streetName}${address.streetNumber}`,
    formattedEn: `${address.streetNumber} ${address.streetNameEn}, ${address.localityEn}, ${address.regionEn} ${address.postalCode}, Japan`,
    formattedKo: `〒${address.postalCode} 일본 오키나와현 미야코지마시 히라라 마쓰바라 ${address.streetNumber}`,
    formattedZhTw: `〒${address.postalCode} 日本沖繩縣宮古島市平良松原${address.streetNumber}`,
  },
  businessHours: {
    opens: "07:00",
    closes: "18:00",
  },
} as const

// SEO等の既存の名前も同じ正本から公開する。
export const SITE_URL = SITE_CONFIG.siteUrl
export const SITE_NAME = SITE_CONFIG.siteNameJa
export const SITE_NAME_INTL = SITE_CONFIG.siteNameEn

/** 区切りや周囲の文章は各画面・辞書で維持し、時刻の値だけを共通化する。 */
export function formatBusinessHours(locale: "ja" | "en" | "ko" | "zh-tw" = "ja", separator = " - "): string {
  const format = (time: string) => {
    const [hour, minute] = time.split(":")
    const h = Number(hour)
    return locale === "en"
      ? `${h % 12 || 12}:${minute} ${h < 12 ? "AM" : "PM"}`
      : `${h}:${minute}`
  }
  return [SITE_CONFIG.businessHours.opens, SITE_CONFIG.businessHours.closes].map(format).join(separator)
}
