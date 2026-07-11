import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MobileCTA } from "@/components/mobile-cta"
import { PlansSection } from "@/components/home/plans-section"
import { BreadcrumbJsonLd } from "@/components/json-ld"
import { createMetadata, SITE_URL } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "ツアープラン一覧｜料金・対象年齢で比較",
  description:
    "海亀兄弟の宮古島ツアー一覧。ウミガメシュノーケル、貸切ツアー、本格ナイトツアー、サンセットSUP、ドローンSUPを料金・対象年齢で比較。写真・動画データ無料、前日までキャンセル無料。",
  path: "/plans",
  locale: "ja",
  altLocalePath: "/en/plans",
})

export default function PlansPage() {
  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "ホーム", url: SITE_URL },
          { name: "ツアープラン", url: `${SITE_URL}/plans` },
        ]}
      />
      <Navbar />
      <main>
        <section className="px-5 sm:px-6 lg:px-8 pt-24 pb-2 sm:pt-28 max-w-7xl mx-auto">
          <p className="text-emerald-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-2">
            Tour Plans
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            宮古島ツアープラン一覧
          </h1>
          <p className="mt-3 text-gray-600 text-sm sm:text-base max-w-2xl">
            ウミガメシュノーケル・貸切・ナイトツアー・サンセットSUP・ドローンSUP。料金と対象年齢で比較して、
            気になるプランの詳細から予約に進めます。
          </p>
        </section>
        <PlansSection />
      </main>
      <Footer />
      <MobileCTA />
    </div>
  )
}
