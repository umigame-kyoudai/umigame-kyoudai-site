import type { Metadata } from "next"
import { IntlGuidePage, intlGuideMetadata } from "@/components/intl/guide-page"

export const metadata: Metadata = intlGuideMetadata("zh-tw")

export default function TraditionalChineseSeaTurtleGuidePage() {
  return <IntlGuidePage locale="zh-tw" />
}
