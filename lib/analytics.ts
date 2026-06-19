import { track } from "@vercel/analytics"

// コンバージョン計測イベント。名前は限定列挙にして表記ゆれ・重複を防ぐ。
// Vercel Analytics のダッシュボード「Events」に集計される。
export type TrackEventName =
  | "book_cta_click" // 「予約」系CTAクリック（予約意図。location で出所を区別）
  | "line_click" // LINE相談クリック（代替コンバージョン）
  | "booking_submitted" // 予約フォーム送信成功（本コンバージョン）
  | "booking_failed" // 予約送信失敗（離脱・不具合分析用）

type TrackEventProps = Record<string, string | number | boolean | null>

// 計測の失敗が本体機能（予約・遷移）を止めないよう必ず握りつぶす。
export function trackEvent(name: TrackEventName, props?: TrackEventProps): void {
  try {
    track(name, props)
  } catch {
    // 計測は best-effort。失敗しても何もしない。
  }
}
