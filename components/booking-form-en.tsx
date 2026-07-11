"use client"

// 英語予約フォーム。実装は booking-form-intl.tsx（3言語共通）で、
// ここでは英語辞書だけを渡す（他言語の辞書をバンドルに含めないための分割）。

import { BookingFormIntl } from "@/components/booking-form-intl"
import { EN_DICT } from "@/lib/i18n/en"

export function BookingFormEn() {
  return <BookingFormIntl locale="en" dict={EN_DICT} />
}
