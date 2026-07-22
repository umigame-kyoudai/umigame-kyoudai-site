"use client"

import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  DetailedAnalyticsEvent,
} from "@/lib/analytics-schema"
import { getAttribution } from "@/lib/attribution"

const VISITOR_KEY = "umigame_analytics_visitor_v1"
const VISITOR_EXPIRY_KEY = "umigame_analytics_visitor_expiry_v1"
const SESSION_KEY = "umigame_analytics_session_v1"
const VISITOR_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000

function createAnonymousId(prefix: string): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return prefix + "_" + random
}

function getVisitorId(): string {
  try {
    const now = Date.now()
    const stored = localStorage.getItem(VISITOR_KEY)
    const expiresAt = Number(localStorage.getItem(VISITOR_EXPIRY_KEY) || 0)
    if (stored && expiresAt > now) return stored
    const next = createAnonymousId("v")
    localStorage.setItem(VISITOR_KEY, next)
    localStorage.setItem(VISITOR_EXPIRY_KEY, String(now + VISITOR_LIFETIME_MS))
    return next
  } catch {
    return createAnonymousId("v")
  }
}

function getSessionId(): string {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored) return stored
    const next = createAnonymousId("s")
    sessionStorage.setItem(SESSION_KEY, next)
    return next
  } catch {
    return createAnonymousId("s")
  }
}

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

export function buildDetailedEvent(
  name: AnalyticsEventName,
  properties: AnalyticsEventProperties = {},
): DetailedAnalyticsEvent | null {
  if (typeof window === "undefined") return null

  const attribution = getAttribution()
  const pathname = window.location.pathname || "/"

  return {
    occurred_at: new Date().toISOString(),
    event_name: name,
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    page_path: pathname,
    locale: getLocaleFromPath(pathname),
    device_type: getDeviceType(),
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    referrer_host: attribution.referrer || "",
    landing_page: attribution.landingPage || pathname,
    utm_source: attribution.source || "",
    utm_medium: attribution.medium || "",
    utm_campaign: attribution.campaign || "",
    utm_content: attribution.content || "",
    utm_term: attribution.term || "",
    browser: getBrowser(),
    os: getOS(),
    screen_width: window.screen?.width || 0,
    screen_height: window.screen?.height || 0,
    connection_type: getConnectionType(),
    properties,
  }
}

export function sendDetailedEvent(
  name: AnalyticsEventName,
  properties: AnalyticsEventProperties = {},
): void {
  const event = buildDetailedEvent(name, properties)
  if (!event) return

  try {
    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
      credentials: "same-origin",
    })
  } catch {
    // Analytics must never interrupt a booking or navigation.
  }
}

