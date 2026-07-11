import type { Metadata } from "next"
import { IntlPlanDetailPage, intlPlanDetailMetadata, intlPlanStaticParams } from "@/components/intl/plan-detail-page"

export function generateStaticParams() {
  return intlPlanStaticParams("en")
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return intlPlanDetailMetadata("en", params.id)
}

export default function EnglishPlanDetailPage({ params }: { params: { id: string } }) {
  return <IntlPlanDetailPage locale="en" id={params.id} />
}
