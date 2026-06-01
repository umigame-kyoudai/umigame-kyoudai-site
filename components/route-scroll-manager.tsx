"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function RouteScrollManager() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()

  useEffect(() => {
    const hash = window.location.hash

    if (hash) {
      requestAnimationFrame(() => {
        const target = document.getElementById(decodeURIComponent(hash.slice(1)))
        target?.scrollIntoView({ block: "start", behavior: "auto" })
      })
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [pathname, search])

  return null
}
