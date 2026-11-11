import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { POST as book } from '../app/api/booking/route.ts'
import { GET as availability } from '../app/api/availability/route.ts'

// 管理システム docs/130：ホームページのリアルタイム受付（BOOKING_INVENTORY_MODE=live）。管理システム・LINE・旧GASは合成（外部へは送らない）。
const MANAGEMENT = 'https://management.example.test', SECRET = 's'.repeat(40)
const base = {
  selectedPlan: 'S1', selectedDate: '2099-12-10', selectedTime: '09:00',
  customerName: 'Local Test', customerEmail: 'local@example.test', customerPhone: '09000000000',
  participants: [{ category: 'adult', name: 'Local Test', age: 30, footSize: 25 }],
  agreedToTerms: true, lineIdToken: 'local-test-only',
}
const request = (body, key = randomUUID()) => new Request('http://localhost/api/booking', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': randomUUID(), ...(key ? { 'idempotency-key': key } : {}) },
  body: JSON.stringify(body),
})
function setup(t, { mode = 'live', create = () => Response.json({ state: 'CREATED', booking_number: 'x', booking_id: randomUUID(), remaining: null, replayed: false }), read = () => Response.json({ state: 'NONE' }), check } = {}) {
  const saved = { gas: [], create: [], read: 0, check: [] }
  Object.assign(process.env, { LINE_LOGIN_CHANNEL_ID: '1234567890', GAS_BOOKING_URL: 'https://gas.example.test/booking', BOOKING_INVENTORY_MODE: mode, MANAGEMENT_INVENTORY_URL: MANAGEMENT, MANAGEMENT_INVENTORY_SECRET: SECRET })
  t.after(() => { for (const k of ['BOOKING_INVENTORY_MODE', 'MANAGEMENT_INVENTORY_URL', 'MANAGEMENT_INVENTORY_SECRET']) delete process.env[k] })
  for (const m of ['info', 'warn', 'error']) t.mock.method(console, m, () => {})
  t.mock.method(globalThis, 'fetch', async (url, init = {}) => {
    const u = String(url)
    if (u === 'https://api.line.me/oauth2/v2.1/verify') return Response.json({ iss: 'https://access.line.me', aud: '1234567890', sub: 'U' + '0123456789abcdef'.repeat(2), name: 'LINE Test', exp: Math.floor(Date.now() / 1000) + 3600 })
    if (u === process.env.GAS_BOOKING_URL) { saved.gas.push(JSON.parse(init.body)); return Response.json({ success: true }) }
    if (u.startsWith(MANAGEMENT + '/web-inventory/v1/')) {
      assert.equal(init.headers.authorization, `Bearer ${SECRET}`)
      assert.equal(init.redirect, 'error')
      if (u.endsWith('/bookings') && init.method === 'POST') { const body = JSON.parse(init.body); saved.create.push(body); return create(body) }
      if (u.includes('/bookings/')) { saved.read++; return read() }
      if (u.endsWith('/availability')) { const body = JSON.parse(init.body); saved.check.push(body); return check(body) }
    }
    assert.fail('Unexpected external service call: ' + u)
  })
  return saved
}

test('live：空きがあれば管理システムで確定し、旧GASへは送らない。送る形は旧GASの行と同じ（人数・金額・LINEの宛先）', async t => {
  const saved = setup(t)
  const response = await book(request(base)), body = await response.json()
  assert.equal(response.status, 200, JSON.stringify(body))
  assert.equal(body.data.confirmed, true); assert.match(body.data.bookingNumber, /^W[0-9A-F]{16}$/)
  assert.equal(saved.gas.length, 0, '旧GASには送らない')
  const [sent] = saved.create
  assert.equal(sent.booking_number, body.data.bookingNumber)
  assert.deepEqual([sent.item.status, sent.item.amount, sent.item.tours.length, sent.item.tours[0].time, sent.item.tours[0].plan_code], ['CONFIRMED', body.data.totalPrice, 1, '09:00', 'S1'])
  assert.equal(sent.details.line_user_id, 'U' + '0123456789abcdef'.repeat(2))
  assert.equal(sent.details.sheet_rows[0]['人数内訳'], '大人1名 / 子供0名 / 3歳未満0名')
})

test('live：満席は409 SLOT_FULL（作らない・旧GASへも送らない）。在庫を管理していない・止めている時は今の仮予約で受ける', async t => {
  let reply = { state: 'FULL', remaining: 0 }
  const saved = setup(t, { create: () => Response.json({ booking_number: 'x', booking_id: null, replayed: false, ...reply }) })
  let response = await book(request(base)); let body = await response.json()
  assert.equal(response.status, 409); assert.equal(body.code, 'SLOT_FULL'); assert.match(body.error, /満席/); assert.equal(saved.gas.length, 0)
  for (const state of ['UNMANAGED', 'PAUSED', 'NOT_READY']) {
    reply = { state, remaining: null }
    response = await book(request(base)); body = await response.json()
    assert.equal(response.status, 200, state); assert.equal(body.data.confirmed, false, state)
  }
  assert.equal(saved.gas.length, 3)
})

test('live：結果が分からない時は同じ番号で確かめる（あれば確定・無ければ今の仮予約）。確かめられなければ503で送り直してもらう', async t => {
  let readReply = () => Response.json({ state: 'CREATED', booking_number: 'x', booking_id: randomUUID(), remaining: null, replayed: true })
  const saved = setup(t, { create: () => { throw new TypeError('network') }, read: () => readReply() })
  let body = await (await book(request(base))).json()
  assert.equal(body.data.confirmed, true); assert.equal(saved.read, 1); assert.equal(saved.gas.length, 0)
  readReply = () => Response.json({ state: 'NONE', booking_number: 'x', booking_id: null, remaining: null, replayed: false })
  body = await (await book(request(base))).json()
  assert.equal(body.data.confirmed, false); assert.equal(saved.gas.length, 1, '無いと分かってから旧GASへ')
  readReply = () => { throw new TypeError('network') }
  const response = await book(request(base)); body = await response.json()
  assert.equal(response.status, 503); assert.equal(body.code, 'BOOKING_RESULT_UNKNOWN'); assert.equal(saved.gas.length, 1)
})

test('off・display・送り直し用の番号が無い時は今まで通り（旧GASだけ）', async t => {
  const saved = setup(t, { mode: 'display' })
  assert.equal((await (await book(request(base))).json()).data.confirmed, false)
  process.env.BOOKING_INVENTORY_MODE = 'live'
  assert.equal((await (await book(request(base, null))).json()).data.confirmed, false)
  process.env.MANAGEMENT_INVENTORY_SECRET = 'short'
  assert.equal((await (await book(request(base))).json()).data.confirmed, false, '合言葉が無ければ off')
  assert.equal(saved.create.length, 0); assert.equal(saved.gas.length, 3)
})

test('空きの読み取り：プランと期間から問い合わせ、日付×時刻の表を返す。昼夜はナイトを別に。つながらない時は unavailable', async t => {
  const saved = setup(t, { check: body => Response.json({ today: '2099-12-01', paused: false, results: body.requests.map(r => ({ key: r.key, state: r.key.includes('09:00') ? 'FULL' : 'OPEN', remaining: r.key.includes('09:00') ? 0 : 5 })) }) })
  let response = await availability(new Request('http://localhost/api/availability?plan=C1&from=2099-12-10&to=2099-12-12'))
  let body = await response.json()
  assert.equal(body.mode, 'live'); assert.match(response.headers.get('cache-control'), /s-maxage=15/)
  assert.deepEqual(body.slots['2099-12-10'].main['09:00'], { state: 'FULL', remaining: 0 })
  assert.deepEqual(body.slots['2099-12-11'].night['19:20'], { state: 'OPEN', remaining: 5 })
  const first = saved.check[0].requests
  assert.equal(first.length, 2 * (5 + 3))
  assert.deepEqual(first.find(r => r.key === '2099-12-10|main|09:00').tours.map(t => [t.plan_text, t.time]), [['昼夜セット海亀', '09:00']])
  assert.deepEqual(first.find(r => r.key === '2099-12-10|night|21:10').tours.map(t => [t.plan_text, t.time]), [['昼夜セットヤシガニ', '21:10']])
  response = await availability(new Request('http://localhost/api/availability?plan=C5&from=2099-12-10&to=2099-12-11'))
  assert.deepEqual(saved.check[1].requests.find(r => r.key === '2099-12-10|main|16:00').tours.map(t => [t.plan_text, t.time]), [['まるごと1日セット海亀', '16:00'], ['まるごと1日セットドローンSUP', '17:30']])
  response = await availability(new Request('http://localhost/api/availability?plan=S8&from=2099-12-10&to=2099-12-11'))
  assert.deepEqual(saved.check[2].requests.map(r => [r.key, r.tours[0].time]), [['2099-12-10|main|-', null]])
  assert.equal((await availability(new Request('http://localhost/api/availability?plan=S1&from=2099-12-10&to=2100-02-10'))).status, 400)
  process.env.BOOKING_INVENTORY_MODE = 'off'
  assert.deepEqual(await (await availability(new Request('http://localhost/api/availability?plan=S1&from=2099-12-10&to=2099-12-11'))).json(), { mode: 'off' })
})
