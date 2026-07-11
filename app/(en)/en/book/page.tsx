import type { Metadata } from "next"
import { IntlBookPage, intlBookMetadata } from "@/components/intl/book-page"
import { BookingFormEn } from "@/components/booking-form-en"

export const metadata: Metadata = intlBookMetadata("en")

export default function EnglishBookPage() {
  return <IntlBookPage locale="en" form={<BookingFormEn />} />
}
