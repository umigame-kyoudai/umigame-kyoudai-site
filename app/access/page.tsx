import type { Metadata } from "next"
import Link from "next/link"
import { MapPin, Car, Clock, MessageCircle, Check, X } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MobileCTA } from "@/components/mobile-cta"
import { BreadcrumbJsonLd } from "@/components/json-ld"
import { TrackedCta } from "@/components/tracked-cta"
import { createMetadata, SITE_URL } from "@/lib/seo"
import { SNORKEL_BEACHES } from "@/lib/beach-info"

export const metadata: Metadata = createMetadata({
  title: "集合場所・アクセス｜前日案内の理由と各ビーチの設備",
  description:
    "海亀兄弟ツアーの集合場所のご案内。集合場所が前日案内になる理由、候補ビーチ（新城海岸・シギラビーチ等）の駐車場・トイレ・シャワー設備、プラン別の集合時間、レンタカーでのアクセスをまとめました。",
  path: "/access",
  locale: "ja",
})

// プラン別の集合ルール。lib/data.ts の各プラン meetingTime / location と一致させること。
const MEETING_RULES = [
  { plan: "ウミガメシュノーケル（通常・貸切）", when: "開始時刻の15分前", where: "前日までにLINEでご案内（下記の候補ビーチから当日の海況で選定）" },
  { plan: "ナイトツアー（通常・貸切）", when: "開始時刻ちょうど（19:20 / 21:10）", where: "インギャーマリンガーデン付近（正確な集合ポイントは当日LINEでご案内）" },
  { plan: "サンセットSUP", when: "開始15分前（開始時間は日没に合わせて調整）", where: "予約確定時〜前日にLINEでご案内" },
  { plan: "ドローンSUP（通常・貸切）", when: "選んだ開始時間（7:00〜16:00）の15分前 ※海況・水位により前後する場合あり", where: "予約確定時〜前日にLINEでご案内" },
]

function YesNo({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
      <Check className="w-4 h-4" aria-hidden="true" />あり
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-gray-400">
      <X className="w-4 h-4" aria-hidden="true" />なし
    </span>
  )
}

export default function AccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/50 to-white">
      <BreadcrumbJsonLd
        items={[
          { name: "ホーム", url: SITE_URL },
          { name: "集合場所・アクセス", url: `${SITE_URL}/access` },
        ]}
      />
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <p className="text-cyan-600 font-semibold text-xs tracking-widest uppercase mb-2">Access</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">集合場所・アクセス</h1>
        <p className="text-gray-600 leading-relaxed mb-10">
          海亀兄弟のツアーは現地集合・現地解散です。「集合場所がまだ分からないけど大丈夫？」という質問をよくいただくので、前日案内になる理由と、候補ビーチの設備をまとめました。
        </p>

        {/* なぜ前日案内か */}
        <section className="rounded-2xl bg-white border border-cyan-100 shadow-sm p-5 sm:p-6 mb-8">
          <h2 className="flex items-start gap-3 text-lg sm:text-xl font-bold text-gray-900 mb-3">
            <MapPin className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            集合場所が「前日案内」なのはなぜ？
          </h2>
          <div className="text-gray-700 leading-relaxed text-[15px] space-y-2">
            <p>
              宮古島の海は、同じ日でも風向きによってビーチごとのコンディションが大きく変わります。当店は特定のビーチに固定せず、<strong>当日の風向き・波・潮位を見て、その日いちばん穏やかで透明度の高いビーチを選んで</strong>ご案内しています。集合場所の確定が前日になるのは、この安全判断のためです。
            </p>
            <p>
              確定した集合場所は、地図リンク・駐車場の場所とあわせて<strong>LINEでご案内</strong>します。ご不明な点はそのままLINEで質問できるのでご安心ください。
            </p>
          </div>
        </section>

        {/* 候補ビーチの設備 */}
        <section className="mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">候補ビーチの設備（シュノーケルツアー）</h2>
          <p className="text-sm text-gray-500 mb-4">どのビーチになっても慌てないよう、設備の有無を事前にご確認ください。</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SNORKEL_BEACHES.map((beach) => (
              <div key={beach.name} className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4">
                <h3 className="font-bold text-gray-900 mb-2">{beach.name}</h3>
                <dl className="text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">駐車場</dt>
                    <dd className="font-medium text-gray-800">{beach.parking}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">トイレ</dt>
                    <dd><YesNo ok={beach.toilet} /></dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">シャワー</dt>
                    <dd><YesNo ok={beach.shower} /></dd>
                  </div>
                </dl>
                {beach.note && <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">{beach.note}</p>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-500">
            シャワーや更衣室が無いビーチもあるため、<strong>水着を着た状態で集合</strong>し、車内で使えるタオル・着替えのご準備をおすすめします。詳しくは
            <Link href="/blog/miyakojima-snorkeling-outfit-packing" className="text-cyan-700 underline underline-offset-2 font-medium">服装・持ち物ガイド</Link>
            へ。
          </p>
        </section>

        {/* プラン別の集合時間 */}
        <section className="rounded-2xl bg-white border border-cyan-100 shadow-sm p-5 sm:p-6 mb-8">
          <h2 className="flex items-start gap-3 text-lg sm:text-xl font-bold text-gray-900 mb-4">
            <Clock className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            プラン別の集合時間
          </h2>
          <ul className="space-y-3">
            {MEETING_RULES.map((rule) => (
              <li key={rule.plan} className="rounded-xl bg-gray-50 p-3.5">
                <p className="font-bold text-gray-900 text-sm">{rule.plan}</p>
                <p className="text-sm text-gray-700 mt-1">集合: {rule.when}</p>
                <p className="text-sm text-gray-500">場所: {rule.where}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* アクセス手段 */}
        <section className="rounded-2xl bg-white border border-cyan-100 shadow-sm p-5 sm:p-6 mb-10">
          <h2 className="flex items-start gap-3 text-lg sm:text-xl font-bold text-gray-900 mb-3">
            <Car className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            移動はレンタカーがおすすめです
          </h2>
          <div className="text-gray-700 leading-relaxed text-[15px] space-y-2">
            <p>
              ツアーは現地集合・現地解散で、送迎は行っていません。宮古島は路線バスの本数が少なくタクシーもつかまりにくいため、レンタカーでのお越しをおすすめしています。集合場所の駐車場情報は前日のLINE案内に含めてお送りします。
            </p>
            <p className="text-sm text-gray-500">
              レンタカーが初めての方は
              <Link href="/blog/miyakojima-rental-car-beginner-guide" className="text-cyan-700 underline underline-offset-2 font-medium">宮古島レンタカー初心者ガイド</Link>
              も参考にどうぞ。
            </p>
          </div>
        </section>

        <div className="rounded-2xl bg-cyan-600 text-white p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">集合場所の心配は、LINEにおまかせ</h2>
          <p className="text-cyan-50 text-sm mb-5 flex items-center justify-center gap-1.5">
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            予約後は地図と駐車場情報が届くので、当日はナビ通りに向かうだけです。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <TrackedCta
              event="book_cta_click"
              eventProps={{ location: "access" }}
              href="/book"
              className="inline-block bg-white text-cyan-700 font-bold px-6 py-3 rounded-xl hover:bg-cyan-50 transition-colors"
            >
              空き確認・予約する
            </TrackedCta>
            <Link
              href="/safety"
              className="inline-block border border-white/60 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              安全への取り組みを見る
            </Link>
          </div>
        </div>
      </main>

      <Footer />
      <MobileCTA />
    </div>
  )
}
