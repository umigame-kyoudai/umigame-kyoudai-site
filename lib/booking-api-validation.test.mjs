import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { POST as book } from '../app/api/booking/route.ts'
import { POST as coupon } from '../app/api/coupon/route.ts'
import { PLANS } from './data.ts'
import { PRIVATE_COUNTERPART, SENIOR_RESTRICTED_PLAN_IDS, planHasNight } from './plan-flags.ts'
import { todayStr } from './date-utils.ts'

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

const planRequest = (id, participants = base.participants) => ({
  ...base, selectedPlan: id, participants,
  selectedTime: PLANS.find(plan => plan.id === id).timeTags.find(time => /^\d{2}:\d{2}$/.test(time)) ?? '',
  ...(planHasNight(id) ? { nightTime: '19:20' } : {}),
})

test('60歳境界: 通常版は59歳まで、60歳のグループは対応する貸切版へ案内する', async t => {
  const saved = mockServices(t)
  for (const id of SENIOR_RESTRICTED_PLAN_IDS) {
    const participant = age => [{ ...base.participants[0], age }]
    assert.equal((await book(request(planRequest(id, participant(59))))).status, 200, `${id}: 59歳`)
    const writesBefore = saved.length
    const denied = await book(request(planRequest(id, participant(60))))
    assert.equal(denied.status, 400, `${id}: 60歳`)
    assert.match(JSON.stringify(await denied.json()), /60歳以上/)
    assert.equal(saved.length, writesBefore, `${id}: 制限対象をGASへ送らない`)
    assert.equal((await book(request(planRequest(PRIVATE_COUNTERPART[id].id, participant(60))))).status, 200, `${id}: 貸切版`)
  }
})

test('3歳以下区分は3歳を含み4歳を含まない。C1参加者は全員5歳以上', async t => {
  mockServices(t)
  const child = (age, category = 'under3') => [...base.participants, { ...base.participants[0], category, age }]
  for (const id of ['S3', 'S5']) {
    for (const age of [0, 3]) assert.equal((await book(request(planRequest(id, child(age))))).status, 200)
    assert.equal((await book(request(planRequest(id, child(4))))).status, 400)
    assert.equal((await book(request(planRequest(id, child(4, 'child'))))).status, 200)
  }
  assert.equal((await book(request(planRequest('C1', child(3))))).status, 400)
  assert.equal((await book(request(planRequest('C1', child(4, 'child'))))).status, 400)
  assert.equal((await book(request(planRequest('C1', child(5, 'child'))))).status, 200)
})

test('外国語の当日Web予約は受付可能、貸切レンタルに追加請求しない', async t => {
  const saved = mockServices(t)
  for (const locale of ['en', 'ko', 'zh-tw']) {
    const data = { ...planRequest('S2'), locale, selectedDate: todayStr() }
    const withoutRental = await (await book(request(data))).json()
    const withRental = await book(request({
      ...data, participants: [{ ...base.participants[0], wetsuitRental: true, prescriptionMaskRental: true }],
    }))
    assert.equal(withRental.status, 200, locale)
    const result = await withRental.json()
    assert.equal(result.data.totalPrice, withoutRental.data.totalPrice, locale)
    assert.equal(saved.at(-1).totalPrice, result.data.totalPrice, locale)
    assert.equal(saved.at(-1).selectedDate, todayStr())
  }
})
