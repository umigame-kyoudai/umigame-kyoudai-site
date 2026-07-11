import type { Metadata } from "next"
import { IntlGuidePage, intlGuideMetadata } from "@/components/intl/guide-page"

export const metadata: Metadata = intlGuideMetadata("ko")

export default function KoreanSeaTurtleGuidePage() {
  return <IntlGuidePage locale="ko" />
}
