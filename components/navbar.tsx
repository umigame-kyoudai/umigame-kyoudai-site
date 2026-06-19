"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X, MessageSquare, Globe } from "lucide-react"

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

// 英語版はギャラリー・スタッフ・ブログ（日本語のみ）を含めない
const NAV_ITEMS_EN = [
  { href: "/en", label: "Home" },
  { href: "/en/plans", label: "Tours" },
  { href: "/en/miyakojima-sea-turtle", label: "Sea Turtle Guide" },
  { href: "/en/faq", label: "FAQ" },
] as const

const NAV_LABELS = {
  ja: {
    line: "LINEで質問",
    book: "今すぐ予約",
    menuAria: "メニュー",
    homeHref: "/",
    bookHref: "/book",
    switchHref: "/en",
    switchLabel: "English",
    switchShort: "EN",
  },
  en: {
    line: "Ask on LINE",
    book: "Book Now",
    menuAria: "Menu",
    homeHref: "/en",
    bookHref: "/en/book",
    switchHref: "/",
    switchLabel: "日本語",
    switchShort: "日本語",
  },
} as const

export default function Navbar({ locale = "ja" }: { locale?: "ja" | "en" }) {
  const [isOpen, setIsOpen] = useState(false)
  const navItems = locale === "en" ? NAV_ITEMS_EN : NAV_ITEMS_JA
  const t = NAV_LABELS[locale]

  const handleLineClick = () => window.open(LINE_URL, "_blank", "noopener,noreferrer")
  const closeMenu = () => setIsOpen(false)

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-emerald-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={t.homeHref} className="flex items-center min-w-0 flex-shrink-0">
            <Image
              src="/images/sea-turtle-brothers-logo.png"
              alt={locale === "en" ? "Sea Turtle Brothers" : "海亀兄弟"}
              width={1276}
              height={903}
              priority
              className="h-9 w-auto sm:h-11"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-5 lg:space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-700 hover:text-emerald-600 transition-colors font-medium"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href={t.switchHref}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {t.switchLabel}
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="border-green-200 text-green-700 hover:bg-green-50 bg-transparent"
              onClick={handleLineClick}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {t.line}
            </Button>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6">
              <Link href={t.bookHref}>{t.book}</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex-shrink-0 ml-2 flex items-center gap-1">
            <Link
              href={t.switchHref}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-gray-500 hover:text-emerald-600 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {t.switchShort}
            </Link>
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
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white/95 backdrop-blur-xl rounded-lg mt-2 border border-emerald-100">
              {navItems.map((item) => (
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
                  <Link href={t.bookHref}>{t.book}</Link>
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
