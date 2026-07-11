"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MessageSquare, Calendar } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import type { Locale } from "@/lib/i18n/locales"
import type { IntlUiCopy } from "@/lib/i18n/types"

const JA = { line: "LINE相談", book: "空き確認・予約", bookHref: "/book" } as const

// cta prop を渡し忘れた英語ページ向けのフォールバック（通常はテンプレートが辞書から渡す）。
// クライアントコンポーネントなので辞書全体は import しない（バンドル肥大防止）。
const EN_FALLBACK = { line: "Ask on LINE", book: "Book Now", bookHref: "/en/book" } as const

export function MobileCTA({
  locale = "ja",
  cta,
}: {
  locale?: Locale
  cta?: IntlUiCopy["mobileCta"]
}) {
  const pathname = usePathname()
  const t = cta ?? (locale === "ja" ? JA : EN_FALLBACK)
  const isBookingPage = pathname === t.bookHref

  return (
    <>
      {/* 固定CTA分のスペースをfooter後に確保し、最下部のリンクを隠さない。 */}
      <div
        aria-hidden="true"
        className="h-[calc(4.5rem+env(safe-area-inset-bottom))] bg-emerald-900 md:hidden"
      />
      <div className="fixed bottom-0 left-0 right-0 z-[60] md:hidden">
        <div
          className="bg-white border-t border-emerald-200/50 px-3 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              className={`${isBookingPage ? "w-full" : "min-w-0 flex-1"} h-11 px-2 text-xs min-[380px]:text-sm border-green-300 text-green-700 hover:bg-green-50 bg-white/80 font-semibold`}
              onClick={() => {
                trackEvent("line_click", { location: "mobile_cta" })
                window.open("https://lin.ee/jfp4laz", "_blank", "noopener,noreferrer")
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {t.line}
            </Button>
            {!isBookingPage && (
              <Button
                asChild
                size="lg"
                className="min-w-0 flex-1 h-11 px-2 text-xs min-[380px]:text-sm bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold"
              >
                <Link href={t.bookHref} onClick={() => trackEvent("book_cta_click", { location: "mobile_cta" })}>
                  <Calendar className="w-4 h-4 mr-2" />
                  {t.book}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
