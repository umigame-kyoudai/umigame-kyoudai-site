import { localePath, type Locale } from "@/lib/i18n/locales"

// 公開ページのURL正本。メニューの掲載順・表示ラベルは各メニュー側で管理する。
// localized=false のページは日本語のみ。外国語の存在しないURLを生成しない。
export const PAGE_ROUTES = {
  home: { path: "/", localized: true },
  plans: { path: "/plans", localized: true },
  book: { path: "/book", localized: true },
  seaTurtleGuide: { path: "/miyakojima-sea-turtle", localized: true },
  faq: { path: "/faq", localized: true },
  staff: { path: "/staff", localized: false },
  gallery: { path: "/gallery", localized: false },
  blog: { path: "/blog", localized: false },
  safety: { path: "/safety", localized: false },
  access: { path: "/access", localized: false },
  terms: { path: "/terms", localized: true },
  privacy: { path: "/privacy", localized: true },
  tokushoho: { path: "/tokushoho", localized: false },
} as const

export type PageId = keyof typeof PAGE_ROUTES

export function isPageAvailable(locale: Locale, pageId: PageId): boolean {
  return locale === "ja" || PAGE_ROUTES[pageId].localized
}

export function pagePath(locale: Locale, pageId: PageId): string {
  if (!isPageAvailable(locale, pageId)) {
    throw new Error(`Page is not available in this locale: ${locale}/${pageId}`)
  }
  return localePath(locale, PAGE_ROUTES[pageId].path)
}
