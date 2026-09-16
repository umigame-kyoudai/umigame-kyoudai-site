import { getBookingPolicyCopy } from "@/lib/booking-policy-copy"


import { SITE_CONFIG, formatBusinessHours } from "@/lib/site-config"
import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BreadcrumbJsonLd } from "@/components/json-ld"
import { TrackedTel } from "@/components/tracked-cta"
import { createMetadata, SITE_URL } from "@/lib/seo"

const policyCopy = getBookingPolicyCopy()

export const metadata: Metadata = createMetadata({
  title: "特定商取引法に基づく表記",
  description:
    "海亀兄弟（宮古島ウミガメシュノーケルツアー）の特定商取引法に基づく表記。事業者情報、料金、お支払い方法、キャンセルポリシーをご確認いただけます。",
  path: "/tokushoho",
})

const ITEMS: Array<{ label: string; value: React.ReactNode }> = [
  { label: "事業者名", value: SITE_CONFIG.siteNameJa },
  { label: "運営責任者", value: "米谷 善和" },
  { label: "所在地", value: SITE_CONFIG.address.formattedJa },
  {
    label: "電話番号",
    value: (
      <>
        <TrackedTel href={`tel:${SITE_CONFIG.phone}`} location="tokushoho" className="text-emerald-700 underline">
          {SITE_CONFIG.phoneDisplayJa}
        </TrackedTel>
        （受付時間 {formatBusinessHours("ja", "〜")}・年中無休）
      </>
    ),
  },
  {
    label: "メールアドレス",
    value: (
      <a href={`mailto:${SITE_CONFIG.publicEmail}`} className="text-emerald-700 underline break-all">
        {SITE_CONFIG.publicEmail}
      </a>
    ),
  },
  { label: "販売価格", value: "各ツアープランのページに表示する価格（税込）" },
  {
    label: "商品代金以外の必要料金",
    value: "なし（集合場所までの交通費はお客様のご負担となります）",
  },
  { label: "お支払い方法", value: `${policyCopy.paymentSummary}。${policyCopy.prepaymentNotice} ${policyCopy.setPaymentNotice}` },
  { label: "お支払い時期", value: policyCopy.paymentTimingLabel },
  {
    label: "サービスの提供時期",
    value: "ご予約確定後、ご予約いただいた日時にサービスを提供します",
  },
  {
    label: "キャンセル・中止時の料金について",
    value: (
      <ul className="list-disc pl-5 space-y-1">
        <li>前日までのキャンセル: {policyCopy.previousDayFee}</li>
        <li>当日のキャンセル: ツアー料金の{policyCopy.sameDayFee}</li>
        <li>無断キャンセル: ツアー料金の{policyCopy.noShowFee}</li>
        <li>{policyCopy.weatherNotice}{policyCopy.partialCancellationNotice}</li>
      </ul>
    ),
  },
]

export default function TokushohoPage() {
  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "ホーム", url: SITE_URL },
          { name: "特定商取引法に基づく表記", url: `${SITE_URL}/tokushoho` },
        ]}
      />
      <Navbar />
      <main>
        <section className="px-5 sm:px-6 lg:px-8 pt-24 pb-16 sm:pt-28 max-w-3xl mx-auto">
          <p className="text-emerald-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-2">Legal</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">特定商取引法に基づく表記</h1>
          <dl className="divide-y divide-emerald-100 border-y border-emerald-100">
            {ITEMS.map((item) => (
              <div key={item.label} className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-4">
                <dt className="font-semibold text-gray-700 text-sm sm:text-base">{item.label}</dt>
                <dd className="sm:col-span-2 text-gray-600 text-sm sm:text-base">{item.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-xs text-gray-500">制定日: 2026年6月13日</p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
