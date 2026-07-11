import type { Metadata } from "next"
import { IntlBookPage, intlBookMetadata } from "@/components/intl/book-page"
import { BookingFormZhTw } from "@/components/booking-form-zh-tw"

export const metadata: Metadata = intlBookMetadata("zh-tw")

export default function TraditionalChineseBookPage() {
  return <IntlBookPage locale="zh-tw" form={<BookingFormZhTw />} />
}
