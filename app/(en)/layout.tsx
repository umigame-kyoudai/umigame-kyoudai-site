import type { Metadata } from "next"
import { SiteRootLayout } from "@/components/site-root-layout"
import { EN_HOME } from "@/lib/i18n/en"
import { createMetadata, SITE_URL } from "@/lib/seo"
import "../globals.css"

// 日本語ルートの title template を継承させず、英語のサイト名で完結させる。
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...createMetadata({
    title: EN_HOME.metaTitle,
    description: EN_HOME.metaDescription,
    path: "/en",
    locale: "en",
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

export default function EnglishRootLayout({ children }: { children: React.ReactNode }) {
  return <SiteRootLayout lang="en">{children}</SiteRootLayout>
}
