import { NextResponse } from "next/server"
import { PLANS } from "@/lib/data"
import { checkInventory, readInventoryMode } from "@/lib/inventory-client"
import { availabilityRequests, availabilityTable } from "@/lib/inventory-availability"

// 予約在庫（管理システム docs/130）：予約画面に出す空き。?plan=S1&from=YYYY-MM-DD&to=YYYY-MM-DD（31日まで）。
// BOOKING_INVENTORY_MODE が off の時・管理システムにつながらない時は、今まで通り全部の時刻を出す（mode で知らせる）。お客様の情報は扱わない。
export const dynamic = "force-dynamic"
const DATE = /^\d{4}-\d{2}-\d{2}$/
const noStore = { "Cache-Control": "no-store" }

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = readInventoryMode()
  if (mode === "off") return NextResponse.json({ mode: "off" }, { headers: noStore })
  const plan = PLANS.find((p) => p.id === url.searchParams.get("plan"))
  const from = url.searchParams.get("from") ?? ""
  const to = url.searchParams.get("to") ?? ""
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000
  if (!plan || !DATE.test(from) || !DATE.test(to) || !(days >= 1 && days <= 31)) {
    return NextResponse.json({ mode, error: "INVALID_REQUEST" }, { status: 400, headers: noStore })
  }
  const result = await checkInventory(availabilityRequests(plan.id, plan.name, from, to))
  if (!result.ok) return NextResponse.json({ mode: "unavailable" }, { headers: noStore })
  return NextResponse.json(
    { mode: result.data.paused ? "unavailable" : mode, today: result.data.today, slots: result.data.paused ? {} : availabilityTable(result.data.results) },
    { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } },
  )
}
