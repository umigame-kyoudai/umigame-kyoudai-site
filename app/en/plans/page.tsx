import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MobileCTA } from "@/components/mobile-cta"
import { BreadcrumbJsonLd } from "@/components/json-ld"
import { createMetadata, SITE_URL } from "@/lib/seo"
import { PLANS } from "@/lib/data"
import { EN_PLAN_BY_ID } from "@/lib/i18n/en"
import { getEnPrice } from "@/lib/i18n/en-prices"
import { Clock, Users, ChevronRight } from "lucide-react"

export const metadata: Metadata = createMetadata({
  title: "Tours & Prices | Sea Turtle Brothers Miyakojima",
  description:
    "All Sea Turtle Brothers tours in Miyakojima: sea turtle snorkeling from ¥8,500, private tours, jungle night tours and sunset SUP. Free photos & videos, free cancellation until the day before.",
  path: "/en/plans",
  locale: "en",
  altLocalePath: "/plans",
})

export default function EnglishPlansPage() {
  const visiblePlans = PLANS.filter((plan) => EN_PLAN_BY_ID[plan.id])

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: `${SITE_URL}/en` },
          { name: "Tours", url: `${SITE_URL}/en/plans` },
        ]}
      />
      <Navbar locale="en" />
      <main>
        <section className="px-5 sm:px-6 lg:px-8 pt-24 pb-4 sm:pt-28 max-w-6xl mx-auto">
          <p className="text-emerald-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-2">Tour Plans</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Tours & Prices in Miyakojima</h1>
          <p className="mt-3 text-gray-600 text-sm sm:text-base max-w-2xl">
            Sea turtle snorkeling, private charters, jungle night tours and sunset SUP. Every tour includes free photos
            and videos, with free cancellation until the day before.
          </p>
        </section>

        <section className="px-5 sm:px-6 lg:px-8 pb-20 max-w-6xl mx-auto">
          <div className="space-y-6 mt-6">
            {visiblePlans.map((plan) => {
              const en = EN_PLAN_BY_ID[plan.id]
              const comingSoon = plan.status === "coming_soon"
              return (
                <Link
                  key={plan.id}
                  href={`/en/plans/${plan.id}`}
                  className="group flex flex-col sm:flex-row bg-white rounded-3xl overflow-hidden shadow-md ring-1 ring-emerald-100 hover:shadow-xl transition-shadow"
                >
                  <div className="relative h-52 sm:h-auto sm:w-72 flex-shrink-0">
                    <Image
                      src={plan.image}
                      alt={en.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, 288px"
                    />
                    {comingSoon && (
                      <span className="absolute top-3 left-3 bg-cyan-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <div className="p-6 flex-1">
                    <h2 className="font-bold text-xl text-gray-900 mb-1">{en.name}</h2>
                    <p className="text-sm text-gray-600 mb-4">{en.tagline}</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500 mb-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        About {plan.durationHours} {plan.durationHours === 1 ? "hour" : "hours"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" />
                        {en.ageNote}
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        {en.priceNote ? (
                          <span className="text-emerald-700 font-black text-2xl">{en.priceNote.split(",")[0].split(".")[0]}</span>
                        ) : (
                          <>
                            <span className="text-emerald-700 font-black text-2xl">¥{getEnPrice(plan).price.toLocaleString()}</span>
                            <span className="text-xs font-medium text-gray-500 ml-1">/ adult</span>
                            {getEnPrice(plan).childPrice !== getEnPrice(plan).price && (
                              <span className="text-sm text-gray-500 ml-3">¥{getEnPrice(plan).childPrice.toLocaleString()} / child</span>
                            )}
                          </>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-sm">
                        Details
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </div>
  )
}
