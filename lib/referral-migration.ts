import { createHash, timingSafeEqual } from "node:crypto"
import {
  REFERRAL_COOKIE_NAME,
  REFERRAL_MAX_AGE_MS,
  createSignedReferralCookie,
  decodeUnverifiedReferralCookie,
  getCookieValue,
  getReferralCookieSecret,
  verifySignedReferralCookie,
  type ReferralCookiePayload,
} from "@/lib/referral"

// Owned production alias, verified against the Vercel project before migration.
// Never accept a URL from the request or send cookies/tokens to a configurable host.
export const LEGACY_REFERRAL_VERIFY_URL =
  "https://v0-website-ten-theta-21.vercel.app/api/internal/referral/verify"
const MAX_BRIDGE_BODY_BYTES = 4096
const BRIDGE_TIMEOUT_MS = 4000
const NO_STORE_HEADERS = { "cache-control": "private, no-store", "x-robots-tag": "noindex" }

export class ReferralMigrationUnavailableError extends Error {
  constructor() { super("Referral migration verification is temporarily unavailable") }
}

const validSecret = (value: string | undefined): string | null => {
  const secret = value?.trim() || ""
  return secret.length >= 32 ? secret : null
}

export function getReferralIssuanceSecret(): string | null {
  // Invalid replacement configuration must not silently keep issuing old cookies.
  if (process.env.REFERRAL_COOKIE_NEXT_SECRET !== undefined) {
    return validSecret(process.env.REFERRAL_COOKIE_NEXT_SECRET)
  }
  return getReferralCookieSecret()
}

function migrationActive(nowMs: number): boolean {
  const until = process.env.REFERRAL_MIGRATION_UNTIL
  if (!until && !process.env.REFERRAL_MIGRATION_TOKEN) return false
  const deadline = until ? Date.parse(until) : NaN
  // A fixed, bounded transition; no automatic renewal on deploy or request.
  if (!until?.endsWith("Z") || !Number.isFinite(deadline) || deadline - nowMs > REFERRAL_MAX_AGE_MS + 86_400_000) {
    throw new ReferralMigrationUnavailableError()
  }
  return nowMs < deadline
}

async function readBoundedJson(message: Request | Response): Promise<unknown> {
  if (!message.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new Error("Invalid bridge content type")
  if (Number(message.headers.get("content-length") || 0) > MAX_BRIDGE_BODY_BYTES || !message.body) throw new Error("Invalid bridge body size")
  const reader = message.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BRIDGE_BODY_BYTES) throw new Error("Invalid bridge body size")
      chunks.push(value)
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"))
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

export async function resolveReferralCookie(
  cookieValue: string | null | undefined,
  nowMs = Date.now(),
): Promise<{ referral: ReferralCookiePayload | null; needsResign: boolean }> {
  const empty = { referral: null, needsResign: false }
  const candidate = decodeUnverifiedReferralCookie(cookieValue, nowMs)
  if (!candidate) return empty
  const currentSecret = getReferralIssuanceSecret()
  const current = verifySignedReferralCookie(cookieValue, currentSecret, nowMs)
  if (current) return { referral: current, needsResign: false }

  const old = verifySignedReferralCookie(cookieValue, getReferralCookieSecret(), nowMs)
  if (old) {
    if (!currentSecret) throw new ReferralMigrationUnavailableError()
    return { referral: old, needsResign: true }
  }

  if (process.env.CF_WORKER_DEPLOYMENT !== "1" || !migrationActive(nowMs)) return empty
  const token = validSecret(process.env.REFERRAL_MIGRATION_TOKEN)
  if (!token || !currentSecret) throw new ReferralMigrationUnavailableError()
  try {
    const response = await fetch(LEGACY_REFERRAL_VERIFY_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ cookie: cookieValue }),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error("Bridge unavailable")
    const body = await readBoundedJson(response)
    if (!body || typeof body !== "object" || !("cookie" in body)) throw new Error("Invalid bridge response")
    if (body.cookie === null) return empty
    if (typeof body.cookie !== "string") throw new Error("Invalid bridge response")
    const verified = verifySignedReferralCookie(body.cookie, currentSecret, nowMs)
    // A successful bridge may only re-sign the original referral, never change it.
    if (!verified || JSON.stringify(verified) !== JSON.stringify(candidate)) throw new Error("Invalid bridge signature or payload")
    return { referral: verified, needsResign: true }
  } catch {
    throw new ReferralMigrationUnavailableError()
  }
}

export async function getVerifiedReferralFromCookieHeaderWithMigration(
  cookieHeader: string | null | undefined,
): Promise<ReferralCookiePayload | null> {
  return (await resolveReferralCookie(getCookieValue(cookieHeader, REFERRAL_COOKIE_NAME))).referral
}

export async function handleLegacyReferralVerification(request: Request): Promise<Response> {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE_HEADERS })
  // The original key stays only on Vercel Production. This route is unavailable on Workers/Preview.
  if (process.env.CF_WORKER_DEPLOYMENT === "1" || process.env.VERCEL !== "1" || process.env.VERCEL_ENV !== "production") {
    return reply({ error: "Not found" }, 404)
  }
  const nowMs = Date.now()
  try {
    if (!migrationActive(nowMs)) return reply({ error: "Not found" }, 404)
  } catch {
    return reply({ error: "Unavailable" }, 503)
  }
  const token = validSecret(process.env.REFERRAL_MIGRATION_TOKEN)
  const oldSecret = getReferralCookieSecret()
  const nextSecret = validSecret(process.env.REFERRAL_COOKIE_NEXT_SECRET)
  if (!token || !oldSecret || !nextSecret || oldSecret === nextSecret) return reply({ error: "Unavailable" }, 503)
  const authorization = request.headers.get("authorization") || ""
  const digest = (value: string) => createHash("sha256").update(value).digest()
  if (authorization.length > 256 || !timingSafeEqual(digest(authorization), digest(`Bearer ${token}`))) {
    return reply({ error: "Unauthorized" }, 401)
  }
  try {
    const body = await readBoundedJson(request)
    if (!body || typeof body !== "object" || !("cookie" in body) || typeof body.cookie !== "string" || body.cookie.length > 1024) {
      return reply({ error: "Invalid request" }, 400)
    }
    const payload = verifySignedReferralCookie(body.cookie, oldSecret, nowMs)
    return reply({ cookie: payload ? createSignedReferralCookie(payload, nextSecret) : null })
  } catch {
    return reply({ error: "Invalid request" }, 400)
  }
}
