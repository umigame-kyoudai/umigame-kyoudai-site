import type { Metadata } from "next"
import { IntlHomePage, intlHomeMetadata } from "@/components/intl/home-page"

export const metadata: Metadata = intlHomeMetadata("ko")

export default function KoreanHomePage() {
  return <IntlHomePage locale="ko" />
}
