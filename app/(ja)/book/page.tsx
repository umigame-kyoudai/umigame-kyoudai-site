import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { createMetadata } from "@/lib/seo"

export const metadata: Metadata = {
  ...createMetadata({
    title: "ご予約",
    description: "海亀兄弟のツアー予約ページ。ウミガメシュノーケル、【貸切】ウミガメシュノーケルツアー、ナイトツアー、サンセットSUP、ドローンSUP。前日までキャンセル無料。",
    path: "/book",
    locale: "ja",
    altLocalePath: "/en/book",
  }),
  robots: { index: false, follow: true },
}
import { Suspense } from "react"
import { MobileCTA } from "@/components/mobile-cta"
import { BubbleBackground } from "@/components/bubble-background"
import { BookingForm } from "@/components/booking-form"
import { BookingFormSkeleton } from "@/components/booking-form-skeleton"
import { Footer } from "@/components/footer"
import { LiffProvider } from "@/components/liff-provider"
import { Toaster } from "sonner"

export default function BookPage() {
  return (
    <div className="min-h-screen">
      <BubbleBackground />
      <Navbar />

      <main className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-4 text-balance">仮予約フォーム</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto text-pretty">
              お客様の情報を入力して、素晴らしいマリン体験をご予約ください。 料金は自動計算されます。
            </p>
          </div>

          {/* BookingForm は useSearchParams を使うため個別の Suspense で包む */}
          <LiffProvider>
            <Suspense fallback={<BookingFormSkeleton />}>
              <BookingForm />
            </Suspense>
            <Toaster position="top-center" richColors />
          </LiffProvider>
        </div>
      </main>

      <Footer />
      <MobileCTA />
    </div>
  )
}
