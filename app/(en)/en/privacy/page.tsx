import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BreadcrumbJsonLd } from "@/components/json-ld"
import { createMetadata, SITE_URL } from "@/lib/seo"
import { EN_PRIVACY } from "@/lib/i18n/en"

export const metadata: Metadata = createMetadata({
  title: EN_PRIVACY.metaTitle,
  description: EN_PRIVACY.metaDescription,
  path: "/en/privacy",
  locale: "en",
  altLocalePath: "/privacy",
})

export default function EnglishPrivacyPage() {
  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: `${SITE_URL}/en` },
          { name: "Privacy Policy", url: `${SITE_URL}/en/privacy` },
        ]}
      />
      <Navbar locale="en" />
      <main>
        <section className="px-5 sm:px-6 lg:px-8 pt-24 pb-16 sm:pt-28 max-w-3xl mx-auto">
          <p className="text-emerald-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-2">Legal</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{EN_PRIVACY.heroTitle}</h1>
          <p className="text-gray-600 text-sm sm:text-base mb-8">{EN_PRIVACY.heroSubtitle}</p>
          <div className="space-y-8">
            {EN_PRIVACY.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{section.heading}</h2>
                <div className="text-gray-600 text-sm sm:text-base leading-relaxed space-y-2">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 40)}>{p}</p>
                  ))}
                  {section.bullets && (
                    <ul className="list-disc pl-5 space-y-1">
                      {section.bullets.map((b) => (
                        <li key={b.slice(0, 40)}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>
        </section>
      </main>
      <Footer locale="en" />
    </div>
  )
}
