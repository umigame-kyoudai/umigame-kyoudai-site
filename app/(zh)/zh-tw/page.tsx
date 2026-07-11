import type { Metadata } from "next"
import { IntlHomePage, intlHomeMetadata } from "@/components/intl/home-page"

export const metadata: Metadata = intlHomeMetadata("zh-tw")

export default function TraditionalChineseHomePage() {
  return <IntlHomePage locale="zh-tw" />
}
