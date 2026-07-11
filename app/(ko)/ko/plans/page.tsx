import type { Metadata } from "next"
import { IntlPlansPage, intlPlansMetadata } from "@/components/intl/plans-page"

export const metadata: Metadata = intlPlansMetadata("ko")

export default function KoreanPlansPage() {
  return <IntlPlansPage locale="ko" />
}
