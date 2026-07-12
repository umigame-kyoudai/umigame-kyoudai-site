import { track } from "@vercel/analytics"

// コンバージョン計測イベント。名前は限定列挙にして表記ゆれ・重複を防ぐ。
// Vercel Analytics のダッシュボード「Events」に集計される。
export type TrackEventName =
  | "book_cta_click" // 「予約」系CTAクリック（予約意図。location で出所を区別）
  | "line_click" // LINE相談クリック（代替コンバージョン）
  | "line_add_friend_click" // 予約フォームの「友だち追加」クリック（確定通知の到達率対策。location で出所を区別）
  | "phone_click" // 電話番号（tel:）タップ（location で出所を区別）
  | "booking_form_view" // 予約フォーム表示（LIFF準備完了時に1回。line_logged_in でゲート前後を区別）
  | "line_login_click" // 予約フォームのLINEログインボタン押下（location: booking_top / booking_bottom / booking_en）
  | "booking_submitted" // 予約フォーム送信成功（本コンバージョン）
  | "booking_failed" // 予約送信失敗（離脱・不具合分析用）

type TrackEventProps = Record<string, string | number | boolean | null>

type GAEventParams = Record<string, string | number | boolean | null>

export interface GAEvent {
  name: string
  params: GAEventParams
}

// GA4 側でのイベント名の対応表。全イベントを GA4 にも転送し、
// reservation_click → booking_form_view → line_login_click → generate_lead
// の予約ファネルを GA4 の探索レポートで組めるようにする。
// Vercel 側の既存イベント名は集計の連続性のため変えず、GA4 側は
// 予約リクエスト成功は、予約確定前なので purchase ではなくGA4推奨の
// generate_lead として送る。
const GA_EVENT_NAME: Record<TrackEventName, string> = {
  book_cta_click: "reservation_click",
  line_click: "line_click",
  line_add_friend_click: "line_add_friend_click",
  phone_click: "phone_click",
  booking_form_view: "booking_form_view",
  line_login_click: "line_login_click",
  booking_submitted: "generate_lead",
  booking_failed: "booking_failed",
}

// GA4 へ渡すパラメータの許可リスト（Vercel側キー → GA4側キー）。
// 氏名・電話・メール・LINE ID などの個人情報が呼び出し元の変更で誤って
// 混入しないよう、ここに載せたキーだけを転送する。GA4 の標準レポートで
// 集計するにはカスタム定義の登録が必要（docs/ga4-setup.md 参照）。
const GA_PARAM_KEY: Record<string, string> = {
  location: "location",
  plan: "plan_id",
  planName: "plan_name",
  locale: "locale",
  line_logged_in: "line_logged_in",
  source: "lead_source",
  headcount: "headcount",
}

export function buildGAEvent(name: TrackEventName, props?: TrackEventProps): GAEvent {
  const params: GAEventParams = {}
  for (const [key, gaKey] of Object.entries(GA_PARAM_KEY)) {
    const value = props?.[key]
    if (value !== undefined) params[gaKey] = value
  }

  // 予約成功はリード価値（予約金額）付き。value/currency は GA4 の
  // 組み込み指標なのでカスタム定義の登録なしで集計できる。
  if (name === "booking_submitted") {
    params.currency = "JPY"
    const value = props?.total
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      params.value = value
    }
  }

  return { name: GA_EVENT_NAME[name], params }
}

declare global {
  interface Window {
    // gtag は本番でのみ <GoogleAnalytics>（app/layout.tsx）が定義する。
    // 開発環境では undefined のままなので GA4 送信は自然にスキップされる。
    gtag?: (...args: unknown[]) => void
  }
}

// 計測の失敗が本体機能（予約・遷移）を止めないよう必ず握りつぶす。
export function trackEvent(name: TrackEventName, props?: TrackEventProps): void {
  try {
    track(name, props)
  } catch {
    // 計測は best-effort。失敗しても何もしない。
  }
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      const gaEvent = buildGAEvent(name, props)
      window.gtag("event", gaEvent.name, gaEvent.params)
    }
  } catch {
    // 同上
  }
}
