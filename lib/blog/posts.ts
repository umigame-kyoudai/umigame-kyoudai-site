import fs from "fs"
import path from "path"
import matter from "gray-matter"
import type { BlogPost } from "@/lib/data"

// ブログ記事は content/blog/*.md が単一ソース。
// ファイル名（拡張子なし）がそのまま記事ID・URLスラッグになる。
// 新しい記事を公開する手順:
//   1. content/blog/<slug>.md を作る（既存記事の frontmatter を丸ごとコピーして書き換えるのが確実）
//   2. main に push すると自動デプロイされ、/blog/<slug> が公開される
// 詳しくは docs/blog-writing.md を参照。
const BLOG_DIR = path.join(process.cwd(), "content/blog")

// YAMLの日付は Date オブジェクトにパースされることがあるため文字列に正規化する
function toDateString(value: unknown): string | undefined {
  if (value == null) return undefined
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

let cache: BlogPost[] | null = null

export function loadBlogPosts(): BlogPost[] {
  if (cache) return cache
  const posts = fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8")
      const { data, content } = matter(raw)
      const id = file.replace(/\.md$/, "")
      const date = toDateString(data.date)
      const post: BlogPost = {
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
      return post
    })
  cache = posts
  return posts
}
