import { NextResponse } from "next/server"
import {
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_PROPERTY_KEYS,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from "@/lib/analytics-schema"

export const runtime = "nodejs"

// ブラウザは1ページ分のイベントをまとめて送る（lib/detailed-analytics.ts）。sendBeacon の上限64KBに合わせる。
const MAX_BODY_BYTES = 65_536
// 解析GASの MAX_EVENTS_PER_REQUEST と揃える
const MAX_EVENTS_PER_REQUEST = 25
// まとめ送信までブラウザで待った時間の上限。発生時刻は受信時刻からこの分だけ戻す
const MAX_CLIENT_DELAY_MS = 60_000
const eventNames = new Set<string>(ANALYTICS_EVENT_NAMES)
const propertyKeys = new Set<string>(ANALYTICS_PROPERTY_KEYS)
const CURRENT_TRACKING_CONSENT_VERSION = "2026-08-13"
const TRACKING_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function text(value: unknown, max = 200): string {
  return typeof value === "string" ? value.slice(0, max) : ""
}

function number(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.min(max, Math.max(min, value))
}

function safePath(value: unknown): string {
  const path = text(value, 300)
  return path.startsWith("/") && !path.includes("?") ? path : "/"
}

function trackingId(value: unknown): string {
  const id = text(value, 36)
  return TRACKING_ID_PATTERN.test(id) ? id : ""
}

function isoDate(value: unknown): string {
  const raw = text(value, 40)
  const parsed = new Date(raw)
  return raw && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : ""
}

function safeProperties(value: unknown): AnalyticsEventProperties {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const result: AnalyticsEventProperties = {}

  for (const [key, raw] of Object.entries(source)) {
    if (!propertyKeys.has(key)) continue
    if (typeof raw === "string") result[key] = raw.slice(0, 200)
    else if (typeof raw === "number" && Number.isFinite(raw)) result[key] = raw
    else if (typeof raw === "boolean" || raw === null) result[key] = raw
  }
  return result
}

type SheetEvent = {
  occurred_at: string
  event_name: AnalyticsEventName
  visitor_id: string
  visit_id: string
  booking_funnel_id: string
  consent_version: string
  consented_at: string
  page_path: string
  locale: string
  device_type: string
  viewport_width: number
  viewport_height: number
  referrer_host: string
  landing_page: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  utm_term: string
  browser: string
  os: string
  screen_width: number
  screen_height: number
  connection_type: string
  properties: AnalyticsEventProperties
}

type Rejection = "invalid" | "tracking_consent_required"

function toSheetEvent(value: unknown, receivedAt: number): SheetEvent | Rejection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "invalid"
  const raw = value as Record<string, unknown>

  const eventName = text(raw.event_name, 64)
  if (!eventNames.has(eventName)) return "invalid"

  // 端末の時計は信用せず、受信時刻から「ブラウザでまとめて送るまで待った時間」だけ戻す
  const clientDelayMs = number(raw.client_delay_ms, 0, MAX_CLIENT_DELAY_MS)

  const event: SheetEvent = {
    occurred_at: new Date(receivedAt - clientDelayMs).toISOString(),
    event_name: eventName as AnalyticsEventName,
    visitor_id: trackingId(raw.visitor_id),
    visit_id: trackingId(raw.visit_id),
    booking_funnel_id: trackingId(raw.booking_funnel_id),
    consent_version: text(raw.consent_version, 30),
    consented_at: isoDate(raw.consented_at),
    page_path: safePath(raw.page_path),
    locale: text(raw.locale, 10),
    device_type: text(raw.device_type, 20),
    viewport_width: number(raw.viewport_width, 0, 10_000),
    viewport_height: number(raw.viewport_height, 0, 10_000),
    referrer_host: text(raw.referrer_host, 200),
    landing_page: safePath(raw.landing_page),
    utm_source: text(raw.utm_source, 120),
    utm_medium: text(raw.utm_medium, 120),
    utm_campaign: text(raw.utm_campaign, 160),
    utm_content: text(raw.utm_content, 160),
    utm_term: text(raw.utm_term, 160),
    browser: text(raw.browser, 30),
    os: text(raw.os, 30),
    screen_width: number(raw.screen_width, 0, 10_000),
    screen_height: number(raw.screen_height, 0, 10_000),
    connection_type: text(raw.connection_type, 30),
    properties: safeProperties(raw.properties),
  }

  if (
    !event.visitor_id ||
    !event.visit_id ||
    event.consent_version !== CURRENT_TRACKING_CONSENT_VERSION ||
    !event.consented_at
  ) {
    return "tracking_consent_required"
  }
  return event
}

type Delivery =
  | { ok: true }
  | { ok: false, reason: string, upstreamStatus?: number, upstreamError?: string, durationMs: number }

const LOGGED_UPSTREAM_ERRORS = ["unauthorized", "busy", "invalid_request", "write_failed"]

async function deliver(webhookUrl: string, payload: Record<string, unknown>): Promise<Delivery> {
  const startedAt = Date.now()
  let reason = "analytics_webhook_network_error"
  let upstreamStatus: number | undefined
  let upstreamError: string | undefined
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    })
    upstreamStatus = response.status
    if (!response.ok) {
      reason = "analytics_webhook_failed"
      throw new Error(reason)
    }

    // Apps Scriptは共有シークレット不一致や不正イベントでもHTTP 200で
    // { ok: false } を返す。本文を確認しないと「送れているのにシートへ
    // 1行も入らない」状態に気づけないため、ok を明示的に検証する。
    const result = (await response.json().catch(() => null)) as { ok?: unknown; error?: unknown } | null
    if (!result || result.ok !== true) {
      reason = "analytics_webhook_rejected"
      // 応答本文や例外の全文には秘密情報が含まれる可能性があるため、
      // GASで定義したエラーコードだけを運用ログへ記録する。
      upstreamError = typeof result?.error === "string" && LOGGED_UPSTREAM_ERRORS.includes(result.error)
        ? result.error
        : "invalid_response"
      throw new Error(reason)
    }
    return { ok: true }
  } catch {
    return { ok: false, reason, upstreamStatus, upstreamError, durationMs: Date.now() - startedAt }
  }
}

function logFailure(failure: Exclude<Delivery, { ok: true }>, events: number): void {
  console.error("[analytics] Sheetsへの記録に失敗:", JSON.stringify({
    reason: failure.reason,
    upstreamStatus: failure.upstreamStatus,
    upstreamError: failure.upstreamError,
    durationMs: failure.durationMs,
    events,
  }))
}

export async function POST(request: Request) {
  const body = await request.text()
  if (body.length > MAX_BODY_BYTES) {
    return NextResponse.json({ accepted: false }, { status: 413 })
  }

  let raw: unknown
  try {
    raw = JSON.parse(body)
  } catch {
    return NextResponse.json({ accepted: false }, { status: 400 })
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ accepted: false }, { status: 400 })
  }

  // 新しいブラウザは { events: [...] }、更新前のページを開いたままの人は1件ずつ送ってくる
  const batch = (raw as { events?: unknown }).events
  const inputs = Array.isArray(batch) ? batch.slice(0, MAX_EVENTS_PER_REQUEST) : [raw]
  const receivedAt = Date.now()
  const results = inputs.map((input) => toSheetEvent(input, receivedAt))
  const events = results.filter((result): result is SheetEvent => typeof result === "object")

  if (events.length === 0) {
    const consentMissing = results.includes("tracking_consent_required")
    return NextResponse.json(
      consentMissing ? { accepted: false, reason: "tracking_consent_required" } : { accepted: false },
      { status: 400 },
    )
  }

  const webhookUrl = process.env.ANALYTICS_SHEETS_WEBHOOK_URL
  const secret = process.env.ANALYTICS_SHEETS_SHARED_SECRET
  if (!webhookUrl || !secret) {
    return NextResponse.json({ accepted: false, reason: "not_configured" }, { status: 202 })
  }

  if (events.length === 1) {
    const result = await deliver(webhookUrl, { secret, event: events[0] })
    if (result.ok) return NextResponse.json({ accepted: true })
    logFailure(result, 1)
    return NextResponse.json({ accepted: false, reason: "delivery_failed" }, { status: 502 })
  }

  // 複数件は1回の追記で保存する（GASへの同時実行が重なると1件数十秒〜かかり、応答が途切れていた）
  const result = await deliver(webhookUrl, { secret, events })
  if (result.ok) return NextResponse.json({ accepted: true })

  // invalid_request は「GASが何も書いていない」ことが確実な応答（まとめ送信に未対応の旧版GASもこれを返す）。
  // そのときだけ1件ずつ順番に送り直す。通信エラーや write_failed は書けたか不明なので再送しない。
  if (result.upstreamError !== "invalid_request") {
    logFailure(result, events.length)
    return NextResponse.json({ accepted: false, reason: "delivery_failed" }, { status: 502 })
  }

  let failed = 0
  for (const event of events) {
    const single = await deliver(webhookUrl, { secret, event })
    if (!single.ok) {
      failed++
      logFailure(single, 1)
    }
  }
  if (failed === 0) return NextResponse.json({ accepted: true })
  return NextResponse.json({ accepted: false, reason: "delivery_failed" }, { status: 502 })
}
