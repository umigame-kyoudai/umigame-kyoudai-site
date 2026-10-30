"use client"

import { useEffect, useState } from "react"

// 締切は分単位。毎分とタブへの復帰時に更新し、初回HTMLとの時刻差も避ける。
export function useBookingClock(): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const update = () => {
      clearTimeout(timer)
      const current = Date.now()
      setNow(current)
      const remainder = current % 60_000
      timer = setTimeout(update, remainder === 0 ? 1 : 60_000 - remainder + 1)
    }
    update()
    window.addEventListener("focus", update)
    document.addEventListener("visibilitychange", update)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("focus", update)
      document.removeEventListener("visibilitychange", update)
    }
  }, [])
  return now
}
