import type { Metadata } from "next"
import { IntlBookPage, intlBookMetadata } from "@/components/intl/book-page"
import { BookingFormKo } from "@/components/booking-form-ko"

export const metadata: Metadata = intlBookMetadata("ko")

export default function KoreanBookPage() {
  return <IntlBookPage locale="ko" form={<BookingFormKo />} />
}
