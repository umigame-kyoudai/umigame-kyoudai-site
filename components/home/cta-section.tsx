import Image from "next/image"
import { BLUR_DATA_URLS } from "@/lib/image-placeholders"
import { TrackedCta } from "@/components/tracked-cta"

export function CTASection() {
  return (
    <section className="relative py-16 sm:py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/hero-aerial-ocean.jpg"
          alt="宮古島の海"
          fill
          quality={80}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URLS.ocean}
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-emerald-900/70 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-5">
          宮古島で、忘れられない<br className="hidden sm:block" />思い出を作りませんか？
        </h2>

        <p className="text-lg text-emerald-100 mb-10 max-w-2xl mx-auto">
          ウミガメとの感動的な出会いが、あなたを待っています。
          前日までキャンセル無料だから、気軽にご予約ください。
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <div>
            <TrackedCta
              event="book_cta_click"
              eventProps={{ location: "home_final_cta" }}
              href="/book"
              className="block bg-white text-emerald-700 hover:bg-emerald-50 font-bold text-base px-8 py-3.5 rounded-full shadow-xl transition-all active:scale-95"
            >
              プランを見て予約する
            </TrackedCta>
          </div>
          <div>
            <TrackedCta
              event="line_click"
              eventProps={{ location: "home_final_cta" }}
              href="https://lin.ee/jfp4laz"
              external
              className="block bg-[#06C755] hover:bg-[#05b34d] text-white font-bold text-base px-8 py-3.5 rounded-full shadow-xl transition-all active:scale-95"
            >
              LINEで気軽に相談
            </TrackedCta>
          </div>
        </div>

        <p className="text-emerald-200 text-sm mt-6">
          ※ 前日までキャンセル無料 ・ 天候不良の中止もキャンセル料なし ・ お支払いは当日現地現金決済
        </p>
      </div>
    </section>
  )
}
