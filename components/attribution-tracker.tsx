"use client"

import { useEffect } from "react"
import { captureAttribution } from "@/lib/attribution"

// 着地時に流入元（UTM/参照元）を記録するだけの不可視コンポーネント。
// window.location を effect 内で読むため useSearchParams 不要＝Suspense 不要。
export function AttributionTracker() {
  useEffect(() => {
    captureAttribution()
  }, [])
  return null
}
