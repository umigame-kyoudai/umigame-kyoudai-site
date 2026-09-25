import assert from 'node:assert/strict'
import test from 'node:test'
import { createHmac, randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { GET as entry } from '../app/from/[source]/route.ts'
import { POST as book } from '../app/api/booking/route.ts'
import { BOOKING_SOURCE_COOKIE, BOOKING_SOURCE_MAX_AGE, BOOKING_SOURCE_QUERY } from './booking-source.ts'
import { signBookingSource, verifyBookingSource, resolveBookingSource } from './booking-source-server.ts'
import { captureBookingSource, getBookingSourceToken, bookingSourceLoginReturnUrl } from './booking-source-client.ts'
import { createSignedReferralCookie, REFERRAL_COOKIE_NAME } from './referral.ts'
import { createGas, Sheet } from './test-helpers/gas-runtime.mjs'
import { attachSheetsApi } from './test-helpers/sheets-api.mjs'

const secret = 'local-acquisition-test-secret-at-least-32-characters'
const payload = (source = 'souichiro', offset = 0) => ({ source, entry: 'instagram', acquiredAt: new Date(Date.now() + offset).toISOString() })
const token = (source = 'souichiro', offset = 0) => signBookingSource(payload(source, offset), secret)
const tamper = value => `${value.slice(0, -1)}${value.endsWith('A') ? 'B' : 'A'}`
function env(t, values) {
  for (const [key, value] of Object.entries(values)) {
    const previous = process.env[key]
    if (value == null) delete process.env[key]; else process.env[key] = value
    t.after(() => { if (previous == null) delete process.env[key]; else process.env[key] = previous })
  }
}
function storage() {
  const map = new Map()
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) }
}
function browser(t, url, stores = {}) {
  const previous = globalThis.window
  const current = { location: new URL(url), localStorage: storage(), sessionStorage: storage(), ...stores }
  globalThis.window = current
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous })
  return current
}
function reception() {
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
  const events = []
  const calendar = { createEvent(title, start, end, options) {
    const event = { title, start, end, options, setColor() {}, deleteEvent() {} }
    events.push(event); return event
  } }
  g.CalendarApp = { getCalendarById: () => calendar }
  g.sendBookingEmail = () => {}
  g.referralProcessBookingSafely_ = () => ({ valid: false })
  return { g, props, sheet, events, calendar }
}
function submit(g, data) { return JSON.parse(g.doPost({ postData: { contents: JSON.stringify(data) } }).text) }
const rawBooking = {
  bookingNumber: 'LOCAL-ACQUISITION', planId: 'S3', planName: '本格ナイトツアー',
  customerName: 'Local Test', selectedDate: '2099-12-10', selectedTime: '19:20',
  adultCount: 2, childCount: 0, under3Count: 0, totalPrice: 8000, couponDiscount: 0,
  participants: [{ category: 'adult', name: 'Local Participant', age: 30 }, { category: 'adult', name: 'Local Participant', age: 30 }],
}

test('専用リンクは同一サイトのナイト詳細へ着地し、通常入口とは独立して記録する', t => {
  env(t, { BOOKING_SOURCE_SECRET: secret })
  for (const [source, path] of [['souichiro', '/plans/S3'], ['yamachan', '/'], ['umigame', '/']]) {
    const response = entry(new NextRequest(`https://booking.example.test/from/${source}?next=https://untrusted.test`), { params: { source } })
    assert.equal(response.status, 307)
    assert.ok(response.headers.get('location').startsWith('/'))
    const target = new URL(response.headers.get('location'), 'https://booking.example.test')
    assert.equal(target.origin, 'https://booking.example.test'); assert.equal(target.pathname, path)
    const value = target.searchParams.get(BOOKING_SOURCE_QUERY)
    assert.equal(verifyBookingSource(value, secret).source, source)
    assert.equal(response.cookies.get(BOOKING_SOURCE_COOKIE).value, value)
    assert.match(response.headers.get('set-cookie'), /HttpOnly/)
    assert.match(response.headers.get('set-cookie'), /Secure/)
    assert.match(response.headers.get('cache-control'), /no-store/)
  }
})

test('不明な入口は認定せず、鍵未設定は追跡できるように見せず503にする', t => {
  env(t, { BOOKING_SOURCE_SECRET: null, REFERRAL_COOKIE_SECRET: null })
  for (const source of ['constructor', '__proto__', 'unknown']) {
    const response = entry(new NextRequest('https://booking.example.test/from/unknown'), { params: { source } })
    assert.equal(response.status, 404); assert.equal(response.cookies.get(BOOKING_SOURCE_COOKIE), undefined)
  }
  assert.equal(entry(new NextRequest('https://booking.example.test/from/souichiro'), { params: { source: 'souichiro' } }).status, 503)
})

test('経由は署名と期限を検証し、報酬用紹介Cookieを転用できない', () => {
  const valid = token()
  assert.equal(verifyBookingSource(valid, secret).source, 'souichiro')
  assert.equal(verifyBookingSource(tamper(valid), secret), null)
  assert.equal(verifyBookingSource(valid, secret, Date.now() + BOOKING_SOURCE_MAX_AGE * 1000 + 1000), null)
  assert.equal(verifyBookingSource(valid, 'different-secret-at-least-32-characters'), null)
  assert.equal(verifyBookingSource(createSignedReferralCookie({ referralCode: 'souichiro', campaign: '', acquiredAt: new Date().toISOString() }, secret), secret), null)
  assert.equal(verifyBookingSource({ source: 'souichiro' }, secret), null)
})

test('最後に開いた専用入口が優先され、直接訪問やLINE復帰で上書きしない', () => {
  const old = token('souichiro', -10000), recent = token('yamachan', -1000)
  assert.equal(resolveBookingSource(`${BOOKING_SOURCE_COOKIE}=${old}`, recent, secret).source.source, 'yamachan')
  assert.equal(resolveBookingSource(`${BOOKING_SOURCE_COOKIE}=${recent}`, old, secret).source.source, 'yamachan')
  assert.equal(resolveBookingSource(`${BOOKING_SOURCE_COOKIE}=${old}`, null, secret).source.source, 'souichiro')
  assert.equal(resolveBookingSource(`${BOOKING_SOURCE_COOKIE}=${old}`, tamper(recent), secret).source.source, 'souichiro')
})

test('詳細→回遊→予約→別ブラウザのLINE復帰でも、署名済み経由が引き継がれる', t => {
  const sourceToken = token()
  const first = browser(t, `https://booking.example.test/plans/S3?booking_source=${sourceToken}`)
  captureBookingSource()
  first.location = new URL('https://booking.example.test/plans/S5')
  captureBookingSource()
  assert.equal(getBookingSourceToken(), sourceToken)
  first.location = new URL('https://booking.example.test/book?plan=S5&date=2099-12-10')
  const returnUrl = bookingSourceLoginReturnUrl(first.location.href)
  assert.equal(new URL(returnUrl).searchParams.get('plan'), 'S5')
  browser(t, returnUrl)
  captureBookingSource()
  assert.equal(verifyBookingSource(getBookingSourceToken(), secret).source, 'souichiro')
})

test('古い引継ぎ値を新しい入口で更新し、ストレージ拒否でも現在URLから送信できる', t => {
  const first = browser(t, `https://booking.example.test/plans/S3?booking_source=${token('souichiro', -10000)}`)
  captureBookingSource()
  first.location = new URL(`https://booking.example.test/?booking_source=${token('yamachan')}`)
  captureBookingSource()
  assert.equal(verifyBookingSource(getBookingSourceToken(), secret).source, 'yamachan')
  const blocked = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') } }
  browser(t, `https://booking.example.test/book?booking_source=${token()}`, { localStorage: blocked, sessionStorage: blocked })
  assert.doesNotThrow(captureBookingSource)
  assert.equal(verifyBookingSource(getBookingSourceToken(), secret).source, 'souichiro')
})

for (const source of ['souichiro', 'yamachan', 'umigame', null]) {
  test(`Web予約API→GAS保存→Calendar: ${source || '通常入口'}`, async t => {
    env(t, { BOOKING_SOURCE_SECRET: secret, REFERRAL_COOKIE_SECRET: secret, LINE_LOGIN_CHANNEL_ID: '1234567890', GAS_BOOKING_URL: 'https://gas.example.test/booking' })
    const r = reception(), sent = []
    t.mock.method(console, 'info', () => {})
    t.mock.method(globalThis, 'fetch', async (url, init) => {
      if (String(url) === 'https://api.line.me/oauth2/v2.1/verify') return Response.json({ iss: 'https://access.line.me', aud: '1234567890', sub: 'U-local-only', exp: Math.floor(Date.now() / 1000) + 3600 })
      assert.equal(String(url), process.env.GAS_BOOKING_URL)
      const data = JSON.parse(init.body); sent.push(data)
      return Response.json(submit(r.g, data))
    })
    const referral = createSignedReferralCookie({ referralCode: 'kaita', campaign: 'existing', acquiredAt: new Date().toISOString() }, secret)
    const booking = { selectedPlan: 'S3', selectedDate: '2099-12-10', selectedTime: '19:20', customerName: 'Local Test', customerEmail: 'local@example.test', customerPhone: '09000000000', participants: rawBooking.participants, agreedToTerms: true, lineIdToken: 'test-only', acquisitionToken: source ? token(source) : null }
    const response = await book(new Request('https://booking.example.test/api/booking', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': randomUUID(), 'idempotency-key': randomUUID(), cookie: `${REFERRAL_COOKIE_NAME}=${referral}` }, body: JSON.stringify(booking) }))
    assert.equal(response.status, 200, JSON.stringify(await response.clone().json()))
    assert.equal(sent[0].referral.referralCode, 'kaita', 'Existing referral is independent')
    assert.equal(r.sheet.cells[1][49], source || '')
    assert.equal(r.events.length, 1)
    assert.ok(r.events[0].title.includes(source === 'souichiro' ? '🥥' : '🦀'))
    if (source === 'souichiro') assert.match(r.events[0].options.description, /集客経由: そういちろうさん/)
  })
}

test('GAS直呼び出しでも改変・期限切れ・鍵未設定は保存と通知前に拒否する', () => {
  const r = reception()
  for (const bad of [tamper(token()), 'souichiro', { source: 'souichiro' }]) {
    assert.equal(submit(r.g, { ...rawBooking, acquisitionToken: bad }).code, 'acquisition_verification_failed')
    assert.equal(r.sheet.getLastRow(), 1); assert.equal(r.events.length, 0)
  }
  r.props.delete('BOOKING_SOURCE_SECRET')
  assert.equal(submit(r.g, { ...rawBooking, acquisitionToken: token() }).code, 'acquisition_verification_failed')
  assert.equal(submit(r.g, { ...rawBooking, acquisition: { source: 'souichiro' } }).success, true)
  assert.equal(r.sheet.cells[1][49], ''); assert.match(r.events[0].title, /🦀/)
})

test('再送は元の経由と予定を維持し、変更した入口で上書きしない', () => {
  const r = reception()
  assert.equal(submit(r.g, { ...rawBooking, acquisitionToken: token() }).success, true)
  assert.equal(submit(r.g, { ...rawBooking, acquisitionToken: token('yamachan') }).duplicate, true)
  assert.equal(r.sheet.cells[1][49], 'souichiro'); assert.equal(r.events.length, 1)
})

for (const [planId, count] of [['S5', 1], ['C1', 2], ['C2', 2], ['C5', 3], ['C6', 3]]) {
  test(`${planId}: 保存した全構成に経由が残り、ナイト予定だけ🥥になる`, () => {
    const r = reception(), admin = createGas('umigame-reservation-webapp').g
    const plan = admin.ADMIN_PLAN_CATALOG.find(p => p.id === planId)
    const data = { ...rawBooking, planId, planName: plan.name, selectedTime: planId === 'S5' ? '19:20' : '09:00', totalPrice: plan.adultPrice * 2, specialRequests: '[COMBO booking]\nヤシガニ探検希望時間：19:20', acquisitionToken: token() }
    assert.equal(submit(r.g, data).success, true)
    assert.equal(r.events.length, count)
    assert.equal(r.events.filter(e => e.title.includes('🥥')).length, 1)
    for (const row of r.sheet.cells.slice(1, count + 1)) assert.equal(row[49], 'souichiro')
  })
}

test('管理画面の読取・プラン変更・Calendar再作成・削除退避で経由を保持する', () => {
  const r = reception(); submit(r.g, { ...rawBooking, acquisitionToken: token() })
  const { g: admin } = createGas('umigame-reservation-webapp')
  const before = admin.adminReadBookings_(r.sheet)[0]
  const publicBooking = admin.adminToPublicBooking_(before)
  assert.equal(publicBooking.acquisitionSource, 'souichiro'); assert.match(publicBooking.acquisitionLabel, /🥥/)
  const plan = admin.ADMIN_PLAN_CATALOG.find(p => p.id === 'C1')
  const normalized = { totalPrice: 19000, couponDiscount: 0, components: [{ date: '2099-12-11', time: '09:00' }, { date: '2099-12-11', time: '21:10' }], customerName: 'Changed', phone: '', headcount: '大人2名', participants: '', status: '未対応', couponCode: '', email: '', participantAges: '30 / 30', participantHeights: '', participantWeights: '', participantFootSizes: '', specialRequests: '' }
  const rows = admin.adminBuildChangedRows_(r.sheet, before, plan, normalized, [2, 3])
  rows.forEach(row => assert.equal(row[49], 'souichiro'))
  const events = []
  const calendar = { createEvent(title, start, end, options) { const e = { title, start, end, options, setColor() {} }; events.push(e); return e } }
  plan.components.forEach((component, i) => admin.adminCreateChangedCalendarEvent_(calendar, before, plan, { ...component, ...normalized.components[i] }, normalized, rows[i]))
  assert.ok(!events[0].title.includes('🥥')); assert.match(events[1].title, /🥥/)
  assert.match(events[1].options.description, /そういちろうさん/)
  const archive = new Sheet('削除済み予約', 2, 55); archive.cells[0][0] = '削除日時'
  admin.adminGetSpreadsheet_ = () => ({ getSheetByName: () => archive })
  admin.adminArchiveDeletedBooking_(r.sheet, before, [{ rowNumber: 2, values: r.sheet.cells[1] }], 'owner@example.test')
  assert.equal(archive.cells[1][55], 'souichiro')
})

test('旧49列の予約は読取可能で、追加先に別データがあれば上書きせず停止する', () => {
  const { g } = createGas('umigame-reservation-webapp')
  const sheet = new Sheet('予約一覧', 4, 49)
  sheet.cells[0] = [...g.ADMIN_CANONICAL_HEADERS].slice(0, 49)
  sheet.cells[1][1] = 'LEGACY'; sheet.cells[1][5] = '本格ナイトツアー'; sheet.cells[1][44] = 'S3'
  assert.equal(g.adminReadBookings_(sheet)[0].acquisitionSource, '')
  sheet.insertColumnsAfter(49, 3)
  sheet.cells[1][49] = 'Existing data'
  assert.throws(() => g.adminCheckAcquisitionColumns_(sheet), /既存データ/)
  assert.equal(sheet.cells[1][49], 'Existing data')
})

test('GASは正しく署名されていても期限切れ・未来日・不明な経由を受付前に拒否する', () => {
  const r = reception()
  const rawToken = data => {
    const encoded = Buffer.from(JSON.stringify(data)).toString('base64url')
    return encoded + '.' + createHmac('sha256', secret).update('uk-booking-source:v1:' + encoded).digest('base64url')
  }
  for (const data of [payload('souichiro', -31 * 86400000), payload('souichiro', 10 * 60000), payload('constructor')]) {
    assert.equal(submit(r.g, { ...rawBooking, acquisitionToken: rawToken(data) }).code, 'acquisition_verification_failed')
    assert.equal(r.sheet.getLastRow(), 1); assert.equal(r.events.length, 0)
  }
})

test('予約追記後に経由の保存が欠けていれば成功・Calendar登録に進まない', () => {
  const r = reception()
  attachSheetsApi(r.g, r.sheet, { afterAppend() { r.sheet.cells[1][49] = '' } })
  const response = submit(r.g, { ...rawBooking, acquisitionToken: token() })
  assert.equal(response.success, false)
  assert.match(response.error, /保存後検証/)
  assert.equal(r.events.length, 0)
})
