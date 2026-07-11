import type { Metadata } from "next"
import { IntlPlansPage, intlPlansMetadata } from "@/components/intl/plans-page"

export const metadata: Metadata = intlPlansMetadata("en")

export default function EnglishPlansPage() {
  return <IntlPlansPage locale="en" />
}
