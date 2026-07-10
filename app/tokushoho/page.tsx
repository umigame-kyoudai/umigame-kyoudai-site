import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BreadcrumbJsonLd } from "@/components/json-ld"
import { TrackedTel } from "@/components/tracked-cta"
import { createMetadata, SITE_URL } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "特定商取引法に基づく表記",
  description:
    "海亀兄弟（宮古島ウミガメシュノーケルツアー）の特定商取引法に基づく表記。事業者情報、料金、お支払い方法、キャンセルポリシーをご確認いただけます。",
  path: "/tokushoho",
})

const ITEMS: Array<{ label: string; value: React.ReactNode }> = [
  { label: "事業者名", value: "海亀兄弟" },
  { label: "運営責任者", value: "米谷 善和" },
  { label: "所在地", value: "〒906-0014 沖縄県宮古島市平良松原107-1" },
  {
    label: "電話番号",
    value: (
      <>
        <TrackedTel href="tel:08053442439" location="tokushoho" className="text-emerald-700 underline">
          080-5344-2439
        </TrackedTel>
        （受付時間 7:00〜18:00・年中無休）
      </>
    ),
  },
  {
    label: "メールアドレス",
    value: (
      <a href="mailto:info@umigamekyoudaimiyakojima.com" className="text-emerald-700 underline break-all">
        info@umigamekyoudaimiyakojima.com
      </a>
    ),
  },
  { label: "販売価格", value: "各ツアープランのページに表示する価格（税込）" },
  {
    label: "商品代金以外の必要料金",
    value: "なし（集合場所までの交通費はお客様のご負担となります）",
  },
  { label: "お支払い方法", value: "ツアー当日に現地での現金決済" },
  { label: "お支払い時期", value: "ツアー当日" },
  {
    label: "サービスの提供時期",
    value: "ご予約確定後、ご予約いただいた日時にサービスを提供します",
  },
  {
    label: "キャンセル・返金について",
    value: (
      <ul className="list-disc pl-5 space-y-1">
        <li>前日までのキャンセル: 無料</li>
        <li>当日のキャンセル: ツアー料金の100%</li>
        <li>無断キャンセル: ツアー料金の100%</li>
        <li>天候不良等により当店の判断で中止した場合: キャンセル料は発生しません（お支払いはツアー当日の現地現金決済のため、事前のお支払い・返金はありません）</li>
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
