import type { MetadataRoute } from "next"
import { BLOG_POSTS } from "@/lib/data"
import { PLAN_DETAILS } from "@/lib/plan-details"
import { EN_PLAN_BY_ID } from "@/lib/i18n/en"

const SITE_URL = "https://www.umigamekyoudaimiyakojima.com"

// 静的ページ・プランの最終更新日。new Date() だと毎ビルドで全URLが「今日」になり
// 鮮度シグナルとして信頼されにくいため、内容更新時に手動で更新する固定日を使う。
// 2026-06-13: 全ページのプリレンダー復活・法的ページ新設・ナビ/フッター変更のため全面更新
const CONTENT_LAST_UPDATED = new Date("2026-06-13")

export default function sitemap(): MetadataRoute.Sitemap {
  // /blog 一覧の更新日は最新記事の日付から導出（記事追加で自動更新）。
  const blogDates = BLOG_POSTS
    .filter((post) => post && typeof post === "object" && post.id)
    .map((post) => new Date(post.date || post.publishedAt).getTime())
  const blogIndexUpdated = blogDates.length
    ? new Date(Math.max(...blogDates))
    : CONTENT_LAST_UPDATED

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "weekly", priority: 1.0 },
    // 非指名「宮古島 ウミガメ」系の受け皿となるピラーページ
    { url: `${SITE_URL}/miyakojima-sea-turtle`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "monthly", priority: 0.9 },
    // プラン一覧ハブ（各 /plans/[id] への内部リンク集約点）
    { url: `${SITE_URL}/plans`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    // /book は noindex のため検索流入対象外。サイトマップには含めない。
    { url: `${SITE_URL}/gallery`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/staff`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/faq`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/blog`, lastModified: blogIndexUpdated, changeFrequency: "weekly", priority: 0.7 },
    // 法的ページ（信頼性シグナル。検索流入は想定しないため低priority）
    { url: `${SITE_URL}/terms`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/tokushoho`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "yearly", priority: 0.3 },
    // 英語版（/en配下）。/en/book はnoindexのため含めない
    { url: `${SITE_URL}/en`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/en/plans`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/en/miyakojima-sea-turtle`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/en/faq`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/en/terms`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/en/privacy`, lastModified: CONTENT_LAST_UPDATED, changeFrequency: "yearly", priority: 0.2 },
  ]

  const planPages: MetadataRoute.Sitemap = Object.keys(PLAN_DETAILS).map((id) => ({
    url: `${SITE_URL}/plans/${id}`,
    lastModified: CONTENT_LAST_UPDATED,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  // 英語版プラン詳細。英語ページが存在する（EN_PLAN_BY_ID にある）IDのみ。
  // C1（複合プラン）は日本語限定のため /en/plans/C1 は生成されず、ここから除外する。
  const enPlanPages: MetadataRoute.Sitemap = Object.keys(PLAN_DETAILS)
    .filter((id) => EN_PLAN_BY_ID[id])
    .map((id) => ({
      url: `${SITE_URL}/en/plans/${id}`,
      lastModified: CONTENT_LAST_UPDATED,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }))

  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS
    .filter((post) => post && typeof post === "object" && post.id)
    .map((post) => ({
      url: `${SITE_URL}/blog/${post.id}`,
      lastModified: new Date(post.date || post.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }))

  return [...staticPages, ...planPages, ...enPlanPages, ...blogPages]
}
