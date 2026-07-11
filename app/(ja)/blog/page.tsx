import { BlogIndexClient } from "@/components/blog/blog-index-client"
import { getBlogCategories, getBlogPostSummaries } from "@/lib/blog"

export default function BlogPage() {
  return <BlogIndexClient posts={getBlogPostSummaries()} categories={getBlogCategories()} currentPage={1} />
}
