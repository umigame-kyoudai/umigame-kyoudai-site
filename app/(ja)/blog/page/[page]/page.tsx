import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BlogIndexClient } from "@/components/blog/blog-index-client"
import {
  getBlogCategories,
  getBlogPageCount,
  getBlogPostSummaries,
} from "@/lib/blog"
import { createMetadata } from "@/lib/seo"

export const dynamicParams = false

export function generateStaticParams() {
  return Array.from({ length: Math.max(0, getBlogPageCount() - 1) }, (_, index) => ({
    page: String(index + 2),
  }))
}

export function generateMetadata({ params }: { params: { page: string } }): Metadata {
  const page = Number(params.page)

  if (!Number.isInteger(page) || page < 2 || page > getBlogPageCount()) {
    return {}
  }

  return createMetadata({
    title: `ブログ ${page}ページ目 | 海亀兄弟 - 宮古島`,
    description: `海亀兄弟の宮古島ブログ ${page}ページ目。ウミガメ、シュノーケル、観光、グルメなどの現地情報を紹介します。`,
    path: `/blog/page/${page}`,
    image: "/images/hero-aerial-ocean.jpg",
  })
}

export default function PaginatedBlogPage({ params }: { params: { page: string } }) {
  const page = Number(params.page)
  const totalPages = getBlogPageCount()

  if (!Number.isInteger(page) || page < 2 || page > totalPages) {
    notFound()
  }

  return (
    <BlogIndexClient
      posts={getBlogPostSummaries()}
      categories={getBlogCategories()}
      currentPage={page}
    />
  )
}
