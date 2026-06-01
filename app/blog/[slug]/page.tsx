import BlogPostClient from "./BlogPostClient"
import { notFound } from "next/navigation"
import { BlogPostingJsonLd, BreadcrumbJsonLd } from "@/components/json-ld"
import { getBlogPost, getBlogPostCta, getBlogPostSummaries, getRelatedBlogPostSummaries } from "@/lib/blog"
import { createMetadata, SITE_URL } from "@/lib/seo"

export async function generateStaticParams() {
  return getBlogPostSummaries().map((post) => ({
    slug: post.id,
  }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug)

  if (!post) {
    return {
      title: "記事が見つかりません",
    }
  }

  return createMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${params.slug}`,
    image: post.image,
    type: "article",
  })
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug)

  if (!post) {
    notFound()
  }

  return (
    <>
      <BlogPostingJsonLd post={post} />
      <BreadcrumbJsonLd
        items={[
          { name: "ホーム", url: `${SITE_URL}/` },
          { name: "ブログ", url: `${SITE_URL}/blog` },
          { name: post.title, url: `${SITE_URL}/blog/${post.id}` },
        ]}
      />
      <BlogPostClient post={post} relatedPosts={getRelatedBlogPostSummaries(post)} cta={getBlogPostCta(post)} />
    </>
  )
}
