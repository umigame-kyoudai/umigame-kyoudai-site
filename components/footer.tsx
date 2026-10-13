import Link from "next/link"
import Image from "next/image"
import { Phone, MessageSquare, MapPin, Clock } from "lucide-react"
import { getDict } from "@/lib/i18n/dict"
import type { Locale } from "@/lib/i18n/locales"
import { TrackedCta, TrackedTel } from "@/components/tracked-cta"
import { SITE_CONFIG, formatBusinessHours } from "@/lib/site-config"

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
  openYearRound: "年中無休",
  hoursNote: "※天候により変更の場合があります",
  lineLabel: "LINE公式アカウント",
  officeLabel: "事務所所在地（来店受付・集合場所ではありません）",
  meetingNote: "ツアーは現地集合・現地解散です。海のツアーは前日、ナイトツアーは当日に、集合場所をLINEでご案内します。送迎は行っていません。",
  logoAlt: "海亀兄弟 SEA TURTLE BROTHERS EST. 2024",
  copyright: "海亀兄弟. All rights reserved.",
} as const

export function Footer({ locale = "ja" }: { locale?: Locale }) {
  // 案内文は各ロケールの辞書、連絡先と営業時間は SITE_CONFIG を参照する。
  const dictFooter = locale !== "ja" ? getDict(locale).ui.footer : null
  const intl = dictFooter !== null
  const t = dictFooter ?? JA
  const quickLinks = dictFooter ? dictFooter.quickLinks : QUICK_LINKS_JA
  const legalLinks = dictFooter ? dictFooter.legalLinks : LEGAL_LINKS_JA
  const address = { ja: SITE_CONFIG.address.formattedJa, en: SITE_CONFIG.address.formattedEn, ko: SITE_CONFIG.address.formattedKo, "zh-tw": SITE_CONFIG.address.formattedZhTw }[locale]

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
                <TrackedTel href={`tel:${SITE_CONFIG.phone}`} location="footer" className="hover:text-white transition-colors">
                  {intl ? SITE_CONFIG.phoneDisplayIntl : SITE_CONFIG.phoneDisplayJa}
                </TrackedTel>
              </div>
              <div className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                <TrackedCta event="line_click" eventProps={{ location: "footer" }} href={SITE_CONFIG.lineUrl} external className="hover:text-white transition-colors">
                  {t.lineLabel}
                </TrackedCta>
              </div>
              <div className="flex items-start">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium">{t.officeLabel}</p>
                  <p>{address}</p>
                  <p className="mt-2 max-w-md leading-relaxed">{t.meetingNote}</p>
                </div>
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
                <span className="text-sm">{formatBusinessHours(locale)}</span>
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
