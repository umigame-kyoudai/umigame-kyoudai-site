import type { Metadata } from "next"
import { SiteRootLayout } from "@/components/site-root-layout"
import { ZH_TW_DICT } from "@/lib/i18n/zh-tw"
import { createMetadata, SITE_URL } from "@/lib/seo"
import "../globals.css"

// 日本語ルートの title template を継承させず、繁体字のサイト名で完結させる。
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...createMetadata({
    title: ZH_TW_DICT.home.metaTitle,
    description: ZH_TW_DICT.home.metaDescription,
    path: "/zh-tw",
    locale: "zh-tw",
    intlBasePath: "/",
  }),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export default function TraditionalChineseRootLayout({ children }: { children: React.ReactNode }) {
  return <SiteRootLayout lang="zh-Hant">{children}</SiteRootLayout>
}
