import type { Metadata } from "next"
import { IntlFaqPage, intlFaqMetadata } from "@/components/intl/faq-page"

export const metadata: Metadata = intlFaqMetadata("zh-tw")

export default function TraditionalChineseFaqPage() {
  return <IntlFaqPage locale="zh-tw" />
}
