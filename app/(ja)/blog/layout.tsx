import type { Metadata } from "next"
import { createMetadata } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "ブログ",
  description: "宮古島の海・ウミガメ・アクティビティ情報を発信。家族旅行のモデルコースや季節ごとのおすすめ情報も。",
  path: "/blog",
  image: "/images/hero-aerial-ocean.jpg",
})

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
