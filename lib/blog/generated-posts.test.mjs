import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import test from "node:test"
import matter from "gray-matter"
import { loadBlogPosts } from "./posts.ts"

test("all public blog articles retain their titles and full content in the Worker bundle", () => {
  const dir = new URL("../../content/blog/", import.meta.url)
  const files = readdirSync(dir).filter((name) => name.endsWith(".md")).sort()
  const posts = loadBlogPosts()
  assert.deepEqual(posts.map((post) => `${post.id}.md`).sort(), files)
  for (const file of files) {
    const source = matter(readFileSync(new URL(file, dir), "utf8"))
    const post = posts.find((item) => `${item.id}.md` === file)
    assert.equal(post.title, String(source.data.title ?? ""), file)
    assert.equal(post.content, source.content.trim(), file)
  }
})
