import type { Metadata } from "next"
import { IntlLegalPage, intlLegalMetadata } from "@/components/intl/legal-page"

export const metadata: Metadata = intlLegalMetadata("en", "terms")

export default function EnglishTermsPage() {
  return <IntlLegalPage locale="en" kind="terms" />
}
