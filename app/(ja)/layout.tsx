import type { Metadata } from "next"
import { SiteRootLayout } from "@/components/site-root-layout"
import "../globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://www.umigamekyoudaimiyakojima.com"),
  title: {
    default: "宮古島ウミガメシュノーケル｜写真無料・初心者OK｜海亀兄弟",
    template: "%s | 海亀兄弟 - 宮古島",
  },
  description:
    "宮古島でウミガメと泳ぐシュノーケルツアー。初心者・5歳のお子様連れも安心の少人数制。写真・動画データ無料、前日までキャンセル無料。海亀兄弟が宮古島の海を安全にご案内します。",
  alternates: {
    canonical: "/",
    languages: {
      ja: "/",
      en: "/en",
      "x-default": "/",
    },
  },
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
  openGraph: {
    title: "宮古島でウミガメと泳ぐシュノーケルツアー｜海亀兄弟",
    description:
      "宮古島でウミガメと泳ぐ少人数制シュノーケルツアー。初心者・お子様連れも安心、写真・動画データ無料、前日までキャンセル無料。",
    url: "https://www.umigamekyoudaimiyakojima.com",
    siteName: "海亀兄弟",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/images/og-home.jpg",
        width: 1200,
        height: 630,
        alt: "宮古島でウミガメと泳ぐシュノーケリングツアーの様子",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "宮古島でウミガメと泳ぐシュノーケルツアー｜海亀兄弟",
    description:
      "宮古島でウミガメと泳ぐ少人数制シュノーケルツアー。初心者・お子様連れも安心、写真・動画データ無料。",
    images: ["/images/og-home.jpg"],
  },
}

export default function JapaneseRootLayout({ children }: { children: React.ReactNode }) {
  return <SiteRootLayout lang="ja">{children}</SiteRootLayout>
}
