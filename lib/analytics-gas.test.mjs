import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { createGas } from './test-helpers/gas-runtime.mjs'

const event = {
  occurred_at: '2026-09-08T23:59:01.789Z', event_name: 'page_view', page_path: '/book',
  visitor_id: 'c23ef1a4-4eae-437d-9038-ebc529896a27', visit_id: 'f5a24808-a39e-4cc2-a09d-bd6df58061b2',
  consent_version: '2026-08-13', consented_at: '2026-09-08T12:00:00.000Z',
  properties: { total: 0, line_ready: false, planName: '=1+1' },
}
const request = (overrides = {}) => ({ postData: { contents: JSON.stringify({ secret: 'test-secret', event, ...overrides }) } })
const parse = result => JSON.parse(result.text)

function setup() {
  const { g, props } = createGas('umigame-analytics')
  props.set('ANALYTICS_SHARED_SECRET', 'test-secret')
  props.set('ANALYTICS_SPREADSHEET_ID', 'analytics-sheet')
  const calls = []
  const sheet = { getLastRow: () => 26332, getSheetId: () => 123 }
  const spreadsheet = {
    getId: () => 'analytics-sheet', getSheetByName: () => sheet,
    getSpreadsheetTimeZone: () => 'Asia/Tokyo',
  }
  g.SpreadsheetApp.openById = () => spreadsheet
  g.LockService.getScriptLock = () => assert.fail('Normal ingestion must not wait for ScriptLock')
  g.Sheets = { Spreadsheets: { batchUpdate(body, id) { calls.push({ body, id }); return { replies: [{}] } } } }
  g.console = { error() {}, warn() {} }
  return { g, props, calls, sheet, spreadsheet }
}

test('analytics saves without ScriptLock and preserves all 70 columns and Sheets value types', () => {
  const { g, calls } = setup()
  assert.deepEqual(parse(g.doPost(request())), { ok: true })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].id, 'analytics-sheet')
  const append = calls[0].body.requests[0].appendCells
  assert.equal(append.sheetId, 123)
  assert.equal(append.rows.length, 1)
  const cells = append.rows[0].values
  assert.equal(cells.length, vm.runInContext('EVENT_HEADERS.length', g))
  assert.equal(cells.length, 70)
  assert.equal(cells[0].userEnteredValue.numberValue, Date.parse('2026-09-09T08:59:01.789Z') / 86400000 + 25569)
  assert.equal(cells[0].userEnteredFormat.numberFormat.type, 'DATE_TIME')
  assert.equal(cells[26].userEnteredValue.numberValue, 0)
  assert.equal(cells[69].userEnteredValue.boolValue, false)
  assert.equal(cells[21].userEnteredValue.stringValue, "'=1+1")
  assert.equal(cells[63].userEnteredValue.stringValue, event.visitor_id)
  assert.equal(cells[64].userEnteredValue.stringValue, event.visit_id)
  assert.ok(cells.every(cell => !cell.userEnteredValue || !('formulaValue' in cell.userEnteredValue)))
})

test('concurrent invocations append independently even when another write is still in progress', () => {
  const { g, calls } = setup()
  let nested = false
  g.Sheets.Spreadsheets.batchUpdate = (body, id) => {
    if (!nested) {
      nested = true
      assert.deepEqual(parse(g.doPost(request({ event: { ...event, page_path: '/en/book' } }))), { ok: true })
    }
    calls.push({ body, id })
  }
  assert.deepEqual(parse(g.doPost(request())), { ok: true })
  assert.equal(calls.length, 2)
  assert.deepEqual(calls.map(call => call.body.requests[0].appendCells.rows[0].values[2].userEnteredValue.stringValue), ['/en/book', '/book'])
})

test('unauthorized and invalid events cannot reach the sheet writer', () => {
  const { g, calls } = setup()
  assert.equal(parse(g.doPost(request({ secret: 'wrong' }))).error, 'unauthorized')
  assert.equal(parse(g.doPost(request({ event: null }))).error, 'invalid_request')
  assert.equal(parse(g.doPost(request({ event: { event_name: 'unsupported' } }))).error, 'invalid_request')
  assert.equal(calls.length, 0)
})

test('Sheets failures never report success or trigger a second write', () => {
  const { g } = setup()
  let attempts = 0
  g.Sheets.Spreadsheets.batchUpdate = () => { attempts++; throw new Error('Sheets unavailable') }
  assert.equal(parse(g.doPost(request())).ok, false)
  assert.equal(attempts, 1)
  delete g.Sheets
  assert.equal(parse(g.doPost(request())).ok, false)
  assert.equal(attempts, 1)
})

test('new sheet initialization flushes headers before releasing its lock and appending', () => {
  const { g, sheet, calls } = setup()
  const order = []
  let rows = 0
  sheet.getLastRow = () => rows
  g.LockService.getScriptLock = () => ({
    tryLock() { order.push('lock'); return true }, releaseLock() { order.push('release') },
  })
  g.configureEventsSheet_ = () => { rows = 1; order.push('headers') }
  g.SpreadsheetApp.flush = () => order.push('flush')
  g.Sheets.Spreadsheets.batchUpdate = () => order.push('append')
  assert.deepEqual(parse(g.doPost(request())), { ok: true })
  assert.deepEqual(order, ['lock', 'headers', 'flush', 'release', 'append'])
  assert.equal(calls.length, 0)
})

test('analytics manifest enables the Sheets v4 service used by the writer', () => {
  const manifest = JSON.parse(readFileSync('apps-script/umigame-analytics/appsscript.json', 'utf8'))
  assert.ok(manifest.dependencies.enabledAdvancedServices.some(service => service.serviceId === 'sheets' && service.version === 'v4' && service.userSymbol === 'Sheets'))
})
