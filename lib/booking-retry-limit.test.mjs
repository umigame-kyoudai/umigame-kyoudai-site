import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { POST as book } from '../app/api/booking/route.ts'

test('Vercel fallback bounds repeated booking identifiers before contacting external services', async (t) => {
  const previous = process.env.CF_WORKER_DEPLOYMENT
  delete process.env.CF_WORKER_DEPLOYMENT
  t.after(() => previous === undefined ? delete process.env.CF_WORKER_DEPLOYMENT : process.env.CF_WORKER_DEPLOYMENT = previous)
  t.mock.method(globalThis, 'fetch', async () => assert.fail('Invalid booking reached an external service'))
  const ip = randomUUID()
  const key = randomUUID()
  const request = () => new Request('http://localhost/api/booking', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, 'idempotency-key': key },
    body: '{}',
  })
  const statuses = []
  for (let i = 0; i < 5; i++) statuses.push((await book(request())).status)
  assert.deepEqual(statuses, [400, 400, 400, 400, 429])
})
