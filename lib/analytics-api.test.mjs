import assert from 'node:assert/strict'
import test from 'node:test'
import { POST } from '../app/api/analytics/events/route.ts'

const event = {
  event_name: 'page_view',
  visitor_id: 'c23ef1a4-4eae-437d-9038-ebc529896a27',
  visit_id: 'f5a24808-a39e-4cc2-a09d-bd6df58061b2',
  consent_version: '2026-08-13',
  consented_at: '2026-09-08T12:00:00.000Z',
  page_path: '/book',
}
const request = body => new Request('http://localhost/api/analytics/events', {
  method: 'POST', body: JSON.stringify(body),
})

function configure(t, fetcher) {
  const oldUrl = process.env.ANALYTICS_SHEETS_WEBHOOK_URL
  const oldSecret = process.env.ANALYTICS_SHEETS_SHARED_SECRET
  process.env.ANALYTICS_SHEETS_WEBHOOK_URL = 'https://gas.example.test/analytics'
  process.env.ANALYTICS_SHEETS_SHARED_SECRET = 'private-test-secret'
  t.after(() => {
    if (oldUrl === undefined) delete process.env.ANALYTICS_SHEETS_WEBHOOK_URL
    else process.env.ANALYTICS_SHEETS_WEBHOOK_URL = oldUrl
    if (oldSecret === undefined) delete process.env.ANALYTICS_SHEETS_SHARED_SECRET
    else process.env.ANALYTICS_SHEETS_SHARED_SECRET = oldSecret
  })
  t.mock.method(globalThis, 'fetch', fetcher)
  const logs = []
  t.mock.method(console, 'error', (...args) => logs.push(args.join(' ')))
  return logs
}

test('analytics accepts only an explicit successful GAS write', async t => {
  const logs = configure(t, async (url, init) => {
    assert.equal(url, process.env.ANALYTICS_SHEETS_WEBHOOK_URL)
    const payload = JSON.parse(init.body)
    assert.equal(payload.secret, 'private-test-secret')
    assert.equal(payload.event.visitor_id, event.visitor_id)
    return Response.json({ ok: true })
  })
  const response = await POST(request(event))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { accepted: true })
  assert.equal(logs.length, 0)
})

test('GAS rejection reasons reach server logs without leaking payloads to clients or logs', async t => {
  for (const error of ['unauthorized', 'busy', 'invalid_request', 'private-test-secret']) {
    await t.test(error, async t => {
      let calls = 0
      const logs = configure(t, async () => {
        calls++
        return Response.json({ ok: false, error, detail: 'private-test-secret' })
      })
      const response = await POST(request(event))
      assert.equal(response.status, 502)
      assert.deepEqual(await response.json(), { accepted: false, reason: 'delivery_failed' })
      assert.equal(calls, 1, 'Ambiguous failures must not retry and duplicate writes')
      assert.equal(logs.length, 1)
      assert.ok(logs[0].includes(error === 'private-test-secret' ? 'invalid_response' : error))
      assert.ok(logs[0].includes('"upstreamStatus":200'))
      for (const privateValue of ['private-test-secret', event.visitor_id, event.visit_id, event.page_path]) {
        assert.ok(!logs[0].includes(privateValue))
      }
    })
  }
})

test('HTTP, malformed JSON, and network failures stay failures without exposing upstream content', async t => {
  for (const fetcher of [
    async () => new Response('private-test-secret', { status: 403 }),
    async () => new Response('private-test-secret'),
    async () => Response.json({ ok: 'true' }),
    async () => { throw new Error('private-test-secret') },
  ]) {
    await t.test('upstream failure', async t => {
      const logs = configure(t, fetcher)
      assert.equal((await POST(request(event))).status, 502)
      assert.equal(logs.length, 1)
      assert.ok(!logs[0].includes('private-test-secret'))
    })
  }
})

test('malformed analytics and missing consent are rejected before contacting GAS', async t => {
  configure(t, async () => assert.fail('Invalid event reached GAS'))
  for (const body of [null, [], true, 42, {}, { ...event, visitor_id: '' }, { ...event, consent_version: 'old' }]) {
    assert.equal((await POST(request(body))).status, 400)
  }
})

const batchOf = (...paths) => ({ events: paths.map(page_path => ({ ...event, page_path })) })

test('a page batch reaches GAS as one request with every event in order', async t => {
  const payloads = []
  const logs = configure(t, async (_url, init) => {
    payloads.push(JSON.parse(init.body))
    return Response.json({ ok: true })
  })
  const response = await POST(request(batchOf('/book', '/plans', '/faq')))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { accepted: true })
  assert.equal(payloads.length, 1)
  assert.equal(payloads[0].event, undefined)
  assert.deepEqual(payloads[0].events.map(e => e.page_path), ['/book', '/plans', '/faq'])
  assert.equal(logs.length, 0)
})

test('an older GAS that rejects batches gets the same events one at a time', async t => {
  const payloads = []
  configure(t, async (_url, init) => {
    const payload = JSON.parse(init.body)
    payloads.push(payload)
    return Response.json(payload.events ? { ok: false, error: 'invalid_request' } : { ok: true })
  })
  const response = await POST(request(batchOf('/book', '/plans')))
  assert.equal(response.status, 200)
  assert.equal(payloads.length, 3)
  assert.deepEqual(payloads.slice(1).map(p => p.event.page_path), ['/book', '/plans'])
})

test('a batch whose write result is unknown is never sent again', async t => {
  for (const fetcher of [
    async () => Response.json({ ok: false, error: 'write_failed' }),
    async () => new Response('Not Found', { status: 404 }),
    async () => { throw new Error('socket hang up') },
  ]) {
    await t.test('ambiguous failure', async t => {
      let calls = 0
      const logs = configure(t, async (...args) => { calls++; return fetcher(...args) })
      const response = await POST(request(batchOf('/book', '/plans')))
      assert.equal(response.status, 502)
      assert.equal(calls, 1, 'Ambiguous batch failures must not retry and duplicate rows')
      assert.equal(logs.length, 1)
      assert.ok(logs[0].includes('"events":2'))
    })
  }
})

test('occurred_at is moved back by the browser queue delay, within one minute', async t => {
  const payloads = []
  configure(t, async (_url, init) => { payloads.push(JSON.parse(init.body)); return Response.json({ ok: true }) })
  const before = Date.now()
  await POST(request({ events: [{ ...event, client_delay_ms: 1500 }, { ...event, client_delay_ms: 10 * 60_000 }] }))
  const after = Date.now()
  const [first, second] = payloads[0].events.map(e => Date.parse(e.occurred_at))
  assert.ok(first >= before - 1500 && first <= after - 1500)
  assert.ok(second >= before - 60_000 && second <= after - 60_000)
})

test('invalid events in a batch are dropped and the batch size is capped', async t => {
  const payloads = []
  configure(t, async (_url, init) => { payloads.push(JSON.parse(init.body)); return Response.json({ ok: true }) })
  const mixed = { events: [event, { ...event, event_name: 'unsupported' }, { ...event, consent_version: 'old' }, event] }
  assert.equal((await POST(request(mixed))).status, 200)
  assert.equal(payloads[0].events.length, 2)
  assert.equal((await POST(request({ events: Array.from({ length: 40 }, () => event) }))).status, 200)
  assert.equal(payloads[1].events.length, 25)
  assert.equal((await POST(request({ events: [{ ...event, consent_version: 'old' }] }))).status, 400)
})
