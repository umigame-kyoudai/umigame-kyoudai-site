"use client"

// 繁体字中国語（台湾向け）予約フォーム。実装は booking-form-intl.tsx（3言語共通）で、
// ここでは繁体字辞書だけを渡す（他言語の辞書をバンドルに含めないための分割）。

import { BookingFormIntl } from "@/components/booking-form-intl"
import { ZH_TW_DICT } from "@/lib/i18n/zh-tw"

export function BookingFormZhTw() {
  return <BookingFormIntl locale="zh-tw" dict={ZH_TW_DICT} />
}
