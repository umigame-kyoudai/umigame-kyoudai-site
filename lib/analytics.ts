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

// GA4 にも転送するイベントと、GA4 側でのイベント名の対応表。
// Vercel 側の既存イベント名は集計の連続性のため変えず、GA4 側は
// line_click / phone_click / reservation_click の3つに統一する。
const GA_EVENT_NAME: Partial<Record<TrackEventName, string>> = {
  line_click: "line_click",
  phone_click: "phone_click",
  book_cta_click: "reservation_click",
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
    const gaName = GA_EVENT_NAME[name]
    if (gaName && typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", gaName, props ?? {})
    }
  } catch {
    // 同上
  }
}
