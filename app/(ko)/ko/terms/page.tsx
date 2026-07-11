import type { Metadata } from "next"
import { IntlLegalPage, intlLegalMetadata } from "@/components/intl/legal-page"

export const metadata: Metadata = intlLegalMetadata("ko", "terms")

export default function KoreanTermsPage() {
  return <IntlLegalPage locale="ko" kind="terms" />
}
