"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X, MessageSquare, Globe, ChevronDown } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import type { Locale } from "@/lib/i18n/locales"
import type { IntlUiCopy } from "@/lib/i18n/types"

const LINE_URL = "https://lin.ee/jfp4laz"

const NAV_ITEMS_JA = [
  { href: "/", label: "ホーム" },
  { href: "/plans", label: "プラン" },
  { href: "/staff", label: "スタッフ" },
  { href: "/gallery", label: "ギャラリー" },
  { href: "/blog", label: "ブログ" },
  { href: "/miyakojima-sea-turtle", label: "ウミガメガイド" },
  { href: "/faq", label: "よくある質問" },
] as const

const JA_NAV: IntlUiCopy["nav"] = {
  items: NAV_ITEMS_JA,
  line: "LINEで質問",
  book: "今すぐ予約",
  menuAria: "メニュー",
  homeHref: "/",
  bookHref: "/book",
}

// nav prop を渡し忘れた英語ページ向けのフォールバック（通常はテンプレートが辞書から渡す）
const EN_NAV_FALLBACK: IntlUiCopy["nav"] = {
  items: [
    { href: "/en", label: "Home" },
    { href: "/en/plans", label: "Tours" },
    { href: "/en/miyakojima-sea-turtle", label: "Sea Turtle Guide" },
    { href: "/en/faq", label: "FAQ" },
  ],
  line: "Ask on LINE",
  book: "Book Now",
  menuAria: "Menu",
  homeHref: "/en",
  bookHref: "/en/book",
}

// 言語スイッチャー。各言語名はその言語自身の表記（言語に依存しないためここに直書き）
const LANGUAGES: Array<{ locale: Locale; label: string; href: string }> = [
  { locale: "ja", label: "日本語", href: "/" },
  { locale: "en", label: "English", href: "/en" },
  { locale: "ko", label: "한국어", href: "/ko" },
  { locale: "zh-tw", label: "繁體中文", href: "/zh-tw" },
]

export default function Navbar({
  locale = "ja",
  nav,
}: {
  locale?: Locale
  nav?: IntlUiCopy["nav"]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const t = nav ?? (locale === "ja" ? JA_NAV : EN_NAV_FALLBACK)
  const currentLang = LANGUAGES.find((l) => l.locale === locale) ?? LANGUAGES[0]

  const handleLineClick = () => {
    trackEvent("line_click", { location: "navbar" })
    window.open(LINE_URL, "_blank", "noopener,noreferrer")
  }
  const handleBookClick = () => trackEvent("book_cta_click", { location: "navbar" })
  const closeMenu = () => setIsOpen(false)

  const langMenu = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setLangOpen((v) => !v)}
        aria-expanded={langOpen}
        aria-haspopup="true"
        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm font-semibold text-gray-500 hover:text-emerald-600 transition-colors"
      >
        <Globe className="w-4 h-4" />
        {currentLang.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langOpen ? "rotate-180" : ""}`} />
      </button>
      {langOpen && (
        <div className="absolute right-0 top-full mt-1 min-w-[10rem] rounded-xl border border-emerald-100 bg-white shadow-lg py-1 z-50">
          {LANGUAGES.map((lang) => (
            <Link
              key={lang.locale}
              href={lang.href}
              onClick={() => setLangOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                lang.locale === locale
                  ? "font-bold text-emerald-700 bg-emerald-50"
                  : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              {lang.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-emerald-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={t.homeHref} className="flex items-center min-w-0 flex-shrink-0">
            <Image
              src="/images/sea-turtle-brothers-logo.png"
              alt={locale === "ja" ? "海亀兄弟" : "Sea Turtle Brothers"}
              // 表示は高さ36-44px。元画像の実寸(1276x903)を渡すと1920px幅の
              // 画像が全ページで配信されるため、表示上限に合わせた寸法にする。
              width={124}
              height={88}
              priority
              className="h-9 w-auto sm:h-11"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center gap-4 2xl:gap-7">
            {t.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap text-sm 2xl:text-base text-gray-700 hover:text-emerald-600 transition-colors font-medium"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden xl:flex items-center gap-3">
            {langMenu}
            <Button
              variant="outline"
              size="sm"
              className="border-green-200 text-green-700 hover:bg-green-50 bg-transparent"
              onClick={handleLineClick}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {t.line}
            </Button>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 2xl:px-6">
              <Link href={t.bookHref} onClick={handleBookClick}>{t.book}</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="xl:hidden flex-shrink-0 ml-2 flex items-center gap-1">
            {langMenu}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={t.menuAria}
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isOpen && (
          <div className="xl:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white/95 backdrop-blur-xl rounded-lg mt-2 border border-emerald-100">
              {t.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              ))}

              {/* Mobile CTA Buttons */}
              <div className="pt-2 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-green-200 text-green-700 hover:bg-green-50 bg-transparent"
                  onClick={handleLineClick}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t.line}
                </Button>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                  <Link href={t.bookHref} onClick={handleBookClick}>{t.book}</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export { Navbar }
