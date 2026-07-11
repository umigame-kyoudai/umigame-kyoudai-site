import type { Metadata } from "next"
import { SiteRootLayout } from "@/components/site-root-layout"
import { KO_DICT } from "@/lib/i18n/ko"
import { createMetadata, SITE_URL } from "@/lib/seo"
import "../globals.css"

// 日本語ルートの title template を継承させず、韓国語のサイト名で完結させる。
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...createMetadata({
    title: KO_DICT.home.metaTitle,
    description: KO_DICT.home.metaDescription,
    path: "/ko",
    locale: "ko",
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

export default function KoreanRootLayout({ children }: { children: React.ReactNode }) {
  return <SiteRootLayout lang="ko">{children}</SiteRootLayout>
}
