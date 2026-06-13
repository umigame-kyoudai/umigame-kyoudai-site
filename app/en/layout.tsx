import type { ReactNode } from "react"

// ルートの <html lang="ja"> はそのまま（日本語SEOを優先）。
// 英語コンテンツ領域には lang="en" を明示し、支援技術と検索エンジンに言語を伝える。
export default function EnglishLayout({ children }: { children: ReactNode }) {
  return <div lang="en">{children}</div>
}
