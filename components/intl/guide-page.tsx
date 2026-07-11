// 多言語版ウミガメガイド（ピラーページ）のテンプレート。元は app/(en)/en/miyakojima-sea-turtle/page.tsx。

import type { Metadata } from "next"
import Image from "next/image"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MobileCTA } from "@/components/mobile-cta"
import { BreadcrumbJsonLd } from "@/components/json-ld"
import { createMetadata, SITE_URL } from "@/lib/seo"
import { TrackedCta } from "@/components/tracked-cta"
import { getDict } from "@/lib/i18n/dict"
import { type IntlLocale, localePath } from "@/lib/i18n/locales"
import { CalendarCheck } from "lucide-react"

export function intlGuideMetadata(locale: IntlLocale): Metadata {
  const dict = getDict(locale)
  return createMetadata({
    title: dict.guide.metaTitle,
    description: dict.guide.metaDescription,
    path: localePath(locale, "/miyakojima-sea-turtle"),
    locale,
    intlBasePath: "/miyakojima-sea-turtle",
  })
}

export function IntlGuidePage({ locale }: { locale: IntlLocale }) {
  const dict = getDict(locale)
  const { common, guide } = dict

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: common.breadcrumbHome, url: `${SITE_URL}${localePath(locale, "/")}` },
          { name: common.breadcrumbGuide, url: `${SITE_URL}${localePath(locale, "/miyakojima-sea-turtle")}` },
        ]}
      />
      <Navbar locale={locale} nav={dict.ui.nav} />
      <main>
        <section className="relative">
          <div className="relative h-[40svh] min-h-[260px]">
            <Image
              src="/images/gemini-generated-image-rq969urq969urq96.jpeg"
              alt={common.guideHeroImageAlt}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/30" />
          </div>
          <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 -mt-20 relative z-10">
            <div className="bg-white rounded-3xl shadow-lg ring-1 ring-emerald-100 p-6 sm:p-8">
              <p className="text-emerald-600 font-semibold text-xs tracking-widest uppercase mb-2">{common.guideEyebrow}</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{guide.heroTitle}</h1>
              <p className="mt-3 text-gray-600 text-sm sm:text-base leading-relaxed">{guide.heroSubtitle}</p>
            </div>
          </div>
        </section>

        <article className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 py-12">
          <div className="space-y-10">
            {guide.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">{section.heading}</h2>
                <div className="space-y-3 text-gray-600 leading-relaxed text-sm sm:text-base">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 40)}>{p}</p>
                  ))}
                  {section.bullets && (
                    <ul className="list-disc pl-5 space-y-2">
                      {section.bullets.map((b) => (
                        <li key={b.slice(0, 40)}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 text-center bg-emerald-50 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-3">{common.guideCtaHeading}</h2>
            <p className="text-gray-600 text-sm mb-6">{common.guideCtaText}</p>
            <TrackedCta
              event="book_cta_click"
              eventProps={{ location: `${locale}_pillar` }}
              href={localePath(locale, "/book")}
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-3.5 rounded-full shadow-lg transition-all"
            >
              <CalendarCheck className="w-5 h-5" />
              {common.checkAvailability}
            </TrackedCta>
          </div>
        </article>
      </main>
      <Footer locale={locale} />
      <MobileCTA locale={locale} cta={dict.ui.mobileCta} />
    </div>
  )
}
