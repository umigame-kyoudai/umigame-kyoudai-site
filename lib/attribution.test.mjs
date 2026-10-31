import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID, createHmac } from 'node:crypto'
import { captureAttribution, getAttribution } from './attribution.ts'
import { setTrackingConsent } from './customer-tracking.ts'
import { bookingSourceLoginReturnUrl } from './booking-source-client.ts'
import { signBookingSource } from './booking-source-server.ts'
import { POST as book } from '../app/api/booking/route.ts'
import { createGas, Sheet } from './test-helpers/gas-runtime.mjs'
import { attachSheetsApi } from './test-helpers/sheets-api.mjs'

function storage() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) }
}

function browser(t, url, referrer = '') {
  const previous = { window: globalThis.window, document: globalThis.document }
  globalThis.window = { location: new URL(url), localStorage: storage(), sessionStorage: storage(), dispatchEvent() {} }
  globalThis.document = { referrer }
  t.after(() => {
    for (const key of ['window', 'document']) {
      if (previous[key] === undefined) delete globalThis[key]
      else globalThis[key] = previous[key]
    }
  })
  return globalThis.window
}

test('UTM attribution requires consent and survives direct visits, internal CTA tags and LINE authentication in the same browser', t => {
  const w = browser(t, 'https://booking.example.test/?utm_source=instagram&utm_medium=profile&utm_campaign=yamachan')
  captureAttribution()
  assert.equal(getAttribution(), null)
  setTrackingConsent('accepted')
  captureAttribution()
  const original = getAttribution()
  assert.equal(original.source, 'instagram')
  assert.equal(original.medium, 'profile')
  assert.equal(original.campaign, 'yamachan')
  for (const [url, referrer] of [
    ['https://booking.example.test/book', ''],
    ['https://booking.example.test/book?utm_source=blog&utm_medium=article_cta', 'https://booking.example.test/blog/example'],
    ['https://booking.example.test/book', 'https://access.line.me/'],
    ['https://booking.example.test/book', 'https://line.me/'],
  ]) {
    w.location = new URL(url)
    document.referrer = referrer
    captureAttribution()
    assert.deepEqual(getAttribution(), original)
  }
})

test('a new external source replaces the previous attribution and expired records are not used', t => {
  const w = browser(t, 'https://booking.example.test/', 'https://www.google.com/search?q=tour')
  setTrackingConsent('accepted')
  captureAttribution()
  assert.equal(getAttribution().referrer, 'www.google.com')
  assert.equal(getAttribution().source, '')
  w.location = new URL('https://booking.example.test/?utm_source=line&utm_medium=richmenu')
  document.referrer = ''
  captureAttribution()
  assert.equal(getAttribution().source, 'line')
  w.localStorage.setItem('booking_attribution_v1', JSON.stringify({ ...getAttribution(), ts: Date.now() - 91 * 86400000 }))
  assert.equal(getAttribution(), null)
})

test('audit: ordinary UTM attribution is not transported to a fresh browser by the LINE return URL', t => {
  const w = browser(t, 'https://booking.example.test/?utm_source=instagram&utm_medium=story')
  setTrackingConsent('accepted')
  captureAttribution()
  w.location = new URL('https://booking.example.test/book')
  const returnUrl = bookingSourceLoginReturnUrl(w.location.href)
  assert.equal(returnUrl, 'https://booking.example.test/book')
  w.localStorage = storage()
  w.sessionStorage = storage()
  w.location = new URL(returnUrl)
  document.referrer = 'https://access.line.me/'
  setTrackingConsent('accepted')
  captureAttribution()
  assert.equal(getAttribution(), null, 'A new browser cannot recover an ordinary source from this return URL')
})

test('audit: granting consent after leaving the tagged landing page cannot recover its UTM', t => {
  const w = browser(t, 'https://booking.example.test/?utm_source=instagram&utm_medium=story')
  captureAttribution()
  w.location = new URL('https://booking.example.test/book')
  document.referrer = ''
  setTrackingConsent('accepted')
  captureAttribution()
  assert.equal(getAttribution(), null)
})

const secret = 'local-attribution-audit-secret-at-least-32-characters'
test('email labels distinguish measured source from a signed introducer and ignore authentication referrers', () => {
  const { g } = createGas('umigame-reservation-admin')
  const tagged = g.buildBookingTrafficEmailBlock_({ attribution: { source: 'instagram', medium: 'story', campaign: 'souichiro' } })
  assert.match(tagged, /媒体：Instagram\n掲載場所：ストーリー/)
  assert.match(tagged, /紹介者の専用リンク：記録なし/, 'An unsigned campaign must not identify a trusted introducer')
  for (const referrer of ['access.line.me', 'auth.line.me', 'liff.line.me', 'www.umigamekyoudaimiyakojima.com']) {
    const body = g.buildBookingTrafficEmailBlock_({ attribution: { referrer, medium: 'profile' } })
    assert.match(body, /媒体：不明/)
    assert.match(body, /掲載場所：判別できません/)
  }
  const unknown = g.buildBookingTrafficEmailBlock_({ attribution: { source: '__proto__', medium: 'constructor' } })
  assert.ok(!unknown.includes('[object Object]'))
  assert.ok(!unknown.includes('function'))
  const map = g.buildBookingTrafficEmailBlock_({ attribution: { source: 'gbp', medium: 'profile' } })
  assert.match(map, /媒体：Googleマップ/)
  assert.match(map, /判定根拠：リンクの計測タグ/)
})

const cases = [
  { name: 'Instagram with a signed entry', attribution: { source: 'instagram', medium: 'profile', campaign: 'souichiro', referrer: '', landingPage: '/plans/S3' }, acquisition: true, expected: '[流入元] instagram / profile / souichiro' },
  { name: 'Google referrer without UTM', attribution: { source: '', medium: '', campaign: '', referrer: 'www.google.com', landingPage: '/' }, expected: '[流入元] 参照元: www.google.com' },
  { name: 'LINE greeting link', attribution: { source: 'line', medium: 'greeting', campaign: '', referrer: '', landingPage: '/' }, expected: '[流入元] line / greeting' },
  { name: 'No source', attribution: null, expected: '[流入元] 不明（直接アクセス・ブックマーク等）' },
]

for (const selectedPlan of ['S1', 'C1', 'C3', 'C5']) {
  for (const scenario of cases) {
    test(`attribution reaches the actual email builder, sheet and calendar: ${selectedPlan}, ${scenario.name}`, async t => {
      const config = { BOOKING_SOURCE_SECRET: secret, LINE_LOGIN_CHANNEL_ID: '1234567890', GAS_BOOKING_URL: 'https://gas.example.test/booking' }
      for (const [key, value] of Object.entries(config)) {
        const previous = process.env[key]
        process.env[key] = value
        t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous })
      }
      const { g, props } = createGas('umigame-reservation-admin')
      props.set('BOOKING_SOURCE_SECRET', secret)
      Object.assign(g.Utilities, {
        computeHmacSha256Signature: (message, key) => [...createHmac('sha256', key).update(message).digest()],
        base64DecodeWebSafe: value => [...Buffer.from(value, 'base64url')],
        newBlob: bytes => ({ getDataAsString: () => Buffer.from(bytes).toString('utf8') }),
      })
      const sheet = new Sheet('予約一覧', 10, g.HEADERS.length)
      sheet.cells[0] = [...g.HEADERS]
      g.getOrCreateSheet = () => sheet
      attachSheetsApi(g, sheet)
      const emails = [], events = []
      g.GmailApp = { sendEmail: (to, subject, body) => emails.push({ to, subject, body }) }
      g.CalendarApp = { getCalendarById: () => ({ createEvent: (title, start, end, options) => {
        const event = { title, start, end, options, setColor() {}, deleteEvent() {} }
        events.push(event)
        return event
      } }) }
      g.referralProcessBookingSafely_ = () => ({ valid: false })
      t.mock.method(console, 'info', () => {})
      t.mock.method(globalThis, 'fetch', async (url, init) => {
        if (String(url) === 'https://api.line.me/oauth2/v2.1/verify') {
          return Response.json({ iss: 'https://access.line.me', aud: '1234567890', sub: 'U-local-only', exp: Math.floor(Date.now() / 1000) + 3600 })
        }
        assert.equal(String(url), config.GAS_BOOKING_URL, 'Unexpected network request')
        return Response.json(JSON.parse(g.doPost({ postData: { contents: init.body } }).text))
      })
      const body = {
        selectedPlan, selectedDate: '2099-12-10', selectedTime: '09:00', nightTime: '19:20',
        customerName: 'Local Test', customerEmail: 'local@example.test', customerPhone: '09000000000',
        participants: [{ category: 'adult', name: 'Local Test', age: 30, footSize: 25 }],
        agreedToTerms: true, lineIdToken: 'local-test-only', attribution: scenario.attribution,
        acquisitionToken: scenario.acquisition ? signBookingSource({ source: 'souichiro', entry: 'instagram', acquiredAt: new Date().toISOString() }, secret) : null,
      }
      const response = await book(new Request('https://booking.example.test/api/booking', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': randomUUID(), 'idempotency-key': randomUUID() }, body: JSON.stringify(body),
      }))
      assert.equal(response.status, 200, JSON.stringify(await response.clone().json()))
      assert.equal(emails.length, 1, 'Capture the actual Gmail body, not a stub of the email builder')
      assert.ok(emails[0].body.includes(scenario.expected))
      assert.ok(emails[0].body.includes(`紹介者の専用リンク：${scenario.acquisition ? 'そういちろうさん' : '記録なし'}`))
      assert.ok(emails[0].body.indexOf('【流入経路】') < emails[0].body.indexOf('【お客様情報】'))
      assert.ok(!emails[0].body.includes('集客経由：不明・通常入口'))
      const expectedMedia = scenario.acquisition ? 'Instagram' : scenario.attribution?.referrer ? 'Google（検索・マップ等）' : scenario.attribution?.source === 'line' ? 'LINE' : '不明'
      assert.ok(emails[0].body.includes(`媒体：${expectedMedia}\n`))
      const expectedRows = selectedPlan === 'C5' ? 3 : selectedPlan.startsWith('C') ? 2 : 1
      assert.equal(sheet.getLastRow() - 1, expectedRows)
      assert.equal(events.length, expectedRows)
      for (let index = 1; index <= expectedRows; index++) {
        assert.equal(sheet.cells[index][31], scenario.attribution?.referrer || '')
        assert.equal(sheet.cells[index][32], scenario.attribution?.source || '')
        assert.equal(sheet.cells[index][33], scenario.attribution?.medium || '')
        assert.equal(sheet.cells[index][34], scenario.attribution?.campaign || '')
        assert.equal(sheet.cells[index][49], scenario.acquisition ? 'souichiro' : '')
        assert.ok(sheet.cells[index][43].includes(scenario.expected))
        assert.ok(events[index - 1].options.description.includes(scenario.expected))
      }
    })
  }
}
