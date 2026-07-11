// 多言語版FAQのテンプレート。元は app/(en)/en/faq/page.tsx。

import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MobileCTA } from "@/components/mobile-cta"
import { BreadcrumbJsonLd, FAQJsonLd } from "@/components/json-ld"
import { createMetadata, SITE_URL } from "@/lib/seo"
import { TrackedCta } from "@/components/tracked-cta"
import { getDict } from "@/lib/i18n/dict"
import { type IntlLocale, localePath } from "@/lib/i18n/locales"
import { ChevronRight, MessageCircle } from "lucide-react"

export function intlFaqMetadata(locale: IntlLocale): Metadata {
  const dict = getDict(locale)
  return createMetadata({
    title: dict.common.faqMetaTitle,
    description: dict.common.faqMetaDescription,
    path: localePath(locale, "/faq"),
    locale,
    intlBasePath: "/faq",
  })
}

export function IntlFaqPage({ locale }: { locale: IntlLocale }) {
  const dict = getDict(locale)
  const { common, faqs } = dict

  return (
    <div className="min-h-screen">
      <FAQJsonLd faqs={faqs} />
      <BreadcrumbJsonLd
        items={[
          { name: common.breadcrumbHome, url: `${SITE_URL}${localePath(locale, "/")}` },
          { name: common.breadcrumbFaq, url: `${SITE_URL}${localePath(locale, "/faq")}` },
        ]}
      />
      <Navbar locale={locale} nav={dict.ui.nav} />
      <main>
        <section className="px-5 sm:px-6 lg:px-8 pt-24 pb-4 sm:pt-28 max-w-4xl mx-auto">
          <p className="text-emerald-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-2">{common.faqEyebrow}</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{common.faqTitle}</h1>
          <p className="mt-3 text-gray-600 text-sm sm:text-base max-w-2xl">{common.faqIntro}</p>
        </section>

        <section className="px-5 sm:px-6 lg:px-8 pb-16 max-w-4xl mx-auto">
          <div className="space-y-4 mt-6">
            {faqs.map((faq) => (
              <details key={faq.question} className="group bg-white rounded-2xl ring-1 ring-emerald-100 shadow-sm p-5">
                <summary className="font-semibold text-gray-900 cursor-pointer list-none flex justify-between items-center">
                  {faq.question}
                  <ChevronRight className="w-4 h-4 text-emerald-600 group-open:rotate-90 transition-transform flex-shrink-0 ml-3" />
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>

          <div className="mt-10 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <p className="text-gray-700 mb-4">{common.faqStillQuestions}</p>
            <TrackedCta
              event="line_click"
              eventProps={{ location: `${locale}_faq` }}
              href="https://lin.ee/jfp4laz"
              external
              className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-full transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              {common.askOnLine}
            </TrackedCta>
            <p className="mt-3 text-sm text-gray-500">
              {common.orEmail}{" "}
              <a href="mailto:info@umigamekyoudaimiyakojima.com" className="text-emerald-700 underline">
                info@umigamekyoudaimiyakojima.com
              </a>
            </p>
          </div>

          <div className="mt-8 text-center">
            <TrackedCta event="book_cta_click" eventProps={{ location: `${locale}_faq` }} href={localePath(locale, "/book")} className="text-emerald-700 font-semibold underline">
              {common.readyToBook}
            </TrackedCta>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
      <MobileCTA locale={locale} cta={dict.ui.mobileCta} />
    </div>
  )
}
