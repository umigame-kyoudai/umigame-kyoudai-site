import assert from 'node:assert/strict'
import test from 'node:test'
import { isBookingUnavailable, bookingUnavailableMessage, isNightSlotUnavailable } from './booking-closures.ts'

test('closure is inclusive, plan-specific and does not recur in another year', () => {
  for (const plan of ['S3', 'S5', 'C1', 'C2', 'C5', 'C6']) {
    for (const date of ['2027-01-23', '2027-02-01', '2027-02-28']) assert.equal(isBookingUnavailable(date, plan), true, `${plan} ${date}`)
    for (const date of ['2027-01-22', '2027-03-01', '2028-01-23', '']) assert.equal(isBookingUnavailable(date, plan), false, `${plan} ${date}`)
  }
  for (const plan of ['', 'S1', 'S2', 'S4', 'S6', 'S7', 'S8', 'C3', 'C4', 'slide-boat']) {
    assert.equal(isBookingUnavailable('2027-02-01', plan), false, plan)
  }
  assert.equal(isBookingUnavailable('2026-10-27', 'S1'), true)
  for (const locale of ['ja', 'en', 'ko', 'zh-tw']) assert.match(bookingUnavailableMessage('2027-02-01', 'S5', locale), /2027/)
})

test('November 10 sea closure covers standalone and combined tours while night remains open', () => {
  for (const plan of ['S1', 'S2', 'S4', 'S6', 'S7', 'S8', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6']) {
    assert.equal(isBookingUnavailable('2026-11-10', plan), true, plan)
    assert.equal(isBookingUnavailable('2026-11-11', plan), false, plan)
  }
  for (const plan of ['S3', 'S5']) assert.equal(isBookingUnavailable('2026-11-10', plan), false, plan)
  for (const locale of ['ja', 'en', 'ko', 'zh-tw']) assert.match(bookingUnavailableMessage('2026-11-10', 'C1', locale), /10/)
})


test('11/11 night second slot is closed only for night tours and night sets', () => {
  for (const plan of ['S3', 'S5']) {
    assert.equal(isNightSlotUnavailable('2026-11-11', plan, '21:10'), true)
    for (const time of ['19:20', '23:20']) assert.equal(isNightSlotUnavailable('2026-11-11', plan, time), false)
    assert.equal(isNightSlotUnavailable('2026-11-12', plan, '21:10'), false)
  }
  for (const plan of ['C1', 'C2', 'C5', 'C6']) {
    assert.equal(isNightSlotUnavailable('2026-11-11', plan, '09:00', '21:10'), true)
    assert.equal(isNightSlotUnavailable('2026-11-11', plan, '09:00', '19:20'), false)
  }
  assert.equal(isNightSlotUnavailable('2026-11-11', 'S1', '21:10'), false)
})
