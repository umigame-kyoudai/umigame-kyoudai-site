import type { Metadata } from "next"
import { IntlHomePage, intlHomeMetadata } from "@/components/intl/home-page"

export const metadata: Metadata = intlHomeMetadata("en")

export default function EnglishHomePage() {
  return <IntlHomePage locale="en" />
}
