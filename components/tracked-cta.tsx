"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { trackEvent, type TrackEventName } from "@/lib/analytics"

type TrackedCtaProps = {
  event: TrackEventName
  eventProps?: Record<string, string | number | boolean | null>
  href: string
  className?: string
  children: ReactNode
  /** 外部リンク（LINE等）の場合 true。新しいタブで開き noopener を付与する。 */
  external?: boolean
}

// クリック計測付きのCTA。サーバーコンポーネント（ヒーロー等）に埋め込んで使える。
// クリック時に trackEvent を撃ってから通常どおり遷移する（遷移は妨げない）。
export function TrackedCta({ event, eventProps, href, className, children, external }: TrackedCtaProps) {
  const handleClick = () => trackEvent(event, eventProps)

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={handleClick}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}

type TrackedTelProps = {
  /** tel: 形式の電話リンク（例 "tel:08053442439"） */
  href: string
  /** イベントの出所（footer, faq, tokushoho など） */
  location: string
  className?: string
  children: ReactNode
}

// 電話番号タップ計測付きリンク。tel: は新規タブを開かずそのまま発信に遷移する。
export function TrackedTel({ href, location, className, children }: TrackedTelProps) {
  return (
    <a href={href} className={className} onClick={() => trackEvent("phone_click", { location })}>
      {children}
    </a>
  )
}
