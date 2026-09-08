import assert from 'node:assert/strict'
import test from 'node:test'
import { createGas, Sheet } from './test-helpers/gas-runtime.mjs'
import { attachSheetsApi } from './test-helpers/sheets-api.mjs'

const newBooking = {
  bookingNumber: 'CONCURRENT-NEW', planId: 'S1', planName: 'ウミガメと泳ぐシュノーケルツアー',
  customerName: 'Local Test', customerEmail: 'local@example.test', customerPhone: '09000000000',
  selectedDate: '2099-08-20', selectedTime: '09:00', adultCount: 1, childCount: 0, under3Count: 0,
  totalPrice: 6500, couponDiscount: 0, couponCode: '', participants: [{ category: 'adult', name: 'Local Test', age: 30 }],
}

function setup(rowCount = 10) {
  const runtime = createGas('umigame-reservation-webapp')
  const admin = runtime.g
  const reception = createGas('umigame-reservation-admin').g
  const sheet = new Sheet('予約一覧', rowCount)
  sheet.cells[0] = Array.from(admin.ADMIN_CANONICAL_HEADERS)
  const columns = admin.ADMIN_COLUMNS
  for (const [key, value] of Object.entries({
    BOOKING_NUM: 'EXISTING', DATE: '2099-08-20', TIME: '19:20', NAME: 'Local Test',
    PLAN: '本格ナイトツアー', PLAN_ID: 'S3', TOTAL_PRICE: 8000, PHONE: '09000000000',
    HEADCOUNT: '大人2名 / 子供0名 / 3歳未満0名', LINE_USER_ID: 'LOCAL-LINE-ID',
    LOCATION: 'ナイトツアー（遺跡）', STAFF: 'ナイト担当',
  })) sheet.cells[1][columns[key] - 1] = value
  const calendar = { createEvent: () => ({ setColor() {}, deleteEvent() {} }) }
  admin.adminGetBookingSheet_ = () => sheet
  admin.adminGetCalendar_ = () => calendar
  admin.adminFindCalendarEventsForDeletion_ = () => ({ events: [], warning: '' })
  admin.adminAppendAudit_ = () => {}
  admin.adminGetSpreadsheet_ = () => ({ getSheetByName: () => null })
  admin.adminAppendReservationChangeHistory_ = () => {}
  reception.getOrCreateSheet = () => sheet
  reception.CalendarApp = { getCalendarById: () => calendar }
  reception.GmailApp = { sendEmail() {} }
  attachSheetsApi(admin, sheet)
  attachSheetsApi(reception, sheet)
  const current = () => admin.adminFindBooking_(sheet, 'BOOKING:EXISTING')
  const change = () => admin.adminChangeReservation({
    bookingKey: current().key, expectedVersion: current().version, reason: 'Requested plan change',
    planId: 'C1', customerName: 'Local Test', phone: '09000000000', counts: { adult: 2 }, totalPrice: 19000,
    components: [
      { role: 'turtle', date: '2099-08-20', time: '09:00' },
      { role: 'night', date: '2099-08-20', time: '19:20' },
    ],
  })
  const receive = (payload = newBooking) => JSON.parse(reception.doPost({ postData: { contents: JSON.stringify(payload) } }).text)
  return { ...runtime, admin, reception, sheet, columns, calendar, current, change, receive }
}

for (const interleave of ['calendar', 'before-admin-append', 'after-admin-append', 'before-reception-append']) {
  test(`both bookings survive separate-script interleaving at ${interleave}`, () => {
    const fixture = setup(2) // Also exercise automatic grid expansion.
    const { admin, reception, sheet, current, change, receive, calendar } = fixture
    let received
    let changed
    if (interleave === 'calendar') {
      admin.adminGetCalendar_ = () => { received = receive(); return calendar }
      changed = change()
    } else if (interleave === 'before-reception-append') {
      attachSheetsApi(reception, sheet, { beforeAppend: () => { changed = change() } })
      received = receive()
    } else {
      attachSheetsApi(admin, sheet, {
        [interleave === 'before-admin-append' ? 'beforeAppend' : 'afterAppend']: () => { received = receive() },
      })
      changed = change()
    }
    assert.equal(received.success, true)
    assert.equal(changed.success, true)
    assert.equal(current().componentCount, 2)
    assert.equal(current().totalPrice, 19000)
    assert.equal(sheet.cells.filter(row => row[1] === newBooking.bookingNumber).length, 1)
    const retry = receive()
    assert.equal(retry.success, true)
    assert.equal(retry.duplicate, true)
  })
}

for (const failure of ['calendar', 'append-response']) {
  test(`rollback after ${failure} failure preserves a concurrently accepted booking`, () => {
    const { admin, sheet, current, change, receive } = setup(2)
    let received
    attachSheetsApi(admin, sheet, { afterAppend: () => {
      received = receive()
      if (failure === 'append-response') throw new Error('Lost API response after commit')
    } })
    if (failure === 'calendar') admin.adminCreateChangedCalendarEvent_ = () => { throw new Error('Calendar unavailable') }
    assert.throws(change, /元の状態へ戻しました/)
    assert.equal(received.success, true)
    assert.equal(current().componentCount, 1)
    assert.equal(current().planId, 'S3')
    assert.equal(current().totalPrice, 8000)
    assert.equal(sheet.cells.filter(row => row[1] === newBooking.bookingNumber).length, 1)
  })
}

test('rollback restores to a new row when the old row belongs to another booking', () => {
  const { admin, sheet, current } = setup()
  const original = sheet.cells[1].slice()
  sheet.cells[1][1] = 'OTHER-BOOKING'
  const errors = admin.adminRestoreFullBookingRows_(sheet, [{ rowNumber: 2, values: original }])
  assert.equal(errors.length, 0)
  assert.equal(sheet.cells[1][1], 'OTHER-BOOKING')
  assert.equal(current().componentCount, 1)
  assert.equal(current().totalPrice, 8000)
})

test('shrinking a plan can roll back after reception reuses its cleared trailing row', () => {
  const { admin, sheet, change, receive, current } = setup(2)
  change()
  const before = current()
  let received
  admin.adminCreateChangedCalendarEvent_ = () => {
    received = receive()
    throw new Error('Calendar failed after the smaller plan was saved')
  }
  assert.throws(() => admin.adminChangeReservation({
    bookingKey: before.key, expectedVersion: before.version, reason: 'Requested smaller plan',
    planId: 'S3', customerName: 'Local Test', phone: '09000000000', counts: { adult: 2 }, totalPrice: 8000,
    components: [{ role: 'night', date: '2099-08-20', time: '19:20' }],
  }), /元の状態へ戻しました/)
  assert.equal(received.success, true)
  assert.equal(sheet.cells.filter(row => row[1] === newBooking.bookingNumber).length, 1)
  assert.equal(current().componentCount, 2)
  assert.equal(current().planId, 'C1')
  assert.equal(current().totalPrice, 19000)
})

test('new tour roles do not inherit another tour venue or staff', () => {
  const { current, change } = setup()
  change()
  const components = current().components
  const turtle = components.find(row => row.plan.includes('海亀'))
  const night = components.find(row => row.plan.includes('ヤシガニ'))
  assert.equal(turtle.location, '')
  assert.equal(turtle.staff, '')
  assert.equal(night.location, 'ナイトツアー（遺跡）')
  assert.equal(night.staff, 'ナイト担当')
})

test('GAS rejects invalid money before opening sheets or sending notifications for every routing branch', () => {
  const { reception, receive } = setup()
  reception.getOrCreateSheet = () => assert.fail('Invalid price reached sheet access')
  for (const planId of ['S1', 'C1', 'C3', 'C5']) {
    for (const totalPrice of [null, 0, -1, Infinity, NaN, '6500', 6500.5]) {
      assert.equal(receive({ ...newBooking, planId, totalPrice }).success, false)
    }
    for (const couponDiscount of [null, -1, Infinity, '500']) {
      assert.equal(receive({ ...newBooking, planId, couponDiscount }).success, false)
    }
  }
})

test('LINE preview, cancellation and send return the current version for the next edit', () => {
  const { admin, current } = setup()
  const edit = (booking, updates) => admin.adminUpdateBooking({ bookingKey: booking.key, expectedVersion: booking.version, updates })
  const preview = edit(current(), { status: '確定' })
  assert.equal(preview.booking.version, current().version)
  edit(preview.booking, { staff: '担当A' })
  const canceled = admin.adminCancelLine({ token: preview.pendingLine.token })
  assert.equal(canceled.booking.version, current().version)
  edit(canceled.booking, { staff: '担当B' })
  const secondPreview = edit(current(), { status: '確定' })
  admin.adminSendLine_ = () => ({ success: true })
  const sent = admin.adminConfirmLine({ token: secondPreview.pendingLine.token })
  assert.equal(sent.success, true)
  assert.equal(sent.booking.version, current().version)
  edit(sent.booking, { staff: '担当C' })
})

test('4500-character Japanese LINE messages round-trip below the 9KB property limit', () => {
  const { admin, props, current } = setup()
  const properties = admin.PropertiesService.getScriptProperties()
  const set = properties.setProperty
  properties.setProperty = function(key, value) {
    assert.ok(Buffer.byteLength(value, 'utf8') <= 9 * 1024)
    return set.call(this, key, Buffer.from(value, 'utf8').toString('utf8'))
  }
  for (const message of ['あ'.repeat(4500), '🐢'.repeat(2250), '\\"あ'.repeat(1500)]) {
    const preview = admin.adminPrepareCustomLine({ bookingKey: current().key, expectedVersion: current().version, message })
    assert.equal(preview.message, message)
    assert.equal(admin.adminReadPendingLine_(preview.token).message, message)
    admin.adminCancelLine({ token: preview.token })
    assert.equal([...props.keys()].filter(key => key.includes(preview.token)).length, 0)
  }
})

test('pending cleanup removes all expired or canceled chunks and preserves unrelated previews', () => {
  const { admin, props } = setup()
  const pending = (bookingKey, createdAt) => admin.adminSavePendingLine_({ bookingKey, createdAt, message: 'あ'.repeat(4500) })
  const fresh = pending('OTHER', new Date().toISOString())
  const expired = pending('EXPIRED', new Date(Date.now() - 31 * 60_000).toISOString())
  const changed = pending('CHANGED', new Date().toISOString())
  admin.adminCleanupExpiredPending_()
  admin.adminDeletePendingPropertiesForBooking_({ key: 'CHANGED' })
  assert.equal(admin.adminReadPendingLine_(expired.token), null)
  assert.equal(admin.adminReadPendingLine_(changed.token), null)
  assert.equal(admin.adminReadPendingLine_(fresh.token).message.length, 4500)
  assert.ok([...props.keys()].every(key => !key.includes(expired.token) && !key.includes(changed.token)))
  props.set(admin.ADMIN_PENDING_PREFIX + 'legacy', JSON.stringify({ message: '旧版', createdAt: new Date().toISOString() }))
  assert.equal(admin.adminReadPendingLine_('legacy').message, '旧版')
})

test('a failed chunk write leaves no partial preview or orphan message data', () => {
  const { admin, props } = setup()
  const properties = admin.PropertiesService.getScriptProperties()
  const set = properties.setProperty
  properties.setProperty = function(key, value) {
    if (key.startsWith(admin.ADMIN_PENDING_CHUNK_PREFIX) && key.endsWith('_1')) throw new Error('Property quota')
    return set.call(this, key, value)
  }
  assert.throws(() => admin.adminSavePendingLine_({ message: 'あ'.repeat(4500), createdAt: new Date().toISOString() }), /Property quota/)
  assert.equal([...props.keys()].filter(key => key.startsWith(admin.ADMIN_PENDING_PREFIX) || key.startsWith(admin.ADMIN_PENDING_CHUNK_PREFIX)).length, 0)
})

test('a refresh failure after sending LINE does not report the send as failed or reuse its token', () => {
  const { admin, current } = setup()
  const booking = current()
  const preview = admin.adminUpdateBooking({ bookingKey: booking.key, updates: { status: '確定' } })
  admin.adminSendLine_ = () => {
    admin.adminFindBooking_ = () => { throw new Error('Read unavailable after send') }
    return { success: true }
  }
  const result = admin.adminConfirmLine({ token: preview.pendingLine.token })
  assert.equal(result.success, true)
  assert.equal(result.booking, null)
  assert.match(result.warning, /再読み込み/)
  assert.equal(admin.adminReadPendingLine_(preview.pendingLine.token), null)
})

for (const columns of [26, 51, 55]) {
  test(`deleted-booking archive expands its ${columns}-column full grid without losing data`, () => {
    const { admin, sheet, current } = setup()
    const archive = new Sheet('削除済み予約', 2, columns)
    archive.cells[0][0] = '削除日時'
    archive.cells[1][0] = 'KEEP'
    admin.adminGetSpreadsheet_ = () => ({ getSheetByName: () => archive })
    const values = sheet.cells[1].slice()
    values[48] = 'REFERRAL-CAMPAIGN'
    const saved = admin.adminArchiveDeletedBooking_(sheet, current(), [{ rowNumber: 2, values }], 'owner@example.test')
    assert.equal(saved.startRow, 3)
    assert.equal(archive.getMaxColumns(), 55)
    assert.equal(archive.cells[1][0], 'KEEP')
    assert.equal(archive.cells[2][54], 'REFERRAL-CAMPAIGN')
    assert.equal(archive.cells[0][54], '紹介キャンペーン')
  })
}

test('atomic append preserves yen formatting, local timestamps and literal customer text', () => {
  const { admin, reception, sheet } = setup()
  assert.equal(admin.appendBookingCells_.toString(), reception.appendBookingCells_.toString())
  const yenFormat = { type: 'CURRENCY', pattern: '¥#,##0' }
  const checkbox = { condition: { type: 'BOOLEAN' }, strict: true }
  const template = Array.from({ length: 49 }, () => ({}))
  template[6] = { userEnteredFormat: { numberFormat: yenFormat } }
  template[19] = { dataValidation: checkbox }
  template[21] = { dataValidation: checkbox }
  sheet.getParent = () => ({ getId: () => 'test-sheet', getSpreadsheetTimeZone: () => 'Asia/Tokyo' })
  let request
  admin.Sheets.Spreadsheets.get = () => ({ sheets: [{ data: [{ rowData: [{ values: template }] }] }] })
  admin.Sheets.Spreadsheets.batchUpdate = body => { request = body }
  const row = sheet.cells[1].slice()
  row[0] = new Date('2026-09-08T00:00:00Z')
  row[4] = '=1+1'
  admin.appendBookingCells_(sheet, [row])
  const cells = request.requests[0].appendCells.rows[0].values
  assert.equal(cells[0].userEnteredValue.numberValue, Date.parse('2026-09-08T09:00:00Z') / 86400000 + 25569)
  assert.equal(cells[6].userEnteredFormat.numberFormat, yenFormat)
  assert.equal(cells[19].dataValidation, checkbox)
  assert.equal(cells[21].dataValidation, undefined)
  assert.equal(cells[4].userEnteredValue.stringValue, '=1+1')
})
