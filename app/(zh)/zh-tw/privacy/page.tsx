import type { Metadata } from "next"
import { IntlLegalPage, intlLegalMetadata } from "@/components/intl/legal-page"

export const metadata: Metadata = intlLegalMetadata("zh-tw", "privacy")

export default function TraditionalChinesePrivacyPage() {
  return <IntlLegalPage locale="zh-tw" kind="privacy" />
}
