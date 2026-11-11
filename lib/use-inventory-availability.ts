"use client"
// 予約在庫（管理システム docs/130）：選んだプランと日付の空きを読む（15秒だけ使い回す）。つながらない・止めている時は空きの情報なし（今まで通り）。
import { useCallback, useEffect, useState } from "react"
import type { DaySlots } from "@/lib/inventory-slot"

export type InventoryAvailability = { mode: "off" | "display" | "live" | "unavailable" | "loading"; slots: DaySlots | null; reload: () => void }
const nextDay = (date: string) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10) }

export function useInventoryAvailability(planId: string, date: string): InventoryAvailability {
  const [state, setState] = useState<{ key: string; mode: InventoryAvailability["mode"]; slots: DaySlots | null }>({ key: "", mode: "off", slots: null })
  const [generation, setGeneration] = useState(0)
  const key = planId && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${planId}|${date}` : ""
  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    setState((s) => (s.key === key ? s : { key, mode: "loading", slots: null }))
    fetch(`/api/availability?${new URLSearchParams({ plan: planId, from: date, to: nextDay(date) })}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (controller.signal.aborted) return
        const mode = ["off", "display", "live"].includes(data?.mode) ? data.mode : "unavailable"
        setState({ key, mode, slots: mode === "display" || mode === "live" ? (data?.slots?.[date] ?? { main: {}, night: {} }) : null })
      })
      .catch(() => { if (!controller.signal.aborted) setState({ key, mode: "unavailable", slots: null }) })
    return () => controller.abort()
  }, [key, planId, date, generation])
  const reload = useCallback(() => setGeneration((g) => g + 1), [])
  return { mode: state.key === key ? state.mode : "loading", slots: state.key === key ? state.slots : null, reload }
}
