import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import matter from "gray-matter"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const blogDir = join(root, "content/blog")
const destination = join(root, "lib/blog/generated-posts.ts")

function toDateString(value) {
  if (value == null) return undefined
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

const posts = readdirSync(blogDir)
  .filter((file) => file.endsWith(".md"))
  .sort()
  .map((file) => {
    const { data, content } = matter(readFileSync(join(blogDir, file), "utf8"))
    const id = file.replace(/\.md$/, "")
    const date = toDateString(data.date)
    return {
      id,
      slug: id,
      title: String(data.title ?? ""),
      excerpt: String(data.excerpt ?? ""),
      author: String(data.author ?? "海亀兄弟編集部"),
      publishedAt: toDateString(data.publishedAt) ?? "",
      category: String(data.category ?? "宮古島情報"),
      readTime: Number(data.readTime ?? 5),
      image: String(data.image ?? ""),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      content: content.trim(),
      ...(date ? { date } : {}),
    }
  })

const output = `// Generated from content/blog/*.md. Edit the Markdown, not this file.\nimport type { BlogPost } from "../data"\n\nexport const GENERATED_BLOG_POSTS: BlogPost[] = ${JSON.stringify(posts, null, 2)}\n`
writeFileSync(destination, output)
console.log(`Prepared ${posts.length} blog posts for the application bundle.`)
