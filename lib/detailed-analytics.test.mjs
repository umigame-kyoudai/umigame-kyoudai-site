import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDetailedEvent, flushDetailedEvents, sendDetailedEvent, sendDetailedEventBeacon } from './detailed-analytics.ts'

function storage() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) }
}

test('cleanup events retain the page being measured after browser navigation', t => {
  const priorWindow = globalThis.window
  t.after(() => { globalThis.window = priorWindow })
  const localStorage = storage()
  localStorage.setItem('customer_tracking_consent_v1', JSON.stringify({ status: 'accepted', version: '2026-08-13', decidedAt: new Date().toISOString() }))
  globalThis.window = { location: { pathname: '/book' }, localStorage, sessionStorage: storage(), innerWidth: 390, innerHeight: 844, screen: { width: 390, height: 844 } }
  const sent = []
  t.mock.method(globalThis, 'fetch', async (_url, init) => { sent.push(JSON.parse(init.body)); return Response.json({ success: true }) })
  sendDetailedEvent('page_engagement', { engagedSeconds: 8, maxScrollPercent: 75 }, undefined, { pagePath: '/en/blog' })
  sendDetailedEvent('scroll_depth', { maxScrollPercent: 75 }, undefined, { pagePath: '/en/blog' })
  flushDetailedEvents()
  assert.equal(sent.length, 1)
  assert.equal(sent[0].events.length, 2)
  assert.ok(sent[0].events.every(event => event.page_path === '/en/blog' && event.locale === 'en'))
  assert.equal(buildDetailedEvent('page_view').page_path, '/book')
  localStorage.removeItem('customer_tracking_consent_v1')
  assert.equal(buildDetailedEvent('page_engagement', {}, undefined, { pagePath: '/en/blog' }), null)
})

test('events from one page go out together in a single request, and leaving the page sends them at once', t => {
  const priorWindow = globalThis.window
  t.after(() => { globalThis.window = priorWindow; flushDetailedEvents() })
  const localStorage = storage()
  localStorage.setItem('customer_tracking_consent_v1', JSON.stringify({ status: 'accepted', version: '2026-08-13', decidedAt: new Date().toISOString() }))
  globalThis.window = { location: { pathname: '/book' }, localStorage, sessionStorage: storage(), innerWidth: 390, innerHeight: 844, screen: { width: 390, height: 844 } }
  const sent = []
  t.mock.method(globalThis, 'fetch', async (_url, init) => { sent.push(JSON.parse(init.body)); return Response.json({ accepted: true }) })

  sendDetailedEvent('page_view')
  sendDetailedEvent('web_vital', { vitalName: 'LCP', vitalValue: 1200, vitalRating: 'good' })
  sendDetailedEvent('booking_form_view')
  assert.equal(sent.length, 0, 'nothing is sent until the short batching window ends')

  // 直後にページを離れるイベントは、待っていた分と一緒にすぐ送る
  sendDetailedEventBeacon('booking_abandoned', { last_stage: 'date' })
  assert.equal(sent.length, 1)
  assert.deepEqual(sent[0].events.map(event => event.event_name), ['page_view', 'web_vital', 'booking_form_view', 'booking_abandoned'])
  assert.ok(sent[0].events.every(event => Number.isFinite(event.client_delay_ms) && event.client_delay_ms >= 0))

  flushDetailedEvents()
  assert.equal(sent.length, 1, 'an empty queue sends nothing')
})

test('engagement sent after the page is hidden goes out at once instead of waiting and being lost', t => {
  const priorWindow = globalThis.window
  const priorDocument = globalThis.document
  const priorNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  t.after(() => {
    globalThis.window = priorWindow
    if (priorDocument === undefined) delete globalThis.document
    else globalThis.document = priorDocument
    if (priorNavigator) Object.defineProperty(globalThis, 'navigator', priorNavigator)
    flushDetailedEvents()
  })
  const localStorage = storage()
  localStorage.setItem('customer_tracking_consent_v1', JSON.stringify({ status: 'accepted', version: '2026-08-13', decidedAt: new Date().toISOString() }))
  globalThis.window = { location: { pathname: '/plans' }, localStorage, sessionStorage: storage(), innerWidth: 390, innerHeight: 844, screen: { width: 390, height: 844 } }
  globalThis.document = { visibilityState: 'hidden' }
  const beacons = []
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { userAgent: 'test', sendBeacon: (url, blob) => { beacons.push({ url, blob }); return true } },
  })
  t.mock.method(globalThis, 'fetch', async () => assert.fail('hidden pages must use sendBeacon'))

  sendDetailedEvent('page_engagement', { engagedSeconds: 30, maxScrollPercent: 80 })
  assert.equal(beacons.length, 1, 'sent immediately, not after the 1.5s batching window')
  assert.equal(beacons[0].url, '/api/analytics/events')
})
