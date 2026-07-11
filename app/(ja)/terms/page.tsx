import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BreadcrumbJsonLd } from "@/components/json-ld"
import { createMetadata, SITE_URL } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "利用規約・キャンセルポリシー",
  description:
    "海亀兄弟（宮古島ウミガメシュノーケルツアー）の利用規約とキャンセルポリシー。予約の成立、お支払い、キャンセル料、天候による中止の取り扱いをご確認いただけます。",
  path: "/terms",
  locale: "ja",
  altLocalePath: "/en/terms",
})

const SECTIONS: Array<{ title: string; body: React.ReactNode }> = [
  {
    title: "第1条（適用）",
    body: (
      <p>
        本規約は、海亀兄弟（以下「当店」）が提供するマリンツアー（以下「ツアー」）の予約・参加に関する条件を定めるものです。お客様は、予約フォームの送信をもって本規約に同意したものとみなします。
      </p>
    ),
  },
  {
    title: "第2条（予約の成立）",
    body: (
      <p>
        予約フォームの送信は仮予約です。当店がお客様のLINEまたはお電話に確定のご連絡を差し上げた時点で予約が成立します。予約状況や海況により、ご希望に沿えない場合があります。
      </p>
    ),
  },
  {
    title: "第3条（料金とお支払い）",
    body: (
      <p>
        ツアー料金は各プランページに表示する価格（税込）です。お支払いはツアー当日、現地での現金決済となります。
      </p>
    ),
  },
  {
    title: "第4条（キャンセルポリシー）",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>前日までのキャンセル: 無料</li>
        <li>当日のキャンセル: ツアー料金の100%</li>
        <li>無断キャンセル: ツアー料金の100%</li>
        <li>キャンセル・変更のご連絡はLINEまたはお電話で承ります</li>
      </ul>
    ),
  },
  {
    title: "第5条（天候等による中止）",
    body: (
      <p>
        天候・海況の悪化等により、安全を最優先して当店の判断でツアーを中止する場合があります。この場合、キャンセル料は発生しません。お支払いはツアー当日・現地での現金決済のため、事前のお支払い・返金は発生しません。
      </p>
    ),
  },
  {
    title: "第6条（安全管理・参加条件）",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>ツアー中はガイドの指示に従ってください。指示に従わない場合、安全のため参加を中断していただくことがあります</li>
        <li>飲酒されている方、体調不良の方はご参加いただけません</li>
        <li>持病・妊娠中など健康に不安がある方は、必ず事前にご相談ください</li>
        <li>プランごとの対象年齢・参加条件は各プランページの記載に従います</li>
      </ul>
    ),
  },
  {
    title: "第7条（写真・動画）",
    body: (
      <p>
        ツアー中に当店が撮影した写真・動画は、無料でお客様にお渡しします。お客様が写った写真・動画を当店のウェブサイトやSNS等の広報に使用する場合は、事前にお客様の同意を確認します。
      </p>
    ),
  },
  {
    title: "第8条（免責）",
    body: (
      <p>
        当店は安全管理に最大限努めますが、お客様の故意・過失、規約違反、または不可抗力により生じた損害については、当店に故意または重大な過失がある場合を除き、責任を負いかねます。
      </p>
    ),
  },
  {
    title: "第9条（規約の変更）",
    body: (
      <p>
        本規約は必要に応じて変更することがあります。変更後の規約は本ページに掲載した時点で効力を生じます。
      </p>
    ),
  },
  {
    title: "第10条（準拠法・管轄）",
    body: (
      <p>
        本規約は日本法に準拠し、ツアーに関して紛争が生じた場合は、当店所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
      </p>
    ),
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "ホーム", url: SITE_URL },
          { name: "利用規約・キャンセルポリシー", url: `${SITE_URL}/terms` },
        ]}
      />
      <Navbar />
      <main>
        <section className="px-5 sm:px-6 lg:px-8 pt-24 pb-16 sm:pt-28 max-w-3xl mx-auto">
          <p className="text-emerald-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-2">Legal</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">利用規約・キャンセルポリシー</h1>
          <p className="text-gray-600 text-sm sm:text-base mb-8">
            個人情報の取り扱いについては
            <Link href="/privacy" className="text-emerald-700 underline">
              プライバシーポリシー
            </Link>
            を、事業者情報は
            <Link href="/tokushoho" className="text-emerald-700 underline">
              特定商取引法に基づく表記
            </Link>
            をご覧ください。
          </p>
          <div className="space-y-8">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h2>
                <div className="text-gray-600 text-sm sm:text-base leading-relaxed">{section.body}</div>
              </section>
            ))}
          </div>
          <p className="mt-10 text-xs text-gray-500">制定日: 2026年6月13日</p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
