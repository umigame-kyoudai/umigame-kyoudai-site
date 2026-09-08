import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDetailedEvent, sendDetailedEvent } from './detailed-analytics.ts'

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
  assert.equal(sent.length, 2)
  assert.ok(sent.every(event => event.page_path === '/en/blog' && event.locale === 'en'))
  assert.equal(buildDetailedEvent('page_view').page_path, '/book')
  localStorage.removeItem('customer_tracking_consent_v1')
  assert.equal(buildDetailedEvent('page_engagement', {}, undefined, { pagePath: '/en/blog' }), null)
})
