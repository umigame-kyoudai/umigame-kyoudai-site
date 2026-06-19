import type { Metadata } from "next"
import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MobileCTA } from "@/components/mobile-cta"
import { BookingFormEn } from "@/components/booking-form-en"
import { LiffProvider } from "@/components/liff-provider"
import { createMetadata } from "@/lib/seo"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  ...createMetadata({
    title: "Book a Tour | Sea Turtle Brothers Miyakojima",
    description:
      "Send a booking request for sea turtle snorkeling, night tours or sunset SUP in Miyakojima. Free cancellation until the day before. Confirmed via LINE.",
    path: "/en/book",
    locale: "en",
    altLocalePath: "/book",
  }),
  robots: { index: false, follow: true },
}

export default function EnglishBookPage() {
  return (
    <div className="min-h-screen">
      <Navbar locale="en" />
      <main className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-bold text-emerald-800 mb-4">Booking Request</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Fill in your details below — the price is calculated automatically. We'll confirm availability and reply
              via LINE. <strong>Your booking is not final until you hear back from us.</strong>
            </p>
          </div>

          {/* BookingFormEn は useSearchParams を使うため個別の Suspense で包む */}
          <LiffProvider>
            <Suspense fallback={<div className="text-center text-gray-500 py-12">Loading…</div>}>
              <BookingFormEn />
            </Suspense>
            <Toaster position="top-center" richColors />
          </LiffProvider>
        </div>
      </main>
      <Footer locale="en" />
      <MobileCTA locale="en" />
    </div>
  )
}
