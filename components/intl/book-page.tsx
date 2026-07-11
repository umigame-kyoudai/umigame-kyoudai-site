// 多言語版予約ページのテンプレート。元は app/(en)/en/book/page.tsx。

import type { Metadata } from "next"
import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MobileCTA } from "@/components/mobile-cta"
import { BookingFormSkeleton } from "@/components/booking-form-skeleton"
import { LiffProvider } from "@/components/liff-provider"
import { createMetadata } from "@/lib/seo"
import { getDict } from "@/lib/i18n/dict"
import { type IntlLocale, localePath } from "@/lib/i18n/locales"
import { Toaster } from "sonner"

export function intlBookMetadata(locale: IntlLocale): Metadata {
  const dict = getDict(locale)
  return {
    ...createMetadata({
      title: dict.common.bookMetaTitle,
      description: dict.common.bookMetaDescription,
      path: localePath(locale, "/book"),
      locale,
      intlBasePath: "/book",
    }),
    robots: { index: false, follow: true },
  }
}

// form には各ロケール専用のフォームラッパー（BookingFormEn / BookingFormKo / BookingFormZhTw）を渡す。
// 共通テンプレートが3ラッパー全部を import すると全言語の辞書が各ページのバンドルに入るため、
// ページ側で自ロケールのフォームだけを import して注入する。
export function IntlBookPage({ locale, form }: { locale: IntlLocale; form: React.ReactNode }) {
  const dict = getDict(locale)
  const { common } = dict

  return (
    <div className="min-h-screen">
      <Navbar locale={locale} nav={dict.ui.nav} />
      <main className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-bold text-emerald-800 mb-4">{common.bookTitle}</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {common.bookIntro}
              <strong>{common.bookIntroStrong}</strong>
            </p>
          </div>

          {/* フォームは useSearchParams を使うため個別の Suspense で包む */}
          <LiffProvider>
            <Suspense fallback={<BookingFormSkeleton locale={locale} />}>
              {form}
            </Suspense>
            <Toaster position="top-center" richColors />
          </LiffProvider>
        </div>
      </main>
      <Footer locale={locale} />
      <MobileCTA locale={locale} cta={dict.ui.mobileCta} />
    </div>
  )
}
