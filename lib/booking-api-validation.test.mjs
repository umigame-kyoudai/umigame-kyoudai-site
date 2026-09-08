import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { POST as book } from '../app/api/booking/route.ts'
import { POST as coupon } from '../app/api/coupon/route.ts'

const base = {
  selectedPlan: 'S1', selectedDate: '2099-12-10', selectedTime: '09:00',
  customerName: 'Local Test', customerEmail: 'local@example.test', customerPhone: '09000000000',
  participants: [{ category: 'adult', name: 'Local Test', age: 30, footSize: 25 }],
  agreedToTerms: true, lineIdToken: 'local-test-only',
}
const request = body => new Request('http://localhost/api/booking', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': randomUUID(), 'idempotency-key': randomUUID() },
  body: JSON.stringify(body),
})

function mockServices(t) {
  process.env.LINE_LOGIN_CHANNEL_ID = '1234567890'
  process.env.GAS_BOOKING_URL = 'https://gas.example.test/booking'
  const saved = []
  t.mock.method(console, 'info', () => {})
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (String(url) === 'https://api.line.me/oauth2/v2.1/verify') {
      return Response.json({ iss: 'https://access.line.me', aud: '1234567890', sub: 'U-local-only', exp: Math.floor(Date.now() / 1000) + 3600 })
    }
    assert.equal(String(url), process.env.GAS_BOOKING_URL, 'Unexpected external service call')
    saved.push(JSON.parse(init.body))
    return Response.json({ success: true })
  })
  return saved
}

test('coupon preview, accepted price and GAS payload agree for whitespace and inherited keys', async t => {
  const saved = mockServices(t)
  for (const [code, discount] of [[' UMIGAME500 ', 500], ['カメハメハ\n', 1000], ['toString', 0], ['constructor', 0], ['__proto__', 0]]) {
    const preview = await (await coupon(request({ couponCode: code, adultCount: 1, childCount: 0, planId: 'S1' }))).json()
    const response = await book(request({ ...base, couponCode: code }))
    assert.equal(response.status, 200)
    const result = await response.json()
    assert.equal(preview.discount, discount)
    assert.equal(preview.valid, discount > 0)
    assert.equal(result.data.totalPrice, 6500 - discount)
    assert.equal(saved.at(-1).totalPrice, result.data.totalPrice)
    assert.equal(saved.at(-1).couponDiscount, discount)
    assert.equal(saved.at(-1).couponCode, discount ? code.trim() : '')
  }
})

test('impossible calendar dates are rejected before LINE verification or GAS writes', async t => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('Invalid date reached an external service'))
  for (const selectedDate of ['2099-12-32', '2099-13-01', '2099-00-01', '2099-04-31', '2099-02-29', '2100-02-29', '2099-02-30', 20991210, null]) {
    const response = await book(request({ ...base, selectedDate }))
    assert.equal(response.status, 400, String(selectedDate))
  }
})

test('valid leap days and month-end dates remain bookable', async t => {
  const saved = mockServices(t)
  for (const selectedDate of ['2096-02-29', '2400-02-29', '2099-02-28', '2099-04-30', '2099-12-31']) {
    assert.equal((await book(request({ ...base, selectedDate }))).status, 200)
    assert.equal(saved.at(-1).selectedDate, selectedDate)
  }
})

test('malformed booking objects return validation errors without side effects', async t => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('Malformed booking reached an external service'))
  for (const body of [null, [], { ...base, customerName: 123 }, { ...base, participants: [null] }, { ...base, participants: [{ ...base.participants[0], name: {} }] }]) {
    assert.equal((await book(request(body))).status, 400)
  }
})
