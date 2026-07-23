"use client"

import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  DetailedAnalyticsEvent,
} from "@/lib/analytics-schema"
import { trackEvent } from "@/lib/analytics"
import { getAttribution } from "@/lib/attribution"

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
    event_name: name,
    page_path: pathname,
    locale: getLocaleFromPath(pathname),
    device_type: getDeviceType(),
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    referrer_host: attribution?.referrer || "",
    landing_page: attribution?.landingPage || pathname,
    utm_source: attribution?.source || "",
    utm_medium: attribution?.medium || "",
    utm_campaign: attribution?.campaign || "",
    utm_content: "",
    utm_term: "",
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

  trackEvent(name, {
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

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined)
}
