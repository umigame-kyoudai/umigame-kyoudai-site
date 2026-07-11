import type { Metadata } from "next"
import { IntlFaqPage, intlFaqMetadata } from "@/components/intl/faq-page"

export const metadata: Metadata = intlFaqMetadata("ko")

export default function KoreanFaqPage() {
  return <IntlFaqPage locale="ko" />
}
