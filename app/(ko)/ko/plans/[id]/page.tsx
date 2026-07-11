import type { Metadata } from "next"
import { IntlPlanDetailPage, intlPlanDetailMetadata, intlPlanStaticParams } from "@/components/intl/plan-detail-page"

export function generateStaticParams() {
  return intlPlanStaticParams("ko")
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return intlPlanDetailMetadata("ko", params.id)
}

export default function KoreanPlanDetailPage({ params }: { params: { id: string } }) {
  return <IntlPlanDetailPage locale="ko" id={params.id} />
}
