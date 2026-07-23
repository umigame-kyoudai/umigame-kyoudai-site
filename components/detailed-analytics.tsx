"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useReportWebVitals } from "next/web-vitals"
import { sendDetailedEvent } from "@/lib/detailed-analytics"

function linkType(anchor: HTMLAnchorElement): string {
  const href = anchor.getAttribute("href") || ""
  if (href.startsWith("tel:")) return "phone"
  if (href.includes("line.me") || href.includes("lin.ee")) return "line"
  if (href.includes("google.com/maps") || href.includes("maps.app.goo.gl")) return "map"
  if (href.includes("activityjapan")) return "activity_japan"
  if (href.includes("jalan")) return "jalan"
  return "external"
}

function isLanguageLink(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute("href") || ""
  return /^\/(en|ko|zh-tw)(\/|$)/.test(href) || anchor.hasAttribute("hreflang")
}

export function DetailedAnalytics() {
  const pathname = usePathname()
  const startedAt = useRef(Date.now())
  const maxScroll = useRef(0)
  const lastPageViewPath = useRef<string | null>(null)

  useReportWebVitals((metric) => {
    sendDetailedEvent("web_vital", {
      vitalName: metric.name,
      vitalValue: Math.round(metric.value * 100) / 100,
      vitalRating: metric.rating,
    })
  })

  useEffect(() => {
    startedAt.current = Date.now()
    maxScroll.current = 0
    if (lastPageViewPath.current !== pathname) {
      lastPageViewPath.current = pathname
      sendDetailedEvent("page_view")
    }

    const updateScroll = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight
      const percent = available <= 0 ? 100 : Math.round((window.scrollY / available) * 100)
      maxScroll.current = Math.max(maxScroll.current, Math.min(100, percent))
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest("a") as HTMLAnchorElement | null
      if (!anchor) return

      if (isLanguageLink(anchor)) {
        sendDetailedEvent("language_change", {
          location: anchor.getAttribute("href") || "",
        })
      }

      let url: URL
      try {
        url = new URL(anchor.href, window.location.origin)
      } catch {
        return
      }
      if (url.origin === window.location.origin) return

      const type = linkType(anchor)
      if (type === "phone" || type === "line") return
      sendDetailedEvent("external_link_click", {
        linkHost: url.hostname,
        linkType: type,
        location: anchor.dataset.analyticsLocation || "content",
      })
    }

    let engagementSent = false
    const sendEngagement = () => {
      if (engagementSent) return
      engagementSent = true
      const seconds = Math.max(0, Math.round((Date.now() - startedAt.current) / 1000))
      if (seconds >= 2) {
        sendDetailedEvent("page_engagement", {
          engagedSeconds: Math.min(seconds, 21_600),
          maxScrollPercent: maxScroll.current,
        })
      }
      if (maxScroll.current >= 25) {
        sendDetailedEvent("scroll_depth", { maxScrollPercent: maxScroll.current })
      }
    }

    updateScroll()
    window.addEventListener("scroll", updateScroll, { passive: true })
    document.addEventListener("click", onClick, true)
    window.addEventListener("pagehide", sendEngagement, { once: true })

    return () => {
      sendEngagement()
      window.removeEventListener("scroll", updateScroll)
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("pagehide", sendEngagement)
    }
  }, [pathname])

  return null
}
