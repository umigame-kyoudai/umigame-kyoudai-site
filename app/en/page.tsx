import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MobileCTA } from "@/components/mobile-cta"
import { BreadcrumbJsonLd } from "@/components/json-ld"
import { createMetadata, SITE_URL } from "@/lib/seo"
import { TrackedCta, TrackedTel } from "@/components/tracked-cta"
import { PLANS, formatPriceWithTilde } from "@/lib/data"
import { getEnPrice } from "@/lib/i18n/en-prices"
import { EN_HOME, EN_PLAN_BY_ID, EN_FAQS } from "@/lib/i18n/en"
import { Shield, Camera, CalendarCheck, Users, MessageCircle, Phone, Mail, ChevronRight, Star } from "lucide-react"

export const metadata: Metadata = createMetadata({
  title: EN_HOME.metaTitle,
  description: EN_HOME.metaDescription,
  path: "/en",
  locale: "en",
  altLocalePath: "/",
})

const TRUST_ICONS = [Shield, Camera, CalendarCheck, Users]

export default function EnglishHomePage() {
  const visiblePlans = PLANS.filter((plan) => EN_PLAN_BY_ID[plan.id])
  const topFaqs = EN_FAQS.slice(0, 6)

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd items={[{ name: "Home", url: `${SITE_URL}/en` }]} />
      <Navbar locale="en" />

      <main>
        {/* Hero */}
        <section className="relative min-h-[70svh] flex items-center overflow-hidden">
          <Image
            src="/images/gemini-generated-image-rq969urq969urq96.jpeg"
            alt="Two sea turtles swimming together in the clear waters of Miyakojima"
            fill
            priority
            quality={85}
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
          <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-20 w-full">
            <span className="inline-flex items-center gap-2 bg-white/90 rounded-full px-3.5 py-1.5 mb-5 shadow-lg">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-gray-900 font-bold text-xs sm:text-sm">{EN_HOME.hero.badge}</span>
            </span>
            <h1 className="max-w-3xl text-4xl sm:text-5xl md:text-6xl font-black text-white mb-5 drop-shadow-2xl leading-tight">
              {EN_HOME.hero.title}
            </h1>
            <p className="max-w-2xl text-base sm:text-xl text-white/90 mb-7 drop-shadow-md leading-relaxed">
              {EN_HOME.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <TrackedCta
                event="book_cta_click"
                eventProps={{ location: "en_home" }}
                href="/en/book"
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base px-7 py-3.5 rounded-full shadow-lg transition-all"
              >
                <CalendarCheck className="w-5 h-5" />
                Check Availability & Book
              </TrackedCta>
              <Link
                href="/en/plans"
                className="inline-flex items-center justify-center gap-2 bg-white/15 backdrop-blur-sm hover:bg-white/25 text-white font-bold text-base px-7 py-3.5 rounded-full border border-white/35 transition-all"
              >
                See All Tours
              </Link>
            </div>
          </div>
        </section>

        {/* Trust items */}
        <section className="bg-emerald-50 py-8">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EN_HOME.trustItems.map((item, i) => {
              const Icon = TRUST_ICONS[i % TRUST_ICONS.length]
              return (
                <div key={item} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm ring-1 ring-emerald-100">
                  <Icon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-700">{item}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* About */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">{EN_HOME.aboutHeading}</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              {EN_HOME.aboutParagraphs.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
            <Link
              href="/en/miyakojima-sea-turtle"
              className="mt-6 inline-flex items-center gap-1 text-emerald-700 font-semibold hover:text-emerald-800"
            >
              Read our sea turtle snorkeling guide
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Tours */}
        <section className="py-16 bg-gradient-to-b from-white to-emerald-50">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{EN_HOME.toursHeading}</h2>
            <p className="text-gray-600 mb-8 max-w-2xl">{EN_HOME.toursIntro}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visiblePlans.map((plan) => {
                const en = EN_PLAN_BY_ID[plan.id]
                const comingSoon = plan.status === "coming_soon"
                return (
                  <Link
                    key={plan.id}
                    href={`/en/plans/${plan.id}`}
                    className="group bg-white rounded-3xl overflow-hidden shadow-md ring-1 ring-emerald-100 hover:shadow-xl transition-shadow"
                  >
                    <div className="relative h-48">
                      <Image
                        src={plan.image}
                        alt={en.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      {comingSoon && (
                        <span className="absolute top-3 left-3 bg-cyan-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{en.name}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{en.tagline}</p>
                      <div className="flex items-baseline justify-between">
                        <span className="text-emerald-700 font-black text-xl">
                          {en.priceNote ? formatPriceWithTilde(getEnPrice(plan)) : `¥${getEnPrice(plan).price.toLocaleString()}`}
                          <span className="text-xs font-medium text-gray-500 ml-1">/ adult</span>
                        </span>
                        <span className="text-xs text-gray-500">{en.ageNote}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* How to book */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">{EN_HOME.howToBookHeading}</h2>
            <ol className="space-y-5">
              {EN_HOME.howToBook.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-6">
              <h3 className="flex items-center gap-2 font-bold text-gray-900 mb-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                {EN_HOME.lineExplainer.title}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">{EN_HOME.lineExplainer.text}</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-emerald-50">
          <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{EN_HOME.faqHeading}</h2>
            <p className="text-gray-600 mb-8">{EN_HOME.faqIntro}</p>
            <div className="space-y-4">
              {topFaqs.map((faq) => (
                <details key={faq.question} className="group bg-white rounded-2xl ring-1 ring-emerald-100 p-5">
                  <summary className="font-semibold text-gray-900 cursor-pointer list-none flex justify-between items-center">
                    {faq.question}
                    <ChevronRight className="w-4 h-4 text-emerald-600 group-open:rotate-90 transition-transform flex-shrink-0 ml-3" />
                  </summary>
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
            <Link href="/en/faq" className="mt-6 inline-flex items-center gap-1 text-emerald-700 font-semibold hover:text-emerald-800">
              See all questions
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Contact */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{EN_HOME.contactHeading}</h2>
            <p className="text-gray-600 mb-8">{EN_HOME.contactText}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <TrackedCta
                event="line_click"
                eventProps={{ location: "en_home" }}
                href="https://lin.ee/jfp4laz"
                external
                className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-full transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Message us on LINE
              </TrackedCta>
              <a
                href="mailto:info@umigamekyoudaimiyakojima.com"
                className="inline-flex items-center justify-center gap-2 bg-white ring-1 ring-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold px-6 py-3 rounded-full transition-colors"
              >
                <Mail className="w-5 h-5" />
                Email us
              </a>
              <TrackedTel
                href="tel:08053442439"
                location="en_home"
                className="inline-flex items-center justify-center gap-2 bg-white ring-1 ring-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold px-6 py-3 rounded-full transition-colors"
              >
                <Phone className="w-5 h-5" />
                +81-80-5344-2439
              </TrackedTel>
            </div>
          </div>
        </section>
      </main>

      <Footer locale="en" />
      <MobileCTA locale="en" />
    </div>
  )
}
