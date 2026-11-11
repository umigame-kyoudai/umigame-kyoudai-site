import { getCloudflareContext } from '@opennextjs/cloudflare'

type Scope = 'booking' | 'coupon'
type LimiterNamespace = {
  idFromName(name: string): unknown
  get(id: unknown): { fetch(request: Request): Promise<Response> }
}

/** Strongly consistent per-IP limits. A missing binding/key fails closed. */
export async function cloudflareRateLimited(scope: Scope, ip: string, idempotencyKey = ''): Promise<boolean> {
  const { env } = getCloudflareContext()
  const { RATE_LIMITER, RATE_LIMIT_HMAC_SECRET } = env as unknown as {
    RATE_LIMITER?: LimiterNamespace
    RATE_LIMIT_HMAC_SECRET?: string
  }
  if (!RATE_LIMITER || !RATE_LIMIT_HMAC_SECRET || RATE_LIMIT_HMAC_SECRET.length < 32 || !ip || ip === 'unknown') {
    throw new Error('rate_limit_not_configured')
  }
  // The object name is keyed, so raw client addresses are not stored in DOs.
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(RATE_LIMIT_HMAC_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${scope}:${ip}`))
  const identifier = [...new Uint8Array(signature)].map((part) => part.toString(16).padStart(2, '0')).join('')
  const stub = RATE_LIMITER.get(RATE_LIMITER.idFromName(`${scope}:${identifier}`))
  const response = await stub.fetch(new Request('https://rate-limit.internal/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, idempotencyKey }),
  }))
  if (!response.ok) throw new Error('rate_limit_unavailable')
  const result: unknown = await response.json()
  if (!result || typeof result !== 'object' || !('allowed' in result) || typeof result.allowed !== 'boolean') {
    throw new Error('rate_limit_invalid_response')
  }
  return !result.allowed
}
