import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MobileCTA } from "@/components/mobile-cta"
import { BreadcrumbJsonLd } from "@/components/json-ld"
import { createMetadata, SITE_URL } from "@/lib/seo"
import { TrackedCta } from "@/components/tracked-cta"
import { EN_GUIDE } from "@/lib/i18n/en"
import { CalendarCheck } from "lucide-react"

export const metadata: Metadata = createMetadata({
  title: EN_GUIDE.metaTitle,
  description: EN_GUIDE.metaDescription,
  path: "/en/miyakojima-sea-turtle",
  locale: "en",
  altLocalePath: "/miyakojima-sea-turtle",
})

export default function EnglishSeaTurtleGuidePage() {
  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: `${SITE_URL}/en` },
          { name: "Sea Turtle Guide", url: `${SITE_URL}/en/miyakojima-sea-turtle` },
        ]}
      />
      <Navbar locale="en" />
      <main>
        <section className="relative">
          <div className="relative h-[40svh] min-h-[260px]">
            <Image
              src="/images/gemini-generated-image-rq969urq969urq96.jpeg"
              alt="A sea turtle swimming in the clear blue water of Miyakojima"
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/30" />
          </div>
          <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 -mt-20 relative z-10">
            <div className="bg-white rounded-3xl shadow-lg ring-1 ring-emerald-100 p-6 sm:p-8">
              <p className="text-emerald-600 font-semibold text-xs tracking-widest uppercase mb-2">Sea Turtle Guide</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{EN_GUIDE.heroTitle}</h1>
              <p className="mt-3 text-gray-600 text-sm sm:text-base leading-relaxed">{EN_GUIDE.heroSubtitle}</p>
            </div>
          </div>
        </section>

        <article className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 py-12">
          <div className="space-y-10">
            {EN_GUIDE.sections.map((section) => (
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
            <h2 className="text-xl font-bold text-gray-900 mb-3">Ready to meet the turtles?</h2>
            <p className="text-gray-600 text-sm mb-6">
              Small-group tours from ¥8,500 with free photos & videos. Free cancellation until the day before.
            </p>
            <TrackedCta
              event="book_cta_click"
              eventProps={{ location: "en_pillar" }}
              href="/en/book"
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-3.5 rounded-full shadow-lg transition-all"
            >
              <CalendarCheck className="w-5 h-5" />
              Check Availability & Book
            </TrackedCta>
          </div>
        </article>
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </div>
  )
}
