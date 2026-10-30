import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizePhoneNumber, validatePhoneNumber } from './validation.ts'

test('Japanese and international phone formats, including full-width input, are accepted', () => {
  for (const phone of ['090-1234-5678', '03-1234-5678', '+81 90 1234 5678', '+1 (212) 555-0123', '+82 10 1234 5678', '+886 912 345 678', '+852 2345 6789', '+290 12345', '０９０－１２３４－５６７８', '＋８１　９０　１２３４　５６７８']) {
    assert.equal(validatePhoneNumber(phone).valid, true, phone)
  }
  assert.equal(normalizePhoneNumber(' ＋８１　９０−１２３４−５６７８ '), '+81 90-1234-5678')
})

test('phone separators cannot substitute for digits; malformed and excessive input is rejected', () => {
  for (const phone of ['', '----------', '          ', '()()()()()', '+ () -', '090---12', '+12345', '123+45678901', '090abc12345678', '+1234567890123456', null, 9012345678]) {
    assert.equal(validatePhoneNumber(phone).valid, false, String(phone))
  }
})
