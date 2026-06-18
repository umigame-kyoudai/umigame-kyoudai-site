import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MobileCTA } from "@/components/mobile-cta"
import { BreadcrumbJsonLd } from "@/components/json-ld"
import { createMetadata, SITE_URL } from "@/lib/seo"
import { PLANS } from "@/lib/data"
import { EN_PLAN_BY_ID, EN_PLANS } from "@/lib/i18n/en"
import { getEnPrice, EN_PRICE_SUPPORT_NOTE } from "@/lib/i18n/en-prices"
import { Clock, Users, MapPin, CalendarCheck, Check, AlertTriangle, Backpack, Camera } from "lucide-react"

export function generateStaticParams() {
  return EN_PLANS.map((plan) => ({ id: plan.id }))
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const en = EN_PLAN_BY_ID[params.id]
  if (!en) return {}
  return createMetadata({
    title: `${en.name} | Sea Turtle Brothers Miyakojima`,
    description: en.tagline,
    path: `/en/plans/${params.id}`,
    locale: "en",
    altLocalePath: `/plans/${params.id}`,
  })
}

export default function EnglishPlanDetailPage({ params }: { params: { id: string } }) {
  const en = EN_PLAN_BY_ID[params.id]
  const plan = PLANS.find((p) => p.id === params.id)
  if (!en || !plan) notFound()

  const comingSoon = plan.status === "coming_soon"
  const times = plan.timeTags.filter((t) => /^\d{2}:\d{2}$/.test(t))

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: `${SITE_URL}/en` },
          { name: "Tours", url: `${SITE_URL}/en/plans` },
          { name: en.name, url: `${SITE_URL}/en/plans/${plan.id}` },
        ]}
      />
      <Navbar locale="en" />
      <main className="pb-24">
        {/* Hero */}
        <section className="relative h-[45svh] min-h-[300px]">
          <Image src={plan.image} alt={en.name} fill priority className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 max-w-5xl mx-auto">
            {comingSoon && (
              <span className="inline-block bg-cyan-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                Coming Soon — booking not open yet
              </span>
            )}
            <h1 className="text-2xl sm:text-4xl font-black text-white drop-shadow-lg">{en.name}</h1>
            <p className="text-white/90 mt-2 max-w-2xl text-sm sm:text-base drop-shadow">{en.tagline}</p>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          {/* Key facts */}
          <section className="-mt-6 relative z-10 bg-white rounded-3xl shadow-lg ring-1 ring-emerald-100 p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Price (adult)</p>
              <p className="text-emerald-700 font-black text-xl">¥{getEnPrice(plan).price.toLocaleString()}</p>
              {getEnPrice(plan).childPrice !== getEnPrice(plan).price && (
                <p className="text-xs text-gray-500">Child ¥{getEnPrice(plan).childPrice.toLocaleString()}</p>
              )}
              {en.priceNote && <p className="text-xs text-gray-500 mt-1">{en.priceNote}</p>}
              <p className="text-xs text-gray-400 mt-1">{EN_PRICE_SUPPORT_NOTE}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Duration</p>
              <p className="font-bold text-gray-900 inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                About {plan.durationHours}h
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Ages</p>
              <p className="font-bold text-gray-900 inline-flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                {en.ageNote}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Start times</p>
              <p className="font-bold text-gray-900 text-sm">
                {times.length > 0 ? times.join(" / ") : "Depends on sunset"}
              </p>
            </div>
          </section>

          {/* Description */}
          <section className="mt-10 space-y-4 text-gray-600 leading-relaxed">
            {en.description.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </section>

          {/* Highlights */}
          <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              Highlights
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {en.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 bg-emerald-50 rounded-xl px-4 py-3 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </section>

          {/* Included / Bring */}
          <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl ring-1 ring-emerald-100 p-6">
              <h2 className="font-bold text-gray-900 mb-3">What's included</h2>
              <ul className="space-y-2 text-sm text-gray-600">
                {en.included.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {en.options && en.options.length > 0 && (
                <>
                  <h3 className="font-semibold text-gray-900 text-sm mt-4 mb-2">Optional rentals</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {en.options.map((opt) => (
                      <li key={opt.name}>
                        {opt.name}: ¥{opt.price.toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="bg-white rounded-2xl ring-1 ring-emerald-100 p-6">
              <h2 className="font-bold text-gray-900 mb-3 inline-flex items-center gap-2">
                <Backpack className="w-4 h-4 text-emerald-600" />
                What to bring
              </h2>
              <ul className="space-y-2 text-sm text-gray-600">
                {en.whatToBring.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Meeting / time notes */}
          {(en.locationNote || en.timeNote) && (
            <section className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6 text-sm text-blue-900 space-y-2">
              {en.locationNote && (
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {en.locationNote}
                </p>
              )}
              {en.timeNote && (
                <p className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {en.timeNote}
                </p>
              )}
            </section>
          )}

          {/* Precautions */}
          <section className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h2 className="font-bold text-amber-900 mb-3 inline-flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Important notes
            </h2>
            <ul className="space-y-2 text-sm text-amber-900">
              {en.precautions.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <p className="text-sm text-amber-900 mt-3">
              Payment is in cash, on site, on the day of your tour. Free cancellation until the day before — see our{" "}
              <Link href="/en/terms" className="underline">
                cancellation policy
              </Link>
              .
            </p>
          </section>

          {/* CTA */}
          <section className="mt-10 text-center">
            {comingSoon ? (
              <p className="text-gray-600">
                This plan is coming soon. Follow us on{" "}
                <a href="https://lin.ee/jfp4laz" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
                  LINE
                </a>{" "}
                to hear when booking opens.
              </p>
            ) : (
              <Link
                href={`/en/book?plan=${plan.id}`}
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg px-10 py-4 rounded-full shadow-lg transition-all"
              >
                <CalendarCheck className="w-5 h-5" />
                Book this tour
              </Link>
            )}
          </section>
        </div>
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </div>
  )
}
