import assert from 'node:assert/strict'
import test from 'node:test'
import { BOOKING_LEAD_TIME_MS, getBookingDeadline, getJapanStartTime, getSunsetReferenceStart, isBookingDeadlinePassed, isBookingTimeOpen, getBookingDeadlineCopy } from './booking-deadline.ts'

const selection = { selectedPlan: 'S1', selectedDate: '2099-12-10', selectedTime: '09:00' }

test('booking stays open exactly one hour before the JST start, then closes', () => {
  const cutoff = Date.parse('2099-12-10T08:00:00+09:00')
  assert.equal(getBookingDeadline(selection), cutoff)
  for (const offset of [-1, 0, 1]) {
    assert.equal(isBookingDeadlinePassed(selection, cutoff + offset), offset > 0)
    assert.equal(isBookingTimeOpen(selection.selectedDate, '09:00', cutoff + offset), offset <= 0)
  }
})

test('night tours use their start date even when the tour ends after midnight', () => {
  const night = { selectedPlan: 'S3', selectedDate: '2099-12-10', selectedTime: '23:20' }
  assert.equal(getBookingDeadline(night), Date.parse('2099-12-10T22:20:00+09:00'))
  assert.equal(isBookingDeadlinePassed(night, Date.parse('2099-12-11T00:00:00+09:00')), true)
  assert.equal(isBookingTimeOpen('2099-12-11', '07:00', Date.parse('2099-12-10T23:59:00+09:00')), true)
})

test('every combo closes before its first activity, not the later night activity', () => {
  for (const selectedPlan of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']) {
    const combo = { ...selection, selectedPlan, nightTime: '23:20' }
    assert.equal(getBookingDeadline(combo), getBookingDeadline(selection), selectedPlan)
    assert.equal(isBookingDeadlinePassed(combo, Date.parse('2099-12-10T12:00:00+09:00')), true)
  }
})

test('sunset deadline uses the daily sunset reference and both private/regular plans agree', () => {
  for (const selectedDate of ['2099-01-15', '2099-07-15']) {
    const start = getSunsetReferenceStart(selectedDate)
    assert.ok(Number.isFinite(start))
    assert.ok(start > Date.parse(`${selectedDate}T15:00:00+09:00`) && start < Date.parse(`${selectedDate}T19:00:00+09:00`))
    for (const selectedPlan of ['S4', 'S8']) {
      const sunset = { selectedPlan, selectedDate, selectedTime: '' }
      assert.equal(getBookingDeadline(sunset), start - BOOKING_LEAD_TIME_MS)
      assert.equal(isBookingDeadlinePassed(sunset, start - BOOKING_LEAD_TIME_MS), false)
      assert.equal(isBookingDeadlinePassed(sunset, start - BOOKING_LEAD_TIME_MS + 1), true)
    }
  }
})

test('JST cutoff is independent of browser/server timezone', () => {
  const original = process.env.TZ
  try {
    for (const zone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
      process.env.TZ = zone
      assert.equal(getJapanStartTime('2099-12-10', '09:00'), Date.parse('2099-12-10T00:00:00Z'))
      assert.equal(getBookingDeadline(selection), Date.parse('2099-12-09T23:00:00Z'))
      assert.equal(getBookingDeadline({ ...selection, selectedPlan: 'S4' }), getSunsetReferenceStart('2099-12-10') - BOOKING_LEAD_TIME_MS)
    }
  } finally {
    if (original === undefined) delete process.env.TZ
    else process.env.TZ = original
  }
})

test('invalid dates/times are not offered and incomplete selections are not labelled expired', () => {
  for (const [date, time] of [['2099-02-30', '09:00'], ['2099-12-10', '24:00'], ['2099-12-10', '09:60'], ['', '09:00']]) {
    assert.equal(isBookingTimeOpen(date, time, 0), false)
    assert.equal(getJapanStartTime(date, time), null)
  }
  assert.equal(getBookingDeadline({ ...selection, selectedTime: '' }), null)
  assert.equal(isBookingDeadlinePassed({ ...selection, selectedTime: '' }), false)
  assert.equal(getBookingDeadlineCopy('__proto__').closed, getBookingDeadlineCopy('ja').closed)
})
