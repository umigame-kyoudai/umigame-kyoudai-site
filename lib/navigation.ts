import { pagePath, type PageId } from "@/lib/routes"
import type { IntlLocale, Locale } from "@/lib/i18n/locales"
import type { IntlUiCopy } from "@/lib/i18n/types"

/** 各メニューはページID・表示ラベル・順序だけを指定し、URLは共通定義から取得する。 */
export function navigationItems(locale: Locale, items: readonly { pageId: PageId; label: string }[]) {
  return items.map(({ pageId, label }) => ({ href: pagePath(locale, pageId), label }))
}

// 日本語モバイルとFooterの10項目は同じ配列を共有する。
export const JA_NAVIGATION_ITEMS = navigationItems("ja", [
  { pageId: "home", label: "ホーム" },
  { pageId: "plans", label: "ツアープラン一覧" },
  { pageId: "book", label: "ご予約" },
  { pageId: "seaTurtleGuide", label: "宮古島ウミガメガイド" },
  { pageId: "staff", label: "スタッフ紹介" },
  { pageId: "gallery", label: "ギャラリー" },
  { pageId: "blog", label: "ブログ" },
  { pageId: "faq", label: "よくある質問" },
  { pageId: "safety", label: "安全への取り組み" },
  { pageId: "access", label: "集合場所・アクセス" },
])

// PCは従来の7項目・短い表記を維持する。
export const JA_DESKTOP_NAVIGATION_ITEMS = navigationItems("ja", [
  { pageId: "home", label: "ホーム" },
  { pageId: "plans", label: "プラン" },
  { pageId: "staff", label: "スタッフ" },
  { pageId: "gallery", label: "ギャラリー" },
  { pageId: "blog", label: "ブログ" },
  { pageId: "seaTurtleGuide", label: "ウミガメガイド" },
  { pageId: "faq", label: "よくある質問" },
])

// 辞書を渡し忘れた場合も英語ラベルで案内できる。URLは指定localeから生成する。
// クライアントNavbarへ辞書全体を取り込まないため、短いfallbackだけを置く。
export function getIntlNavFallback(locale: IntlLocale): IntlUiCopy["nav"] {
  return {
    items: navigationItems(locale, [
      { pageId: "home", label: "Home" },
      { pageId: "plans", label: "Tours" },
      { pageId: "seaTurtleGuide", label: "Sea Turtle Guide" },
      { pageId: "faq", label: "FAQ" },
    ]),
    line: "Ask on LINE",
    book: "Book Now",
    menuAria: "Menu",
    homeHref: pagePath(locale, "home"),
    bookHref: pagePath(locale, "book"),
  }
}
