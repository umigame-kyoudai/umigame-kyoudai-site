import { DurableObject } from 'cloudflare:workers'
import { activeAttempts, decideLimit, WINDOW_MS } from './rate-limit-state.mjs'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// One SQLite-backed object per HMACed address and endpoint. No raw IP,
// booking content, or coupon is stored here. Alarms clear expired state.
export class RateLimiter extends DurableObject {
  async fetch(request) {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/check') return new Response(null, { status: 404 })
    let body
    try { body = await request.json() } catch { return new Response(null, { status: 400 }) }
    const { scope, idempotencyKey } = body || {}
    if (!['booking', 'coupon'].includes(scope) || typeof idempotencyKey !== 'string' ||
        (idempotencyKey && (scope !== 'booking' || !UUID_V4.test(idempotencyKey)))) {
      return new Response(null, { status: 400 })
    }
    const now = Date.now()
    const allowed = await this.ctx.storage.transaction(async () => {
      const saved = await this.ctx.storage.get('attempts') || []
      const result = decideLimit(saved, scope, idempotencyKey, now)
      // As before, retrying the same booking does not consume another slot.
      if (result.changed) {
        await this.ctx.storage.put('attempts', result.active)
        await this.ctx.storage.setAlarm(now + WINDOW_MS + 1000)
      }
      return result.allowed
    })
    return Response.json({ allowed }, { headers: { 'Cache-Control': 'no-store' } })
  }

  async alarm() {
    // No external I/O inside this short critical section. The alarm may race a
    // new request, so only remove the object if every saved entry has expired.
    await this.ctx.blockConcurrencyWhile(async () => {
      const now = Date.now()
      const saved = await this.ctx.storage.get('attempts') || []
      const active = activeAttempts(saved, now)
      if (!active.length) {
        await this.ctx.storage.deleteAll()
      } else {
        await this.ctx.storage.put('attempts', active)
        await this.ctx.storage.setAlarm(Math.max(...active.map((entry) => entry.time)) + WINDOW_MS + 1000)
      }
    })
  }
}
