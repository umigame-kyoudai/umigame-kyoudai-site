import type { Metadata } from "next"
import { IntlPlanDetailPage, intlPlanDetailMetadata, intlPlanStaticParams } from "@/components/intl/plan-detail-page"

export function generateStaticParams() {
  return intlPlanStaticParams("ko")
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  return intlPlanDetailMetadata("ko", params.id)
}

export default async function KoreanPlanDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <IntlPlanDetailPage locale="ko" id={params.id} />
}
