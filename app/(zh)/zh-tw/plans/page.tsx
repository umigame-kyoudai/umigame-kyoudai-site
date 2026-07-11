import type { Metadata } from "next"
import { IntlPlansPage, intlPlansMetadata } from "@/components/intl/plans-page"

export const metadata: Metadata = intlPlansMetadata("zh-tw")

export default function TraditionalChinesePlansPage() {
  return <IntlPlansPage locale="zh-tw" />
}
