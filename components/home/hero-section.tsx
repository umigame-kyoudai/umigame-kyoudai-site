import Image from "next/image"
import Link from "next/link"
import { CalendarCheck, Camera, ChevronDown, MapPin, MessageCircle, Shield, Star } from "lucide-react"
import { BLUR_DATA_URLS } from "@/lib/image-placeholders"
import { TrackedCta } from "@/components/tracked-cta"

export function HeroSection() {
  const proofItems = [
    { label: "大人", value: "¥6,500" },
    { label: "子供", value: "¥6,000" },
    { label: "対象", value: "5歳から" },
    { label: "写真", value: "無料" },
  ]

  const trustItems = [
    { icon: Shield, text: "少人数制・保険加入済み" },
    { icon: Camera, text: "写真・動画データ無料" },
    { icon: CalendarCheck, text: "前日までキャンセル無料" },
  ]

  return (
    <section className="relative min-h-[calc(100svh-4rem)] sm:min-h-[88svh] flex flex-col overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/gemini-generated-image-rq969urq969urq96.jpeg"
          alt="宮古島の海亀兄弟 - 2匹のウミガメが一緒に泳ぐ様子"
          fill
          priority
          fetchPriority="high"
          quality={68}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URLS.turtle}
          className="object-cover object-[54%_48%] sm:object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black/70 sm:from-black/50 sm:via-black/20 sm:to-black/70" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-end sm:justify-center px-5 pt-16 pb-28 sm:pt-20 sm:pb-16">
        <div className="max-w-6xl mx-auto w-full">
          <div className="inline-flex items-center gap-2 bg-white/92 backdrop-blur-sm rounded-full px-3 py-1.5 sm:px-3.5 sm:py-2 mb-4 sm:mb-5 shadow-lg">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-gray-900 font-bold text-xs sm:text-sm">宮古島の家族向けマリン体験</span>
          </div>

          <h1 className="max-w-[22rem] sm:max-w-4xl text-[2.65rem] min-[380px]:text-[3rem] sm:text-5xl md:text-7xl font-black text-white mb-4 tracking-normal drop-shadow-2xl leading-[1.05] sm:tracking-tight sm:leading-tight">
            <span className="block">宮古島で</span>
            <span className="block">ウミガメと泳ぐ</span>
            <span className="block text-[1.25rem] min-[380px]:text-[1.45rem] sm:text-3xl md:text-5xl mt-3 text-emerald-100 leading-tight">
              料金も安心も、すぐ分かる
            </span>
          </h1>

          <p className="max-w-[21rem] sm:max-w-2xl text-[15px] sm:text-xl text-white/90 mb-4 sm:mb-6 drop-shadow-md leading-7 sm:leading-relaxed">
            初心者・お子様連れでも迷わず選べる少人数制ツアー。写真・動画無料、前日までキャンセル無料。
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-[22rem] sm:max-w-2xl mb-0 sm:mb-6">
            {proofItems.map((item) => (
              <div key={item.label} className="bg-white/92 backdrop-blur-sm rounded-2xl px-3 py-2.5 sm:rounded-xl sm:py-3 shadow-lg ring-1 ring-white/50">
                <p className="text-[10px] sm:text-[11px] font-semibold text-gray-500 leading-none mb-1">{item.label}</p>
                <p className="text-[1.55rem] sm:text-xl font-black text-emerald-700 leading-none whitespace-nowrap">{item.value}</p>
              </div>
            ))}
          </div>

          {/* モバイル専用：ウミガメガイドへのサブ導線（ヒーロー内） */}
          <div className="sm:hidden mt-4">
            <Link
              href="/miyakojima-sea-turtle"
              className="inline-flex w-full items-center justify-center gap-2 bg-white/15 backdrop-blur-sm hover:bg-white/25 text-white font-bold text-[15px] px-6 py-3 rounded-full border border-white/40 transition-all active:scale-95"
            >
              <MapPin className="w-5 h-5" />
              ウミガメに会える場所を見る
            </Link>
          </div>

          <div className="hidden sm:flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-5">
            <div>
              <TrackedCta
                event="book_cta_click"
                eventProps={{ location: "hero" }}
                href="/book"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base px-7 py-3.5 rounded-full shadow-lg transition-all active:scale-95"
              >
                <CalendarCheck className="w-5 h-5" />
                空き確認・予約する
              </TrackedCta>
            </div>
            <div>
              <TrackedCta
                event="line_click"
                eventProps={{ location: "hero" }}
                href="https://lin.ee/jfp4laz"
                external
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-white/15 backdrop-blur-sm hover:bg-white/25 text-white font-bold text-base px-7 py-3.5 rounded-full border border-white/35 transition-all active:scale-95"
              >
                <MessageCircle className="w-5 h-5" />
                LINEで相談
              </TrackedCta>
            </div>
            <div>
              <Link
                href="/miyakojima-sea-turtle"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-white/15 backdrop-blur-sm hover:bg-white/25 text-white font-bold text-base px-7 py-3.5 rounded-full border border-white/35 transition-all active:scale-95"
              >
                <MapPin className="w-5 h-5" />
                ウミガメに会える場所を見る
              </Link>
            </div>
          </div>

          <div className="hidden md:flex flex-wrap gap-2 text-white/90 text-xs sm:text-sm font-medium">
            {trustItems.map((item) => (
              <span
                key={item.text}
                className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5"
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex-col items-center gap-1.5">
        <span className="text-white/60 text-[10px] tracking-widest uppercase">
          Scroll
        </span>
        <div className="animate-bounce">
          <ChevronDown className="w-5 h-5 text-white/60" />
        </div>
      </div>
    </section>
  )
}
