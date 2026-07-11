import type { Metadata } from "next"
import { IntlLegalPage, intlLegalMetadata } from "@/components/intl/legal-page"

export const metadata: Metadata = intlLegalMetadata("zh-tw", "terms")

export default function TraditionalChineseTermsPage() {
  return <IntlLegalPage locale="zh-tw" kind="terms" />
}
