import type { Metadata } from "next"
import { IntlFaqPage, intlFaqMetadata } from "@/components/intl/faq-page"

export const metadata: Metadata = intlFaqMetadata("en")

export default function EnglishFaqPage() {
  return <IntlFaqPage locale="en" />
}
