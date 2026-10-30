import assert from 'node:assert/strict'
import test from 'node:test'
import { EN_DICT } from './i18n/en.ts'
import { KO_DICT } from './i18n/ko.ts'
import { ZH_TW_DICT } from './i18n/zh-tw.ts'
import { getIntlBookingError, getIntlCouponError } from './intl-form-errors.ts'
import { getBookingDeadlineCopy } from './booking-deadline.ts'

for (const [locale, dict] of Object.entries({ en: EN_DICT, ko: KO_DICT, 'zh-tw': ZH_TW_DICT })) {
  const copy = dict.form

  test(`${locale}: coupon errors distinguish invalid selection, rate limit and connection failure`, () => {
    for (const recalculating of [false, true]) {
      for (const status of [200, 400]) {
        assert.equal(getIntlCouponError(copy, status, recalculating), recalculating ? copy.couponChangedInvalid : copy.couponInvalid)
      }
      assert.equal(getIntlCouponError(copy, 429, recalculating), copy.rateLimitError)
      for (const status of [undefined, 500, 503]) {
        assert.equal(getIntlCouponError(copy, status, recalculating), recalculating ? copy.couponRecalcError : copy.couponNetworkError)
      }
    }
  })

  test(`${locale}: booking errors use local copy, including expired LINE and uncertain network results`, () => {
    const deadline = getBookingDeadlineCopy(locale).closed
    assert.equal(getIntlBookingError(copy, 400, 'BOOKING_DEADLINE_PASSED', deadline), deadline)
    for (const [status, expected] of [
      [401, copy.lineExpiredError],
      [429, copy.rateLimitError],
      [400, copy.submitValidationError],
      [500, copy.submitFailedError],
      [200, copy.submitFailedError],
      [undefined, copy.submitNetworkError],
    ]) {
      // Unknown server text must never become the user-facing message.
      const message = getIntlBookingError(copy, status, '日本語の内部エラー', deadline)
      assert.equal(message, expected)
      assert.ok(message.length > 0)
      assert.doesNotMatch(message, /[ぁ-ゖァ-ヺ]/u)
    }
    assert.ok(copy.lineConnectionError.length > 0)
    assert.ok(copy.lineRetry.length > 0)
    assert.doesNotMatch(copy.lineConnectionError, /[ぁ-ゖァ-ヺ]/u)
  })
}
