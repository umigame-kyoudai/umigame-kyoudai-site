import type { Metadata } from "next"
import { IntlLegalPage, intlLegalMetadata } from "@/components/intl/legal-page"

export const metadata: Metadata = intlLegalMetadata("en", "privacy")

export default function EnglishPrivacyPage() {
  return <IntlLegalPage locale="en" kind="privacy" />
}
