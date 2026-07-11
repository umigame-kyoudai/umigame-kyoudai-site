// 多言語版の利用規約・プライバシーポリシー共通テンプレート。
// 元は app/(en)/en/terms/page.tsx と privacy/page.tsx（同一レイアウト）。

import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BreadcrumbJsonLd } from "@/components/json-ld"
import { createMetadata, SITE_URL } from "@/lib/seo"
import { getDict } from "@/lib/i18n/dict"
import { type IntlLocale, localePath } from "@/lib/i18n/locales"

type LegalKind = "terms" | "privacy"

export function intlLegalMetadata(locale: IntlLocale, kind: LegalKind): Metadata {
  const dict = getDict(locale)
  const content = dict[kind]
  return createMetadata({
    title: content.metaTitle,
    description: content.metaDescription,
    path: localePath(locale, `/${kind}`),
    locale,
    intlBasePath: `/${kind}`,
  })
}

export function IntlLegalPage({ locale, kind }: { locale: IntlLocale; kind: LegalKind }) {
  const dict = getDict(locale)
  const { common } = dict
  const content = dict[kind]
  const breadcrumbLabel = kind === "terms" ? common.breadcrumbTerms : common.breadcrumbPrivacy

  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: common.breadcrumbHome, url: `${SITE_URL}${localePath(locale, "/")}` },
          { name: breadcrumbLabel, url: `${SITE_URL}${localePath(locale, `/${kind}`)}` },
        ]}
      />
      <Navbar locale={locale} nav={dict.ui.nav} />
      <main>
        <section className="px-5 sm:px-6 lg:px-8 pt-24 pb-16 sm:pt-28 max-w-3xl mx-auto">
          <p className="text-emerald-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-2">{common.legalEyebrow}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{content.heroTitle}</h1>
          <p className="text-gray-600 text-sm sm:text-base mb-8">{content.heroSubtitle}</p>
          <div className="space-y-8">
            {content.sections.map((section) => (
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
      <Footer locale={locale} />
    </div>
  )
}
