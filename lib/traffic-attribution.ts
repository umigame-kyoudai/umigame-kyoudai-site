import { hasTrackingConsent } from "@/lib/customer-tracking"

// 大元は「お客様の回答」か「このブラウザで初めて計測できた入口」。
// 従来の last-non-direct 記録を初回流入へ転用しない。
export const TRAFFIC_SOURCES = {
  google: "Google（検索・マップ等）", google_search: "Google検索", gbp: "Googleマップ",
  instagram: "Instagram", youtube: "YouTube", line: "LINE", threads: "Threads",
  facebook: "Facebook", tiktok: "TikTok", x: "X", yahoo: "Yahoo!", bing: "Bing",
  chatgpt: "ChatGPT", claude: "Claude", gemini: "Gemini", perplexity: "Perplexity",
  copilot: "Copilot", grok: "Grok", deepseek: "DeepSeek",
  flyer: "チラシ・名刺", partner: "提携先・紹介リンク", friend: "知人・家族の紹介",
  repeat: "以前利用した", other_web: "その他のサイト", other: "その他",
  direct: "直接・参照元不明", unknown: "不明",
} as const
export type TrafficSource = keyof typeof TRAFFIC_SOURCES
export interface TrafficAttribution {
  version: 1
  originSource: TrafficSource
  originEvidence: "reported" | "first_observed" | "unknown"
  routeSource: TrafficSource
  routeEvidence: "tag" | "referrer" | "direct" | "unknown"
  routeMedium: string
}
export const TRAFFIC_MEDIUMS: Record<string, string> = {
  profile: "プロフィール", activity: "プラン一覧", booking: "予約リンク", story: "ストーリー",
  post: "投稿", reel: "リール", description: "概要欄", richmenu: "リッチメニュー",
  greeting: "あいさつメッセージ", broadcast: "一斉配信", chat: "個別トーク",
  message: "メッセージ", qr: "QRコード", referral: "紹介リンク", organic: "自然検索",
  cpc: "広告", social: "SNS",
}
export const ORIGIN_EVIDENCE = {
  reported: "お客様の回答", first_observed: "初回サイト流入（このブラウザ・90日以内）", unknown: "大元を確認できる記録なし",
} as const
export const ROUTE_EVIDENCE = { tag: "リンクの計測タグ", referrer: "参照元ドメイン", direct: "参照元なし", unknown: "記録なし" } as const
export const isTrafficSource = (value: unknown): value is TrafficSource =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(TRAFFIC_SOURCES, value)

export function normalizeTrafficAttribution(input: unknown): TrafficAttribution | null {
  if (!input || typeof input !== "object") return null
  const a = input as Record<string, unknown>
  if (a.version !== 1) return null
  const originSource = isTrafficSource(a.originSource) && a.originSource !== "direct" ? a.originSource : "unknown"
  const originEvidence = a.originEvidence === "reported" ? "reported"
    : a.originEvidence === "first_observed" && originSource !== "unknown" && originSource !== "line" ? "first_observed" : "unknown"
  const routeEvidence = ["tag", "referrer", "direct"].includes(String(a.routeEvidence)) ? a.routeEvidence as TrafficAttribution["routeEvidence"] : "unknown"
  return {
    version: 1,
    originSource: originEvidence === "unknown" ? "unknown" : originSource,
    originEvidence,
    routeSource: routeEvidence === "unknown" ? "unknown" : routeEvidence === "direct" ? "direct" : isTrafficSource(a.routeSource) ? a.routeSource : "unknown",
    routeEvidence,
    routeMedium: typeof a.routeMedium === "string" && Object.prototype.hasOwnProperty.call(TRAFFIC_MEDIUMS, a.routeMedium) ? a.routeMedium : "",
  }
}

const FIRST_KEY = "booking_first_observed_v1"
const ROUTE_KEY = "booking_entry_route_v1"
const MAX_AGE = 90 * 24 * 60 * 60 * 1000
const IDLE = 30 * 60 * 1000
let capturedDocument: Document | null = null
const matchesHost = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`)

export function classifyTrafficSource(source = "", referrer = ""): TrafficSource {
  const s = source.trim().toLowerCase()
  const host = referrer.toLowerCase().replace(/\.$/, "")
  const aliases: Record<string, TrafficSource> = { twitter: "x", affiliate: "partner", openai: "chatgpt", anthropic: "claude", google_gemini: "gemini", bard: "gemini", microsoft_copilot: "copilot", bing_copilot: "copilot" }
  const hosts: [TrafficSource, string[]][] = [
    ["chatgpt", ["chatgpt.com", "chat.openai.com"]], ["claude", ["claude.ai"]],
    ["gemini", ["gemini.google.com", "bard.google.com"]], ["perplexity", ["perplexity.ai"]],
    ["copilot", ["copilot.com", "copilot.microsoft.com", "copilot.cloud.microsoft"]],
    ["grok", ["grok.com"]], ["deepseek", ["chat.deepseek.com"]],
    ["instagram", ["instagram.com"]], ["youtube", ["youtube.com", "youtu.be"]],
    ["line", ["line.me", "jp.naver.line", "com.linecorp.line"]], ["threads", ["threads.net", "threads.com"]],
    ["facebook", ["facebook.com", "fb.com"]], ["tiktok", ["tiktok.com"]], ["x", ["x.com", "twitter.com", "t.co"]],
    ["google", ["google.com", "google.co.jp"]], ["yahoo", ["yahoo.co.jp"]], ["bing", ["bing.com"]],
  ]
  if (s) {
    if (isTrafficSource(s)) return s
    if (Object.prototype.hasOwnProperty.call(aliases, s)) return aliases[s]
    return hosts.find(([, domains]) => domains.some((domain) => matchesHost(s, domain)))?.[0] || "other"
  }
  if (!host) return "direct"
  return hosts.find(([, domains]) => domains.some((domain) => matchesHost(host, domain)))?.[0] || "other_web"
}

function readStored(storage: Storage, key: string, age: number): Record<string, unknown> | null {
  try {
    const a = JSON.parse(storage.getItem(key) || "null")
    return a && typeof a.at === "number" && a.at <= Date.now() && Date.now() - a.at <= age ? a : null
  } catch { return null }
}

export function captureTrafficAttribution(): void {
  if (typeof window === "undefined" || typeof document === "undefined" || !hasTrackingConsent() || capturedDocument === document) return
  capturedDocument = document
  try {
    const params = new URLSearchParams(window.location.search)
    const source = params.get("utm_source") || ""
    let host = ""
    try { host = new URL(document.referrer).hostname.toLowerCase() } catch {}
    const internal = host === window.location.hostname || (matchesHost(host, "umigamekyoudaimiyakojima.com") && matchesHost(window.location.hostname, "umigamekyoudaimiyakojima.com"))
    const authReturn = /^(access|auth|liff)\.line\.me$/.test(host) || params.has("liff.state") || (params.has("code") && params.has("state"))
    const previous = readStored(window.sessionStorage, ROUTE_KEY, IDLE)
    // LINE認証やサイト内CTAは予約経路を変えない。タグ付きLINEリンクへの新規訪問は変える。
    const ambiguousLineReturn = !source && classifyTrafficSource("", host) === "line" && previous
    let route = previous
    if (!(previous && (internal || authReturn || ambiguousLineReturn))) {
      const ignored = internal || authReturn
      route = {
        source: ignored ? "unknown" : classifyTrafficSource(source, host),
        evidence: ignored ? "unknown" : source ? "tag" : host ? "referrer" : "direct",
        medium: !ignored && source ? params.get("utm_medium") || "" : "", at: Date.now(),
      }
    }
    window.sessionStorage.setItem(ROUTE_KEY, JSON.stringify({ ...route, at: Date.now() }))
    if (!readStored(window.localStorage, FIRST_KEY, MAX_AGE)) {
      // LINEより前はこのサイトから見えない。直接・不明も後の入口で埋め直さない。
      const known = route && !["line", "direct", "unknown"].includes(String(route.source))
      window.localStorage.setItem(FIRST_KEY, JSON.stringify({
        source: known ? route!.source : "unknown", evidence: known ? "first_observed" : "unknown", at: Date.now(),
      }))
    }
  } catch { /* 計測失敗で予約を止めない */ }
}

export function getTrafficAttribution(reportedSource?: string): TrafficAttribution {
  let first: Record<string, unknown> | null = null
  let route: Record<string, unknown> | null = null
  if (typeof window !== "undefined" && hasTrackingConsent()) {
    captureTrafficAttribution()
    try {
      first = readStored(window.localStorage, FIRST_KEY, MAX_AGE)
      route = readStored(window.sessionStorage, ROUTE_KEY, IDLE)
      if (route) window.sessionStorage.setItem(ROUTE_KEY, JSON.stringify({ ...route, at: Date.now() }))
    } catch {}
  }
  const reported = isTrafficSource(reportedSource) && reportedSource !== "direct"
  return normalizeTrafficAttribution({
    version: 1,
    originSource: reported ? reportedSource : first?.source,
    originEvidence: reported ? "reported" : first?.evidence,
    routeSource: route?.source, routeEvidence: route?.evidence, routeMedium: route?.medium,
  })!
}

export function clearTrafficAttribution(): void {
  capturedDocument = null
  try { window.localStorage.removeItem(FIRST_KEY) } catch {}
  try { window.sessionStorage.removeItem(ROUTE_KEY) } catch {}
}

export function trafficEventProperties(a: TrafficAttribution) {
  return { traffic_version: a.version, origin_source: a.originSource, origin_evidence: a.originEvidence,
    booking_route: a.routeSource, route_evidence: a.routeEvidence, route_medium: a.routeMedium }
}

export function trafficAttributionNote(input: unknown): string {
  const a = normalizeTrafficAttribution(input)
  if (!a) return "[集客・予約経路]\n大元の集客元：不明（旧フォーム・記録なし）\n予約経路：不明（旧フォーム・記録なし）"
  const medium = a.routeMedium ? `／${TRAFFIC_MEDIUMS[a.routeMedium]}` : ""
  return `[集客・予約経路]\n大元の集客元：${TRAFFIC_SOURCES[a.originSource]}\n集客元の根拠：${ORIGIN_EVIDENCE[a.originEvidence]}\n予約経路：${TRAFFIC_SOURCES[a.routeSource]}${medium} → 公式サイト\n予約経路の根拠：${ROUTE_EVIDENCE[a.routeEvidence]}\n[traffic-v1] ${[a.originSource, a.originEvidence, a.routeSource, a.routeEvidence, a.routeMedium || "none"].join("|")}`
}
