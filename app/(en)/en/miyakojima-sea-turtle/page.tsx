import type { Metadata } from "next"
import { IntlGuidePage, intlGuideMetadata } from "@/components/intl/guide-page"

export const metadata: Metadata = intlGuideMetadata("en")

export default function EnglishSeaTurtleGuidePage() {
  return <IntlGuidePage locale="en" />
}
