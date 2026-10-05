"use client"

import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  DetailedAnalyticsEvent,
} from "@/lib/analytics-schema"
import { trackEvent } from "@/lib/analytics"
import { getAttribution } from "@/lib/attribution"
import { getCustomerTrackingIdentity, hasTrackingConsent } from "@/lib/customer-tracking"

function getBrowser(): string {
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return "Edge"
  if (/Chrome\//.test(ua)) return "Chrome"
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari"
  if (/Firefox\//.test(ua)) return "Firefox"
  return "Other"
}

function getOS(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS"
  if (/Android/.test(ua)) return "Android"
  if (/Mac OS X/.test(ua)) return "macOS"
  if (/Windows/.test(ua)) return "Windows"
  if (/Linux/.test(ua)) return "Linux"
  return "Other"
}

function getDeviceType(): string {
  const width = window.innerWidth
  if (/iPad|Tablet/.test(navigator.userAgent) || (width >= 768 && width < 1024)) return "tablet"
  if (/Mobi|Android|iPhone|iPod/.test(navigator.userAgent) || width < 768) return "mobile"
  return "desktop"
}

function getConnectionType(): string {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string }
  }
  return nav.connection?.effectiveType || "unknown"
}

function getLocaleFromPath(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0]
  if (first === "en" || first === "ko" || first === "zh-tw") return first
  return "ja"
}

// サイト内CTAのように、訪問者の流入元ではなく「クリックされたリンク自身」のUTMを
// 記録したいイベント向けの上書き。渡さなければ従来どおり流入元（getAttribution）を使う。
export interface DetailedEventUtmOverride {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

export interface DetailedEventContext {
  pagePath: string
}

export function buildDetailedEvent(
  name: AnalyticsEventName,
  properties: AnalyticsEventProperties = {},
  utmOverride?: DetailedEventUtmOverride,
  context?: DetailedEventContext,
): DetailedAnalyticsEvent | null {
  if (typeof window === "undefined") return null
  if (!hasTrackingConsent()) return null

  const attribution = getAttribution()
  const identity = getCustomerTrackingIdentity()
  if (!identity) return null
  const pathname = context?.pagePath || window.location.pathname || "/"

  return {
    event_name: name,
    visitor_id: identity.visitorId,
    visit_id: identity.visitId,
    booking_funnel_id: identity.bookingFunnelId,
    consent_version: identity.consentVersion,
    consented_at: identity.consentedAt,
    page_path: pathname,
    locale: getLocaleFromPath(pathname),
    device_type: getDeviceType(),
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    // 流入元（referrer_host / landing_page）はUTMを上書きしても残すので、
    // 「どこから来た人が、どのCTAを押したか」は引き続き追える。
    referrer_host: attribution?.referrer || "",
    landing_page: attribution?.landingPage || pathname,
    utm_source: utmOverride?.utm_source ?? attribution?.source ?? "",
    utm_medium: utmOverride?.utm_medium ?? attribution?.medium ?? "",
    utm_campaign: utmOverride?.utm_campaign ?? attribution?.campaign ?? "",
    utm_content: utmOverride?.utm_content ?? "",
    utm_term: utmOverride?.utm_term ?? "",
    browser: getBrowser(),
    os: getOS(),
    screen_width: window.screen?.width || 0,
    screen_height: window.screen?.height || 0,
    connection_type: getConnectionType(),
    properties,
  }
}

// GA4 / Vercel Analytics へ送る。転送方式（fetch / sendBeacon）に関係なく共通。
function forwardToAnalyticsClients(event: DetailedAnalyticsEvent): void {
  trackEvent(event.event_name, {
    ...event.properties,
    page_path: event.page_path,
    locale: event.locale,
    device_type: event.device_type,
    viewport_width: event.viewport_width,
    viewport_height: event.viewport_height,
    referrer_host: event.referrer_host,
    landing_page: event.landing_page,
    utm_source: event.utm_source,
    utm_medium: event.utm_medium,
    utm_campaign: event.utm_campaign,
    utm_content: event.utm_content,
    utm_term: event.utm_term,
    browser: event.browser,
    os: event.os,
    screen_width: event.screen_width,
    screen_height: event.screen_height,
    connection_type: event.connection_type,
  })
}

// スプレッドシートへは、近いタイミングのイベントをまとめて1回で送る。
// 1ページを開くと page_view・Web Vitals などが3〜5件同時に出る。1件ずつ送ると保存先のGASが
// 同時に何本も動いて1件25〜110秒かかり、2026-09-30夜には6割が保存に失敗した。
const SHEET_ENDPOINT = "/api/analytics/events"
const FLUSH_DELAY_MS = 1500
// /api/analytics/events・解析GASの上限（25件）より少なくし、sendBeacon の64KBにも収める
const MAX_BATCH_SIZE = 20

let pendingEvents: { event: DetailedAnalyticsEvent; queuedAt: number }[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let pageHideListening = false

function deliverToSheet(event: DetailedAnalyticsEvent, preferBeacon: boolean): void {
  pendingEvents.push({ event, queuedAt: Date.now() })
  listenForPageHide()

  // 直後にページを離れるイベントと、画面が隠れた後（タブを閉じる・アプリ切替）に出たイベント
  // （滞在時間・スクロール）は待たずに送る。待つと送る前にページが閉じて消える
  const hidden = typeof document !== "undefined" && document.visibilityState === "hidden"
  if (preferBeacon || hidden) {
    flushDetailedEvents(true)
    return
  }
  if (pendingEvents.length >= MAX_BATCH_SIZE) {
    flushDetailedEvents(preferBeacon)
    return
  }
  if (!flushTimer) flushTimer = setTimeout(() => flushDetailedEvents(false), FLUSH_DELAY_MS)
}

// ページを閉じる・別アプリへ切り替えるときに、待っているイベントを取りこぼさない
function listenForPageHide(): void {
  if (pageHideListening || typeof document === "undefined" || typeof window.addEventListener !== "function") return
  pageHideListening = true
  window.addEventListener("pagehide", () => flushDetailedEvents(true))
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushDetailedEvents(true)
  })
}

/** 待っているイベントをすぐ送る。計測は予約操作を妨げてはいけないため、失敗しても投げない。 */
export function flushDetailedEvents(preferBeacon = false): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (pendingEvents.length === 0) return

  const now = Date.now()
  // 発生時刻はサーバーの受信時刻で記録するため、ブラウザで待った時間を添えて補正してもらう
  const events = pendingEvents.splice(0).map(({ event, queuedAt }) => ({
    ...event,
    client_delay_ms: now - queuedAt,
  }))
  const body = JSON.stringify({ events })

  if (preferBeacon) {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body], { type: "application/json" })
        if (navigator.sendBeacon(SHEET_ENDPOINT, blob)) return
      }
    } catch {
      // sendBeacon が使えない・拒否された場合は下の fetch へフォールバックする
    }
  }

  try {
    void fetch(SHEET_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => undefined)
  } catch {
    // 計測の失敗をユーザーの操作へ波及させない
  }
}

export function sendDetailedEvent(
  name: AnalyticsEventName,
  properties: AnalyticsEventProperties = {},
  utmOverride?: DetailedEventUtmOverride,
  context?: DetailedEventContext,
): void {
  const event = buildDetailedEvent(name, properties, utmOverride, context)
  if (!event) return

  forwardToAnalyticsClients(event)
  deliverToSheet(event, false)
}

/**
 * 直後にページを離れるイベント用（pagehide、LINEログインのリダイレクト等）。
 * sendBeacon はページが破棄されても送信が保証されやすく、fetch(keepalive) より確実。
 *
 * line_login_click が0件なのに line_login_redirect_started が記録されるという
 * 取りこぼしが実データで出たため、遷移直前のイベントはこちらを使う。
 */
export function sendDetailedEventBeacon(
  name: AnalyticsEventName,
  properties: AnalyticsEventProperties = {},
  utmOverride?: DetailedEventUtmOverride,
  context?: DetailedEventContext,
): void {
  const event = buildDetailedEvent(name, properties, utmOverride, context)
  if (!event) return

  forwardToAnalyticsClients(event)
  deliverToSheet(event, true)
}
