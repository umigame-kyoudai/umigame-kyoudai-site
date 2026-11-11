import type { Metadata } from "next"
import { IntlPlanDetailPage, intlPlanDetailMetadata, intlPlanStaticParams } from "@/components/intl/plan-detail-page"

export function generateStaticParams() {
  return intlPlanStaticParams("en")
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  return intlPlanDetailMetadata("en", params.id)
}

export default async function EnglishPlanDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <IntlPlanDetailPage locale="en" id={params.id} />
}
