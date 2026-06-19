import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono, Noto_Serif_JP } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { RouteScrollManager } from "@/components/route-scroll-manager"
import { WebSiteJsonLd, OrganizationJsonLd } from "@/components/json-ld"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })
const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-noto-serif-jp",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://www.umigamekyoudaimiyakojima.com"),
  title: {
    // 非指名クエリ「宮古島ウミガメシュノーケル」を先頭に。CTRフック＋ブランドを末尾に残す。
    default: "宮古島ウミガメシュノーケル｜写真無料・初心者OK｜海亀兄弟",
    template: "%s | 海亀兄弟 - 宮古島",
  },
  description:
    "宮古島でウミガメと泳ぐシュノーケルツアー。初心者・5歳のお子様連れも安心の少人数制。写真・動画データ無料、前日までキャンセル無料。海亀兄弟が宮古島の海を安全にご案内します。",
  alternates: {
    canonical: "/",
    // 英語版トップ（/en）とのhreflang相互リンク。日本語をx-defaultとする
    languages: {
      ja: "/",
      en: "/en",
      "x-default": "/",
    },
  },
  // ファビコン類は app/ 直下の favicon.ico / icon.png / apple-icon.png から
  // Next.js が自動生成するため、ここでは手動指定しない（二重指定を避ける）
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
    description: "宮古島でウミガメと泳ぐ少人数制シュノーケルツアー。初心者・お子様連れも安心、写真・動画データ無料、前日までキャンセル無料。",
    url: "https://www.umigamekyoudaimiyakojima.com",
    siteName: "海亀兄弟",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/images/gemini-generated-image-rq969urq969urq96.jpeg",
        width: 1200,
        height: 630,
        alt: "宮古島でウミガメと泳ぐシュノーケリングツアーの様子",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "宮古島でウミガメと泳ぐシュノーケルツアー｜海亀兄弟",
    description: "宮古島でウミガメと泳ぐ少人数制シュノーケルツアー。初心者・お子様連れも安心、写真・動画データ無料。",
    images: ["/images/gemini-generated-image-rq969urq969urq96.jpeg"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${inter.variable} ${jetbrainsMono.variable} ${notoSerifJP.variable}`} suppressHydrationWarning>
      <head>
        <link key="preconnect-blob" rel="preconnect" href="https://hebbkx1anhila5yf.public.blob.vercel-storage.com" crossOrigin="anonymous" />
        <link key="dns-prefetch-blob" rel="dns-prefetch" href="https://hebbkx1anhila5yf.public.blob.vercel-storage.com" />

        {/*
          画像のpreloadは削除。これらは生ファイル(/images/*.jpg 等・計約3.25MB)を指していたが、
          実際の表示は next/image の最適化URL(/_next/image?url=...)で行われるため、preloadは
          一致せず「全ページで未使用の3.25MBをDLするだけ」の無駄だった。各ページのLCP画像は
          next/image の priority 指定で必要な箇所だけ最適化版を読み込む。
        */}
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* 全ページ共通の構造化データ（サイト名・発行元の事業者）。@id で他schemaから参照される */}
        <WebSiteJsonLd />
        <OrganizationJsonLd />
        {/*
          Suspense は useSearchParams を使う RouteScrollManager だけに限定する。
          以前はツリー全体を <Suspense fallback={null}> で包んでいたため、
          プリレンダー時に全ページの body が空になり、サイト全体が
          クライアントレンダリングに退化していた（LCP・SEOに悪影響）。
        */}
        <Suspense fallback={null}>
          <RouteScrollManager />
        </Suspense>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
