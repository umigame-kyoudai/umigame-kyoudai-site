import type { Metadata } from "next"

export const SITE_URL = "https://www.umigamekyoudaimiyakojima.com"
export const SITE_NAME = "海亀兄弟"
export const SITE_DESCRIPTION = "宮古島で家族向け少人数制マリン体験なら海亀兄弟。ウミガメシュノーケル、貸切ツアー、ナイトツアー、サンセットSUP、ドローンSUPなど。安全管理徹底、写真・動画無料、前日キャンセル無料。"

// OGP/SNS共有用画像。LINE等のリンクプレビュー互換のため jpeg を使用。
// 実寸1200x630（宣言サイズと一致させるため専用に切り出したもの）。
export const OG_IMAGE = `${SITE_URL}/images/og-home.jpg`

export function createMetadata({
  title,
  description,
  path = "",
  image,
  type = "website",
  locale = "ja",
  altLocalePath,
}: {
  title: string
  description: string
  path?: string
  image?: string
  type?: "website" | "article"
  /** このページ自身の言語 */
  locale?: "ja" | "en"
  /** もう一方の言語の対応ページパス（あれば hreflang を相互リンク） */
  altLocalePath?: string
}): Metadata {
  const url = `${SITE_URL}${path}`
  const ogImage = image
    ? image.startsWith("http")
      ? image
      : `${SITE_URL}${image.startsWith("/") ? image : `/${image}`}`
    : OG_IMAGE

  // hreflang: 日本語を x-default とする（主要市場が日本のため）
  const languages =
    altLocalePath !== undefined
      ? locale === "ja"
        ? {
            ja: url,
            en: `${SITE_URL}${altLocalePath}`,
            "x-default": url,
          }
        : {
            ja: `${SITE_URL}${altLocalePath}`,
            en: url,
            "x-default": `${SITE_URL}${altLocalePath}`,
          }
      : undefined

  return {
    title,
    description,
    alternates: {
      canonical: url,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      title,
      description,
      url,
      siteName: locale === "en" ? "Sea Turtle Brothers" : SITE_NAME,
      locale: locale === "en" ? "en_US" : "ja_JP",
      type,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  }
}
