import type { Metadata } from "next"
import { IntlPlanDetailPage, intlPlanDetailMetadata, intlPlanStaticParams } from "@/components/intl/plan-detail-page"

export function generateStaticParams() {
  return intlPlanStaticParams("zh-tw")
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return intlPlanDetailMetadata("zh-tw", params.id)
}

export default function TraditionalChinesePlanDetailPage({ params }: { params: { id: string } }) {
  return <IntlPlanDetailPage locale="zh-tw" id={params.id} />
}
