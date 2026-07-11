import type { Metadata } from "next"
import { IntlLegalPage, intlLegalMetadata } from "@/components/intl/legal-page"

export const metadata: Metadata = intlLegalMetadata("ko", "privacy")

export default function KoreanPrivacyPage() {
  return <IntlLegalPage locale="ko" kind="privacy" />
}
