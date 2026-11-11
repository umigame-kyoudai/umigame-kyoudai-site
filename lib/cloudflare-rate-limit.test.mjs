import assert from 'node:assert/strict'
import test from 'node:test'
import { cloudflareRateLimited } from './cloudflare-rate-limit.ts'
import { decideLimit, WINDOW_MS } from '../cloudflare/rate-limit-state.mjs'

test('booking retries retain their slot and a 10-minute window expires', () => {
  let attempts = []
  for (let i = 0; i < 5; i++) {
    const result = decideLimit(attempts, 'booking', `key-${i}`, 1000 + i)
    assert.equal(result.allowed, true)
    attempts = result.active
  }
  assert.equal(decideLimit(attempts, 'booking', 'new-key', 2000).allowed, false)
  assert.equal(decideLimit(attempts, 'booking', 'key-0', 2000).allowed, true)
  assert.equal(decideLimit(attempts, 'booking', 'new-key', 1000 + WINDOW_MS).allowed, true)
})

test('Cloudflare limiter uses a keyed identifier and fails closed on configuration or service failure', async (t) => {
  const symbol = Symbol.for('__cloudflare-context__')
  const previous = globalThis[symbol]
  t.after(() => { if (previous === undefined) delete globalThis[symbol]; else globalThis[symbol] = previous })
  const names = []
  const secret = 'local-synthetic-test-secret-0000000000'
  let response = Response.json({ allowed: true })
  const env = {
    RATE_LIMIT_HMAC_SECRET: secret,
    RATE_LIMITER: {
      idFromName(name) { names.push(name); return name },
      get() { return { fetch: async () => response.clone() } },
    },
  }
  globalThis[symbol] = { env }
  assert.equal(await cloudflareRateLimited('booking', '192.0.2.1'), false)
  assert.equal(await cloudflareRateLimited('booking', '192.0.2.1'), false)
  assert.equal(names[0], names[1])
  assert.ok(!names[0].includes('192.0.2.1') && !names[0].includes(secret))
  await assert.rejects(cloudflareRateLimited('booking', 'unknown'))
  response = new Response(null, { status: 503 })
  await assert.rejects(cloudflareRateLimited('coupon', '192.0.2.1'))
  env.RATE_LIMIT_HMAC_SECRET = ''
  await assert.rejects(cloudflareRateLimited('booking', '192.0.2.1'))
})
