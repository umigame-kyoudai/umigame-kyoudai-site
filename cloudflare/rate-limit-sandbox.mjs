import { RateLimiter } from './rate-limiter.mjs'

export { RateLimiter }

// Standalone, synthetic-only check of the real Durable Object implementation.
// It does not import the website, read request bodies or forward to LINE/GAS.
// Fixed groups and keys bound the number of objects and avoid storing user data.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const match = /^\/probe\/([0-7])\/([0-5])$/.exec(url.pathname)
    if (request.method !== 'POST' || !match) {
      return new Response('Synthetic rate-limit sandbox', {
        status: 404,
        headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
      })
    }

    const group = match[1]
    const key = `00000000-0000-4000-8000-${match[2].padStart(12, '0')}`
    const object = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(`sandbox-${group}`))
    const response = await object.fetch(new Request('https://rate-limit.internal/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'booking', idempotencyKey: key }),
    }))
    if (!response.ok) return new Response('Sandbox error', { status: 503 })
    const result = await response.json()
    if (typeof result?.allowed !== 'boolean') return new Response('Sandbox error', { status: 503 })
    return Response.json({ synthetic: true, allowed: result.allowed }, {
      status: result.allowed ? 200 : 429,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    })
  },
}
