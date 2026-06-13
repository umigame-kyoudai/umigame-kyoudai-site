import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MobileCTA } from "@/components/mobile-cta"
import { BreadcrumbJsonLd, FAQJsonLd } from "@/components/json-ld"
import { createMetadata, SITE_URL } from "@/lib/seo"
import { EN_FAQS } from "@/lib/i18n/en"
import { ChevronRight, MessageCircle } from "lucide-react"

export const metadata: Metadata = createMetadata({
  title: "FAQ | Sea Turtle Brothers Miyakojima",
  description:
    "Answers to common questions about Sea Turtle Brothers tours in Miyakojima: swimming ability, kids, what to bring, cancellation, weather, payment and more.",
  path: "/en/faq",
  locale: "en",
  altLocalePath: "/faq",
})

export default function EnglishFaqPage() {
  return (
    <div className="min-h-screen">
      <FAQJsonLd faqs={EN_FAQS} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: `${SITE_URL}/en` },
          { name: "FAQ", url: `${SITE_URL}/en/faq` },
        ]}
      />
      <Navbar locale="en" />
      <main>
        <section className="px-5 sm:px-6 lg:px-8 pt-24 pb-4 sm:pt-28 max-w-4xl mx-auto">
          <p className="text-emerald-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-2">FAQ</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Frequently Asked Questions</h1>
          <p className="mt-3 text-gray-600 text-sm sm:text-base max-w-2xl">
            Everything you need to know before joining a tour — swimming ability, kids, cancellation, what to bring and
            more. Can't find your answer? Message us on LINE anytime.
          </p>
        </section>

        <section className="px-5 sm:px-6 lg:px-8 pb-16 max-w-4xl mx-auto">
          <div className="space-y-4 mt-6">
            {EN_FAQS.map((faq) => (
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
            <p className="text-gray-700 mb-4">Still have questions? We reply carefully during business hours (7:00 AM – 6:00 PM).</p>
            <a
              href="https://lin.ee/jfp4laz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-full transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Ask on LINE
            </a>
            <p className="mt-3 text-sm text-gray-500">
              or email{" "}
              <a href="mailto:info@umigamekyoudaimiyakojima.com" className="text-emerald-700 underline">
                info@umigamekyoudaimiyakojima.com
              </a>
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link href="/en/book" className="text-emerald-700 font-semibold underline">
              Ready to book? Check availability here
            </Link>
          </div>
        </section>
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </div>
  )
}
