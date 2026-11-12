import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { NextRequest } from 'next/server'
import { GET as referralRedirect } from '../app/r/[code]/route.ts'
import { POST as bridge } from '../app/api/internal/referral/verify/route.ts'
import { POST as book } from '../app/api/booking/route.ts'
import { createSignedReferralCookie, verifySignedReferralCookie, REFERRAL_COOKIE_NAME, REFERRAL_MAX_AGE_MS } from './referral.ts'
import { LEGACY_REFERRAL_VERIFY_URL, ReferralMigrationUnavailableError, resolveReferralCookie } from './referral-migration.ts'

const oldSecret = 'synthetic-old-referral-secret-at-least-32-characters'
const newSecret = 'synthetic-new-referral-secret-at-least-32-characters'
const bridgeToken = 'synthetic-migration-token-at-least-32-characters'
const payload = (age = 86_400_000) => ({ referralCode: 'first-partner', campaign: 'printed-card', acquiredAt: new Date(Date.now() - age).toISOString() })
const activeUntil = () => new Date(Date.now() + REFERRAL_MAX_AGE_MS).toISOString()
const tamper = value => `${value.slice(0, -1)}${value.endsWith('A') ? 'B' : 'A'}`
function env(t, values = {}) {
  const all = { CF_WORKER_DEPLOYMENT: null, VERCEL: null, VERCEL_ENV: null, REFERRAL_COOKIE_SECRET: newSecret, REFERRAL_COOKIE_NEXT_SECRET: null, REFERRAL_MIGRATION_TOKEN: bridgeToken, REFERRAL_MIGRATION_UNTIL: activeUntil(), ...values }
  for (const [key, value] of Object.entries(all)) {
    const previous = process.env[key]
    if (value === null) delete process.env[key]; else process.env[key] = value
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous })
  }
  t.mock.method(console, 'warn', () => {})
}
const cloudflare = (t, extra = {}) => env(t, { CF_WORKER_DEPLOYMENT: '1', ...extra })
const vercel = (t, extra = {}) => env(t, { VERCEL: '1', VERCEL_ENV: 'production', REFERRAL_COOKIE_SECRET: oldSecret, REFERRAL_COOKIE_NEXT_SECRET: newSecret, ...extra })
const bridgeRequest = (cookie, authorization = `Bearer ${bridgeToken}`, extra = {}) => new Request(LEGACY_REFERRAL_VERIFY_URL, { method: 'POST', headers: { authorization, 'content-type': 'application/json' }, body: JSON.stringify({ cookie }), ...extra })
const redirectRequest = cookie => new NextRequest('https://www.umigamekyoudaimiyakojima.com/r/later-partner?c=later', { headers: cookie ? { cookie: `${REFERRAL_COOKIE_NAME}=${cookie}` } : {} })
const redirectContext = () => ({ params: Promise.resolve({ code: 'later-partner' }) })

test('Vercel issues the new signature while accepting both existing signature generations', async t => {
  vercel(t)
  t.mock.method(globalThis, 'fetch', () => { throw new Error('No network expected on Vercel') })
  const original = payload()
  assert.deepEqual(await resolveReferralCookie(createSignedReferralCookie(original, oldSecret)), { referral: original, needsResign: true })
  assert.deepEqual(await resolveReferralCookie(createSignedReferralCookie(original, newSecret)), { referral: original, needsResign: false })
  const response = await referralRedirect(redirectRequest(), redirectContext())
  const cookie = response.cookies.get(REFERRAL_COOKIE_NAME).value
  assert.equal(verifySignedReferralCookie(cookie, newSecret).referralCode, 'later-partner')
  assert.equal(verifySignedReferralCookie(cookie, oldSecret), null)
})

test('first referral and its original expiry survive re-signing; later links cannot replace or renew it', async t => {
  vercel(t)
  const original = payload(12 * 86_400_000)
  const response = await referralRedirect(redirectRequest(createSignedReferralCookie(original, oldSecret)), redirectContext())
  const set = response.cookies.get(REFERRAL_COOKIE_NAME)
  assert.deepEqual(verifySignedReferralCookie(set.value, newSecret), original)
  const maxAge = Number(response.headers.get('set-cookie').match(/Max-Age=(\d+)/i)[1])
  assert.ok(maxAge <= 18 * 86_400 && maxAge >= 18 * 86_400 - 2)
  const again = await referralRedirect(redirectRequest(set.value), redirectContext())
  assert.equal(again.headers.get('set-cookie'), null)
})

test('authenticated legacy verifier re-signs only verified old cookies without returning either key', async t => {
  vercel(t)
  const original = payload()
  const oldCookie = createSignedReferralCookie(original, oldSecret)
  const response = await bridge(bridgeRequest(oldCookie))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  const body = await response.json()
  assert.deepEqual(verifySignedReferralCookie(body.cookie, newSecret), original)
  assert.ok(!JSON.stringify(body).includes(oldSecret) && !JSON.stringify(body).includes(newSecret))
  for (const invalid of [tamper(oldCookie), createSignedReferralCookie(original, newSecret), createSignedReferralCookie(payload(REFERRAL_MAX_AGE_MS + 10_000), oldSecret)]) {
    assert.deepEqual(await (await bridge(bridgeRequest(invalid))).json(), { cookie: null })
  }
})

test('legacy verifier requires authorization and bounds the request body', async t => {
  vercel(t)
  const cookie = createSignedReferralCookie(payload(), oldSecret)
  assert.equal((await bridge(bridgeRequest(cookie, ''))).status, 401)
  assert.equal((await bridge(bridgeRequest(cookie, 'Bearer incorrect'))).status, 401)
  assert.equal((await bridge(bridgeRequest('x'.repeat(1025)))).status, 400)
  assert.equal((await bridge(bridgeRequest(cookie, `Bearer ${bridgeToken}`, { body: 'x'.repeat(5000) }))).status, 400)
  assert.equal((await bridge(bridgeRequest(cookie, `Bearer ${bridgeToken}`, { body: 'not-json' }))).status, 400)
})

for (const [name, override, status] of [
  ['Cloudflare', { CF_WORKER_DEPLOYMENT: '1' }, 404],
  ['Preview', { VERCEL_ENV: 'preview' }, 404],
  ['non-Vercel', { VERCEL: null }, 404],
  ['expired', { REFERRAL_MIGRATION_UNTIL: '2000-01-01T00:00:00.000Z' }, 404],
  ['not configured', { REFERRAL_MIGRATION_TOKEN: null, REFERRAL_MIGRATION_UNTIL: null }, 404],
  ['invalid deadline', { REFERRAL_MIGRATION_UNTIL: 'not-a-date' }, 503],
  ['unbounded deadline', { REFERRAL_MIGRATION_UNTIL: '2099-01-01T00:00:00.000Z' }, 503],
  ['missing next secret', { REFERRAL_COOKIE_NEXT_SECRET: null }, 503],
]) {
  test(`legacy verifier cannot be used when ${name}`, async t => {
    vercel(t, override)
    assert.equal((await bridge(bridgeRequest(createSignedReferralCookie(payload(), oldSecret)))).status, status)
  })
}

test('Cloudflare verifies a new signature locally and only sends eligible old cookies to the owned alias', async t => {
  cloudflare(t)
  const original = payload()
  const oldCookie = createSignedReferralCookie(original, oldSecret)
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init })
    assert.equal(url, LEGACY_REFERRAL_VERIFY_URL)
    assert.equal(init.headers.authorization, `Bearer ${bridgeToken}`)
    assert.equal(init.redirect, 'manual')
    assert.equal(init.cache, 'no-store')
    assert.ok(init.signal instanceof AbortSignal)
    assert.deepEqual(JSON.parse(init.body), { cookie: oldCookie })
    return Response.json({ cookie: createSignedReferralCookie(original, newSecret) })
  })
  assert.deepEqual(await resolveReferralCookie(createSignedReferralCookie(original, newSecret)), { referral: original, needsResign: false })
  for (const invalid of [null, 'malformed', 'x'.repeat(2000), createSignedReferralCookie(payload(REFERRAL_MAX_AGE_MS + 1000), oldSecret)]) {
    assert.deepEqual(await resolveReferralCookie(invalid), { referral: null, needsResign: false })
  }
  assert.equal(calls.length, 0)
  assert.deepEqual(await resolveReferralCookie(oldCookie), { referral: original, needsResign: true })
  assert.equal(calls.length, 1)
})

test('Cloudflare safely resolves an explicitly rejected legacy cookie to no referral', async t => {
  cloudflare(t)
  t.mock.method(globalThis, 'fetch', async () => Response.json({ cookie: null }))
  assert.deepEqual(await resolveReferralCookie(tamper(createSignedReferralCookie(payload(), oldSecret))), { referral: null, needsResign: false })
})

for (const [name, response] of [
  ['redirect to another host', () => new Response(null, { status: 307, headers: { location: 'https://untrusted.example.test/collect' } })],
  ['network timeout', () => { throw new DOMException('Synthetic timeout', 'TimeoutError') }],
  ['service failure', () => new Response('', { status: 503 })],
  ['invalid JSON', () => new Response('{', { headers: { 'content-type': 'application/json' } })],
  ['oversized body', () => Response.json({ cookie: 'x'.repeat(5000) })],
  ['missing result', () => Response.json({})],
  ['incorrect signature', () => Response.json({ cookie: createSignedReferralCookie(payload(), oldSecret) })],
  ['changed attribution', () => Response.json({ cookie: createSignedReferralCookie({ ...payload(), referralCode: 'different-partner' }, newSecret) })],
]) {
  test(`Cloudflare preserves the original cookie and rejects booking attribution on ${name}`, async t => {
    cloudflare(t)
    t.mock.method(globalThis, 'fetch', async () => response())
    const cookie = createSignedReferralCookie(payload(), oldSecret)
    await assert.rejects(resolveReferralCookie(cookie), ReferralMigrationUnavailableError)
    const redirect = await referralRedirect(redirectRequest(cookie), redirectContext())
    assert.equal(redirect.status, 307)
    assert.equal(redirect.headers.get('set-cookie'), null)
  })
}

test('partial bridge configuration fails closed and a completed transition makes no remote request', async t => {
  cloudflare(t)
  t.mock.method(globalThis, 'fetch', () => { throw new Error('No network expected') })
  const cookie = createSignedReferralCookie(payload(), oldSecret)
  delete process.env.REFERRAL_MIGRATION_TOKEN
  await assert.rejects(resolveReferralCookie(cookie), ReferralMigrationUnavailableError)
  process.env.REFERRAL_MIGRATION_UNTIL = '2000-01-01T00:00:00.000Z'
  assert.deepEqual(await resolveReferralCookie(cookie), { referral: null, needsResign: false })
})

for (const outage of [false, true]) {
  test(`booking ${outage ? 'stops before GAS on a bridge outage' : 'passes the original verified referral to GAS'}`, async t => {
    cloudflare(t, { LINE_LOGIN_CHANNEL_ID: '1234567890', GAS_BOOKING_URL: 'https://gas.example.test/booking', BOOKING_SOURCE_SECRET: newSecret })
    const symbol = Symbol.for('__cloudflare-context__'), previous = globalThis[symbol]
    t.after(() => { if (previous === undefined) delete globalThis[symbol]; else globalThis[symbol] = previous })
    globalThis[symbol] = { env: { RATE_LIMIT_HMAC_SECRET: newSecret, RATE_LIMITER: { idFromName: x => x, get: () => ({ fetch: async () => Response.json({ allowed: true }) }) } } }
    const original = payload(), sent = []
    t.mock.method(console, 'info', () => {})
    t.mock.method(globalThis, 'fetch', async (url, init) => {
      if (String(url) === 'https://api.line.me/oauth2/v2.1/verify') return Response.json({ iss: 'https://access.line.me', aud: '1234567890', sub: 'U-synthetic-migration', exp: Math.floor(Date.now() / 1000) + 3600 })
      if (String(url) === LEGACY_REFERRAL_VERIFY_URL) {
        if (outage) throw new Error('Synthetic outage')
        return Response.json({ cookie: createSignedReferralCookie(original, newSecret) })
      }
      assert.equal(String(url), process.env.GAS_BOOKING_URL)
      sent.push(JSON.parse(init.body))
      return Response.json({ success: true })
    })
    const booking = { selectedPlan: 'S3', selectedDate: '2099-12-10', selectedTime: '19:20', customerName: 'Synthetic Test', customerEmail: 'local@example.test', customerPhone: '09000000000', participants: [{ category: 'adult', name: 'Synthetic Test', age: 30 }], agreedToTerms: true, lineIdToken: 'synthetic-only', referral: { referralCode: 'attacker-controlled' } }
    const response = await book(new Request('https://booking.example.test/api/booking', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.1', 'x-forwarded-for': '192.0.2.1', 'idempotency-key': randomUUID(), cookie: `${REFERRAL_COOKIE_NAME}=${createSignedReferralCookie(original, oldSecret)}` }, body: JSON.stringify(booking) }))
    assert.equal(response.status, outage ? 503 : 200, JSON.stringify(await response.clone().json()))
    assert.equal(sent.length, outage ? 0 : 1)
    if (!outage) assert.deepEqual(sent[0].referral, original)
  })
}
