"use client"

// 韓国語予約フォーム。実装は booking-form-intl.tsx（3言語共通）で、
// ここでは韓国語辞書だけを渡す（他言語の辞書をバンドルに含めないための分割）。

import { BookingFormIntl } from "@/components/booking-form-intl"
import { KO_DICT } from "@/lib/i18n/ko"

export function BookingFormKo() {
  return <BookingFormIntl locale="ko" dict={KO_DICT} />
}
