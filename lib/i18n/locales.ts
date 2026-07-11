// 多言語サイトのロケール定義。日本語がベースで、英語・韓国語・繁体字中国語（台湾向け）が翻訳版。
// URLは /en /ko /zh-tw のプレフィックス方式（日本語はプレフィックスなし＝既存URL据え置き）。

export const INTL_LOCALES = ["en", "ko", "zh-tw"] as const
export type IntlLocale = (typeof INTL_LOCALES)[number]
export type Locale = "ja" | IntlLocale

export function isIntlLocale(value: unknown): value is IntlLocale {
  return typeof value === "string" && (INTL_LOCALES as readonly string[]).includes(value)
}

/** 日本語パス（"/faq" や "/"）から各ロケールのURLパスを組み立てる */
export function localePath(locale: Locale, jaPath: string): string {
  if (locale === "ja") return jaPath
  return `/${locale}${jaPath === "/" ? "" : jaPath}`
}

/** <html lang> と hreflang に使う言語タグ。台湾向けは繁体字を表す zh-Hant */
export const LOCALE_LANG_TAGS: Record<Locale, string> = {
  ja: "ja",
  en: "en",
  ko: "ko",
  "zh-tw": "zh-Hant",
}

/** OGP の og:locale */
export const LOCALE_OG_TAGS: Record<Locale, string> = {
  ja: "ja_JP",
  en: "en_US",
  ko: "ko_KR",
  "zh-tw": "zh_TW",
}

/** 予約の specialRequests 先頭に付ける識別子（スタッフが何語のお客様か判別する） */
export const LOCALE_BOOKING_TAGS: Record<IntlLocale, string> = {
  en: "[EN booking]",
  ko: "[KO booking]",
  "zh-tw": "[TW booking]",
}
