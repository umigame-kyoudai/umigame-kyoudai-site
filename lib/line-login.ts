import type { Liff } from "@line/liff"
import { BOOKING_SOURCE_QUERY, decodeUnverifiedBookingSource } from "@/lib/booking-source"

export const LINE_APP_ENTRY_QUERY = "line_entry"
export const ID_TOKEN_MIN_REMAINING_SECONDS = 60
export const LINE_LOGIN_PREVIEW_NOTICE = {
  ja: "確認用の画面です。入力や表示をお試しいただけます。LINE認証・予約送信は行われません。",
  en: "Preview only. You can try the form, but LINE login and booking submission are disabled.",
  ko: "확인용 화면입니다. 입력과 표시를 확인할 수 있으며 LINE 인증 및 예약 전송은 실행되지 않습니다.",
  "zh-tw": "此為預覽畫面，可測試填寫與顯示，不會進行 LINE 登入或送出預約。",
} as const

// 表示用の本人情報もIDトークンから取得する。getProfile()の一時的な通信失敗で
// 有効なログインまで破棄しない。予約APIでの署名・発行元・宛先の検証は別途必須。
export function readLineSession(
  liff: Pick<Liff, "isLoggedIn" | "getIDToken" | "getDecodedIDToken">,
  now = Date.now(),
): { idToken: string; userId: string; displayName: string | null } | null {
  try {
    if (!liff.isLoggedIn()) return null
    const idToken = liff.getIDToken()
    const claims = liff.getDecodedIDToken()
    if (!idToken || !claims || typeof claims.sub !== "string" || !claims.sub ||
        typeof claims.exp !== "number" || !Number.isFinite(claims.exp) ||
        claims.exp <= Math.floor(now / 1000) + ID_TOKEN_MIN_REMAINING_SECONDS) return null
    return {
      idToken,
      userId: claims.sub,
      displayName: typeof claims.name === "string" && claims.name ? claims.name : null,
    }
  } catch {
    return null
  }
}

// 別ブラウザのsessionStorageは引き継げない。URLで渡せるプラン・日付以外に
// 入力があれば、同じブラウザへ戻る通常のLINEログインを使う。
// 未知の非空フィールドも保護対象にして、将来項目が増えても入力を失わない。
export function hasNonPortableBookingInput(draft: object): boolean {
  return Object.entries(draft).some(([key, value]) => {
    if (["selectedPlan", "selectedDate", "planId", "date"].includes(key)) return false
    if (key === "selectedDuration" && value === "5h") return false
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && value !== null && value !== "" && value !== false && value !== 0
  })
}

interface LineBookingLinkOptions {
  liffId: string
  currentUrl: string
  planId: string
  date: string
  bookingSource?: string | null
  attribution?: { source: string; medium: string; campaign: string } | null
}

// LIFFのエンドポイントはサイトのルート。公式のHTTPS LIFF URLを通常のリンクで
// 開き、OSのUniversal Links / App Linksを利用する。OAuth URLを自作しない。
export function buildLineBookingUrl(options: LineBookingLinkOptions): string | null {
  if (!/^\d+-[A-Za-z0-9]+$/.test(options.liffId)) return null
  let current: URL
  try { current = new URL(options.currentUrl) } catch { return null }
  const path = current.pathname.replace(/\/$/, "")
  if (!/^\/(?:en\/|ko\/|zh-tw\/)?book$/.test(path)) return null
  const url = new URL(`https://liff.line.me/${options.liffId}${path}`)
  if (/^[A-Za-z0-9-]{1,40}$/.test(options.planId)) url.searchParams.set("plan", options.planId)
  if (/^\d{4}-\d{2}-\d{2}$/.test(options.date)) url.searchParams.set("date", options.date)

  // 全クエリやhashを転送しない。氏名、電話番号、認証コード、トークン等を除外する。
  const attribution = options.attribution
  for (const [key, stored] of [
    ["utm_source", attribution?.source],
    ["utm_medium", attribution?.medium],
    ["utm_campaign", attribution?.campaign],
    ["utm_content", undefined],
    ["utm_term", undefined],
  ] as const) {
    const value = (stored || current.searchParams.get(key) || "").replace(/[^\w\-./ ]/g, "").trim().slice(0, 80)
    if (value) url.searchParams.set(key, value)
  }
  const source = options.bookingSource || current.searchParams.get(BOOKING_SOURCE_QUERY)
  if (decodeUnverifiedBookingSource(source) && source) url.searchParams.set(BOOKING_SOURCE_QUERY, source)
  url.searchParams.set(LINE_APP_ENTRY_QUERY, "app")
  return url.toString()
}
