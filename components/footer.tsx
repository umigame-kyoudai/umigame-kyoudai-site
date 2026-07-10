import Link from "next/link"
import Image from "next/image"
import { Phone, MessageSquare, MapPin, Clock } from "lucide-react"
import { EN_UI } from "@/lib/i18n/en"
import { TrackedCta, TrackedTel } from "@/components/tracked-cta"

const CONTACT_INFO = {
  phone: "08053442439",
  phoneDisplay: "080-5344-2439",
  phoneDisplayEn: "+81-80-5344-2439",
  lineUrl: "https://lin.ee/jfp4laz",
  address: "〒906-0014 沖縄県宮古島市平良松原107-1",
  addressEn: "107-1 Hirara Matsubara, Miyakojima City, Okinawa 906-0014, Japan",
} as const

const QUICK_LINKS_JA = [
  { href: "/", label: "ホーム" },
  { href: "/plans", label: "ツアープラン一覧" },
  { href: "/book", label: "ご予約" },
  { href: "/miyakojima-sea-turtle", label: "宮古島ウミガメガイド" },
  { href: "/staff", label: "スタッフ紹介" },
  { href: "/gallery", label: "ギャラリー" },
  { href: "/blog", label: "ブログ" },
  { href: "/faq", label: "よくある質問" },
  { href: "/safety", label: "安全への取り組み" },
  { href: "/access", label: "集合場所・アクセス" },
] as const

const LEGAL_LINKS_JA = [
  { href: "/terms", label: "利用規約・キャンセルポリシー" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/tokushoho", label: "特定商取引法に基づく表記" },
] as const

const JA = {
  tagline:
    "家族向け少人数制マリン体験で、安心・誠実・やわらかな高揚感をお届けします。透明度抜群の海で海亀との感動的な出会いを。",
  quickLinksHeading: "クイックリンク",
  businessHoursHeading: "営業時間",
  hours: "7:00 - 18:00",
  openYearRound: "年中無休",
  hoursNote: "※天候により変更の場合があります",
  lineLabel: "LINE公式アカウント",
  logoAlt: "海亀兄弟 SEA TURTLE BROTHERS EST. 2024",
  copyright: "海亀兄弟. All rights reserved.",
} as const

export function Footer({ locale = "ja" }: { locale?: "ja" | "en" }) {
  const en = locale === "en"
  const t = en ? EN_UI.footer : JA
  const quickLinks = en ? EN_UI.footer.quickLinks : QUICK_LINKS_JA
  const legalLinks = en ? EN_UI.footer.legalLinks : LEGAL_LINKS_JA

  return (
    <footer className="bg-emerald-900 text-white py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <Image
              src="/images/sea-turtle-brothers-logo-white.png"
              alt={t.logoAlt}
              width={192}
              height={136}
              className="mb-4 h-auto w-[72px] object-contain sm:w-[84px] md:w-[96px]"
            />
            <p className="text-emerald-100 mb-4 max-w-md">{t.tagline}</p>
            <div className="space-y-2 text-sm text-emerald-200">
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                <TrackedTel href={`tel:${CONTACT_INFO.phone}`} location="footer" className="hover:text-white transition-colors">
                  {en ? CONTACT_INFO.phoneDisplayEn : CONTACT_INFO.phoneDisplay}
                </TrackedTel>
              </div>
              <div className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                <TrackedCta event="line_click" eventProps={{ location: "footer" }} href={CONTACT_INFO.lineUrl} external className="hover:text-white transition-colors">
                  {t.lineLabel}
                </TrackedCta>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{en ? CONTACT_INFO.addressEn : CONTACT_INFO.address}</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t.quickLinksHeading}</h3>
            <ul className="space-y-2 text-emerald-200">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Business Hours */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t.businessHoursHeading}</h3>
            <div className="space-y-2 text-emerald-200">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm">{t.hours}</span>
              </div>
              <p className="text-sm">{t.openYearRound}</p>
              <p className="text-xs text-emerald-300">{t.hoursNote}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-emerald-800 mt-8 pt-8 text-center text-emerald-200">
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4 text-sm">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-sm">© {new Date().getFullYear()} {t.copyright}</p>
        </div>
      </div>
    </footer>
  )
}
