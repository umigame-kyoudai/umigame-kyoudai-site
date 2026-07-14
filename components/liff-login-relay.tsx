"use client"

import { useEffect } from "react"

// LINEログイン（外部ブラウザ）は LIFF の「エンドポイントURL」= サイトルートに
// コールバックパラメータ（liff.state 等）付きで戻ってくる。予約ページ以外には
// LiffProvider が居ないため、ここで LIFF SDK を初期化してログイン処理を完了させ、
// SDK に liff.state の指すページ（/book・/zh-tw/book 等）へ戻させる。
// コールバックパラメータが無い通常アクセスでは SDK を読み込まず何もしない。
export function LiffLoginRelay() {
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (!liffId) return

    const isLoginCallback =
      new URLSearchParams(window.location.search).has("liff.state") ||
      window.location.hash.includes("access_token")
    if (!isLoginCallback) return

    // 予約ページは LiffProvider が自前で liff.init するので二重初期化を避ける
    const path = window.location.pathname.replace(/\/$/, "")
    if (path.endsWith("/book")) return

    import("@line/liff")
      .then(({ default: liff }) => liff.init({ liffId }))
      .catch(() => {
        // 中継に失敗しても通常のページ表示は妨げない（予約ページから再ログインできる）
      })
  }, [])

  return null
}
