import { SITE_CONFIG, formatBusinessHours } from "@/lib/site-config"
import Link from "next/link"
import Image from "next/image"
import { Phone, MessageSquare, MapPin, Clock } from "lucide-react"
import { getDict } from "@/lib/i18n/dict"
import { JA_NAVIGATION_ITEMS, navigationItems } from "@/lib/navigation"
import type { Locale } from "@/lib/i18n/locales"
import { TrackedCta, TrackedTel } from "@/components/tracked-cta"

const LEGAL_LINKS_JA = navigationItems("ja", [
  { pageId: "terms", label: "利用規約・キャンセルポリシー" },
  { pageId: "privacy", label: "プライバシーポリシー" },
  { pageId: "tokushoho", label: "特定商取引法に基づく表記" },
])

const JA = {
  tagline:
    "家族向け少人数制マリン体験で、安心・誠実・やわらかな高揚感をお届けします。透明度抜群の海で海亀との感動的な出会いを。",
  quickLinksHeading: "クイックリンク",
  businessHoursHeading: "営業時間",
  hours: formatBusinessHours("ja"),
  openYearRound: "年中無休",
  hoursNote: "※天候により変更の場合があります",
  lineLabel: "LINE公式アカウント",
  logoAlt: `${SITE_CONFIG.siteNameJa} ${SITE_CONFIG.siteNameEn.toUpperCase()} EST. 2024`,
  copyright: `${SITE_CONFIG.siteNameJa}. All rights reserved.`,
} as const

export function Footer({ locale = "ja" }: { locale?: Locale }) {
  // 日本語以外は各ロケールの辞書から。住所・電話の英語表記は非日本語ロケール共通
  const dictFooter = locale !== "ja" ? getDict(locale).ui.footer : null
  const intl = dictFooter !== null
  const t = dictFooter ?? JA
  const quickLinks = dictFooter ? dictFooter.quickLinks : JA_NAVIGATION_ITEMS
  const legalLinks = dictFooter ? dictFooter.legalLinks : LEGAL_LINKS_JA

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
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{intl ? SITE_CONFIG.address.formattedEn : SITE_CONFIG.address.formattedJa}</span>
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
