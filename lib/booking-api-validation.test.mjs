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

// Run the real API payload through the existing GAS mail/calendar formatters.
// All external services are captured locally; no production reservations or mail.
for (const [photoPublicationConsent, expected] of [
  [true, 'SNS掲載OK・素材利用OK（同意あり）'],
  [false, 'SNS掲載不可・素材利用不可（同意なし）'],
  [undefined, '未確認（同意記録なし・掲載／素材利用不可）'],
]) {
  test(`photo consent ${photoPublicationConsent} reaches every mail and calendar component`, async t => {
    const { createGas } = await import('./test-helpers/gas-runtime.mjs')
    const saved = mockServices(t)
    for (const planId of ['S1', 'S3', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6']) {
      const response = await book(request({
        ...base, selectedPlan: planId,
        selectedTime: planId === 'S3' ? '19:20' : '09:00', nightTime: '19:20',
        photoPublicationConsent, specialRequests: 'Local allergy note',
        attribution: { source: 'instagram' },
      }))
      assert.equal(response.status, 200, `${planId}: ${JSON.stringify(await response.json())}`)
      const payload = saved.at(-1)
      const { g } = createGas('umigame-reservation-admin')
      const mails = [], events = []
      g.GmailApp = { sendEmail: (...args) => mails.push(args) }
      const createEvent = (title, ...args) => {
        events.push({ title, description: args.at(-1).description })
        return { setColor() {} }
      }
      g.CalendarApp = { getCalendarById: () => ({ createEvent, createAllDayEvent: createEvent }) }
      g.sendBookingEmail(payload, '大人1名', 'Local Test')
      g.addToCalendar(payload, '大人1名')
      assert.equal(mails.length, 1, `${planId} mail`)
      assert.ok(mails[0][2].includes(expected), `${planId} consent in mail`)
      const count = ['C5', 'C6'].includes(planId) ? 3 : planId.startsWith('C') ? 2 : 1
      assert.equal(events.length, count, `${planId} calendar count`)
      for (const event of events) {
        assert.ok(event.description.includes(expected), `${planId} consent in calendar`)
        assert.ok(event.description.includes('Local allergy note'), 'customer notes preserved')
        assert.ok(event.description.includes('[流入元] instagram'), 'attribution preserved')
      }
      const row = g.buildBookingRow_(new Date(), payload, '大人1名', 'Local Test', {})
      assert.ok(row.some(value => String(value).includes(expected)), `${planId} consent persisted in sheet`)
    }
  })
}

test('non-boolean photo consent is rejected before external services', async t => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('Malformed consent reached an external service'))
  for (const photoPublicationConsent of ['true', 'false', 1, 0, null, [], {}]) {
    assert.equal((await book(request({ ...base, photoPublicationConsent }))).status, 400)
  }
})

test('all international locales accept both photo consent choices', async t => {
  const saved = mockServices(t)
  for (const locale of ['en', 'ko', 'zh-tw']) {
    for (const photoPublicationConsent of [true, false]) {
      const response = await book(request({ ...base, selectedPlan: 'S2', locale, photoPublicationConsent }))
      assert.equal(response.status, 200)
      assert.ok(saved.at(-1).specialRequests.includes(photoPublicationConsent ? 'SNS掲載OK' : 'SNS掲載不可'))
    }
  }
})

test('sunset SUP accepts staff requests and charges the same fee as the turtle tour', async t => {
  const saved = mockServices(t)
  const totalFor = async (selectedPlan, selectedStaff) => {
    const body = { ...base, selectedPlan, selectedTime: '', ...(selectedStaff ? { selectedStaff } : {}) }
    if (selectedPlan === 'S1' || selectedPlan === 'S2') body.selectedTime = '09:00'
    const response = await book(request(body))
    assert.equal(response.status, 200, `${selectedPlan} ${selectedStaff ?? 'no staff'}`)
    return (await response.json()).data.totalPrice
  }
  for (const [staff, staffName] of [['staff1', 'やまちゃん'], ['staff2', 'ひかる']]) {
    const turtleFee = (await totalFor('S1', staff)) - (await totalFor('S1'))
    assert.ok(turtleFee > 0)
    for (const plan of ['S8', 'S4']) {
      const withStaff = await totalFor(plan, staff)
      // 予約シートへ送る内容にも指名スタッフ名が入る
      assert.equal(saved.at(-1).staffName, staffName, `${plan} ${staff}`)
      assert.equal(withStaff - (await totalFor(plan)), turtleFee, `${plan} ${staff}`)
    }
  }
})

test('plans without staff requests still reject a requested staff member', async t => {
  t.mock.method(globalThis, 'fetch', async () => assert.fail('Rejected booking reached an external service'))
  for (const selectedPlan of ['S3', 'S6', 'C1']) {
    const response = await book(request({ ...base, selectedPlan, selectedStaff: 'staff2' }))
    assert.equal(response.status, 400, selectedPlan)
  }
})

test('Mana (staff6) can be requested on every plan that accepts staff requests, for the standard fee', async t => {
  const saved = mockServices(t)
  for (const [selectedPlan, selectedTime] of [['S1', '09:00'], ['S2', '09:00'], ['S8', ''], ['S4', '']]) {
    const withoutStaff = await book(request({ ...base, selectedPlan, selectedTime }))
    assert.equal(withoutStaff.status, 200, selectedPlan)
    const baseTotal = (await withoutStaff.json()).data.totalPrice
    const withMana = await book(request({ ...base, selectedPlan, selectedTime, selectedStaff: 'staff6' }))
    assert.equal(withMana.status, 200, selectedPlan)
    assert.equal((await withMana.json()).data.totalPrice - baseTotal, 1000, selectedPlan)
    assert.equal(saved.at(-1).staffName, 'まなちゃん', selectedPlan)
  }
})
