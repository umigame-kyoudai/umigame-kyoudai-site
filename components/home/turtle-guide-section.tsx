import Link from "next/link"
import { MapPin, ArrowRight } from "lucide-react"

// トップページ中盤の「宮古島 ウミガメ シュノーケル」訴求＋新ピラーページ(/miyakojima-sea-turtle)への導線カード
export function TurtleGuideSection() {
  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 px-6 py-8 sm:px-10 sm:py-10 shadow-lg">
          <div className="relative z-10 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div className="text-white">
              <p className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs sm:text-sm font-semibold mb-3">
                <MapPin className="w-4 h-4" />
                宮古島でウミガメと泳ぐシュノーケリングツアー
              </p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 text-balance">
                宮古島でウミガメに会える場所・時期を知りたい方へ
              </h2>
              <p className="text-white/90 leading-relaxed text-sm sm:text-base max-w-2xl text-pretty">
                ウミガメに会いやすいビーチ、時期、時間帯、個人で行く場合の注意点をまとめました。初めて宮古島でシュノーケリングする方は、予約前にご確認ください。
              </p>
            </div>
            <div className="mt-6 sm:mt-0 shrink-0">
              <Link
                href="/miyakojima-sea-turtle"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-white text-emerald-700 font-bold px-6 py-3.5 rounded-full shadow-lg hover:bg-emerald-50 transition-all active:scale-95"
              >
                ウミガメに会える場所を見る
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
