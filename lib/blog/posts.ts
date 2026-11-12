import type { BlogPost } from "@/lib/data"
import { GENERATED_BLOG_POSTS } from "./generated-posts"

// content/blog/*.md is the source of truth. The prebuild/predev/pretest script
// compiles it into the Worker bundle, where the local filesystem is read-only.
export function loadBlogPosts(): BlogPost[] {
  return GENERATED_BLOG_POSTS
}
