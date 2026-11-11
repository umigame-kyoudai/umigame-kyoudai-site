// 予約在庫（管理システム docs/130）：ホームページのサーバーから管理システムを呼ぶ部分（サーバーだけで使う。ブラウザには出さない）。
// 設定：BOOKING_INVENTORY_MODE＝off（既定・今のまま）／display（空きを見せるだけ。送信は今の仮予約）／live（空きがあれば管理システムで確定）。
//       MANAGEMENT_INVENTORY_URL（管理システムの公開URL）・MANAGEMENT_INVENTORY_SECRET（管理システムの UMIGAME_WEB_INVENTORY_SECRET と同じ合言葉）。
// 管理システムにつながらない・止めている時は、呼び出した側が今の仮予約（旧GAS）へ切り替える（2026-11-11 オーナー回答）。
export type InventoryMode = "off" | "display" | "live"
export function readInventoryMode(env: Record<string, string | undefined> = process.env): InventoryMode {
  const mode = String(env.BOOKING_INVENTORY_MODE ?? "").trim()
  if (mode !== "display" && mode !== "live") return "off"
  return readInventoryConfig(env) ? mode : "off"
}
function readInventoryConfig(env: Record<string, string | undefined> = process.env) {
  const url = String(env.MANAGEMENT_INVENTORY_URL ?? "").trim().replace(/\/+$/, "")
  const secret = String(env.MANAGEMENT_INVENTORY_SECRET ?? "")
  if (!/^https:\/\/[A-Za-z0-9.-]+$/.test(url) || secret.length < 32) return null
  return { url, secret }
}

// uncertain：送ったかもしれない（作ったかどうか分からない）。uncertain でない失敗は、管理システムが予約を作っていないと言い切れる時だけ。
export type InventoryCall<T> = { ok: true; status: number; data: T } | { ok: false; uncertain: boolean; status: number | null; error: string | null }

// つなぐ前に失敗した（相手に届いていない）ことが分かる失敗。これ以外の通信の失敗は「届いたかもしれない」として扱う。
const NOT_SENT_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT", "CERT_HAS_EXPIRED", "ERR_TLS_CERT_ALTNAME_INVALID", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN"])
export function notSent(error: unknown): boolean {
  if (!(error instanceof Error) || error.name === "TimeoutError" || error.name === "AbortError") return false
  const cause = (error as { cause?: { code?: unknown } }).cause
  return typeof cause?.code === "string" && NOT_SENT_CODES.has(cause.code)
}

async function call<T>(path: string, init: { method: "GET" | "POST"; body?: unknown; timeoutMs: number }, fetcher: typeof fetch = fetch): Promise<InventoryCall<T>> {
  const config = readInventoryConfig()
  if (!config) return { ok: false, uncertain: false, status: null, error: "NOT_CONFIGURED" }
  let response: Response
  try {
    response = await fetcher(`${config.url}/web-inventory/v1/${path}`, {
      method: init.method,
      headers: { authorization: `Bearer ${config.secret}`, ...(init.body === undefined ? {} : { "content-type": "application/json" }) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(init.timeoutMs),
    })
  } catch (error) {
    // 送ったかどうか分からない（通信の途中で切れた・時間切れ）。つなぐ前の失敗だけは、届いていないと分かる。
    return { ok: false, uncertain: init.method === "POST" && !notSent(error), status: null, error: notSent(error) ? "NOT_SENT" : "NETWORK" }
  }
  let data: unknown = null
  try { data = await response.json() } catch { return { ok: false, uncertain: init.method === "POST" && response.status >= 500, status: response.status, error: null } }
  const body = (data ?? {}) as { error?: unknown; attempted?: unknown }
  const error = typeof body.error === "string" ? body.error : null
  // attempted:false は、管理システムがDBを呼ぶ前に止まった（予約は作っていない）。
  if (!response.ok) return { ok: false, uncertain: response.status >= 500 && init.method === "POST" && body.attempted !== false, status: response.status, error }
  return { ok: true, status: response.status, data: data as T }
}

export interface AvailabilityRequest { key: string; people: number; tours: Array<{ date: string; time: string | null; plan_code: string | null; plan_text: string }> }
export interface AvailabilityResult { key: string; state: "OPEN" | "FULL" | "CLOSED" | "NOT_OFFERED" | "UNMANAGED"; remaining: number | null }
export interface AvailabilityResponse { today: string; paused: boolean; results: AvailabilityResult[] }
export const checkInventory = (requests: AvailabilityRequest[], fetcher?: typeof fetch) =>
  call<AvailabilityResponse>("availability", { method: "POST", body: { requests }, timeoutMs: 3000 }, fetcher)

export interface CreateResult { state: "CREATED" | "FULL" | "CLOSED" | "NOT_OFFERED" | "UNMANAGED" | "PAUSED" | "NOT_READY" | "NONE" | "ABANDONED"; booking_number: string; booking_id: string | null; remaining: number | null; replayed: boolean }
export const createInventoryBooking = (body: { booking_number: string; item: unknown; details: unknown }, fetcher?: typeof fetch) =>
  call<CreateResult>("bookings", { method: "POST", body, timeoutMs: 8000 }, fetcher)
export const readInventoryBooking = (bookingNumber: string, fetcher?: typeof fetch) =>
  call<CreateResult>(`bookings/${encodeURIComponent(bookingNumber)}`, { method: "GET", timeoutMs: 3000 }, fetcher)
// 作成の結果が分からない時：走っている作成が終わるのを待ってから、作っていれば CREATED、無ければ「あきらめた」印を残して ABANDONED。
// ABANDONED の後は、遅れて届いた作成も予約を作らないので、今の仮予約（旧GAS）へ切り替えてよい。
export const abandonInventoryBooking = (bookingNumber: string, fetcher?: typeof fetch) =>
  call<CreateResult>(`bookings/${encodeURIComponent(bookingNumber)}/abandon`, { method: "POST", body: {}, timeoutMs: 8000 }, fetcher)
