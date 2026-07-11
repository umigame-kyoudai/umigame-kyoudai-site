"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import type { Liff } from "@line/liff"

interface LiffContextType {
  lineUserId: string | null
  lineDisplayName: string | null
  lineIdToken: string | null
  isLiffReady: boolean
  isLiffLoggedIn: boolean
  isInClient: boolean
  liffError: string | null
  loginLiff: () => void
  retryLiff: () => void
  closeWindow: () => void
}

const LiffContext = createContext<LiffContextType>({
  lineUserId: null,
  lineDisplayName: null,
  lineIdToken: null,
  isLiffReady: false,
  isLiffLoggedIn: false,
  isInClient: false,
  liffError: null,
  loginLiff: () => {},
  retryLiff: () => {},
  closeWindow: () => {},
})

export const useLiff = () => useContext(LiffContext)

const STORAGE_KEY_USER_ID = "line_user_id"
const STORAGE_KEY_DISPLAY_NAME = "line_display_name"

function clearLegacyLiffStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_USER_ID)
    localStorage.removeItem(STORAGE_KEY_DISPLAY_NAME)
  } catch {
    // プライベートブラウジング等でストレージ制限がある場合は無視する。
  }
}

// LIFFモジュールをキャッシュ
let liffInstance: Liff | null = null

export function LiffProvider({ children }: { children: ReactNode }) {
  const [lineUserId, setLineUserId] = useState<string | null>(null)
  const [lineDisplayName, setLineDisplayName] = useState<string | null>(null)
  const [lineIdToken, setLineIdToken] = useState<string | null>(null)
  const [isLiffReady, setIsLiffReady] = useState(false)
  const [isLiffLoggedIn, setIsLiffLoggedIn] = useState(false)
  const [isInClient, setIsInClient] = useState(false)
  const [liffError, setLiffError] = useState<string | null>(null)
  const initialized = useRef(false)

  const clearLiffIdentity = useCallback(() => {
    setLineUserId(null)
    setLineDisplayName(null)
    setLineIdToken(null)
    setIsLiffLoggedIn(false)
    clearLegacyLiffStorage()
  }, [])

  const initLiff = useCallback(async () => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID

    try {
      clearLiffIdentity()
      if (!liffId) {
        setIsLiffReady(true)
        return
      }

      const liffModule = await import("@line/liff")
      const liff = liffModule.default
      liffInstance = liff

      // LIFF初期化（ログインはしない）
      try {
        await liff.init({ liffId })
      } catch (initError) {
        if (window.location.hash && window.location.hash.includes("access_token")) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search)
          await liff.init({ liffId })
        } else {
          throw initError
        }
      }

      // LINEアプリ内ブラウザ（LIFF client）で開かれているか。closeWindow可否の判定に使う。
      try { setIsInClient(liff.isInClient()) } catch {}

      // 既にログイン済みならプロフィールを取得
      if (liff.isLoggedIn()) {
        setIsLiffLoggedIn(true)
        try {
          const profile = await liff.getProfile()
          const idToken = liff.getIDToken()
          if (!idToken) {
            throw new Error("LINE認証トークンを取得できませんでした。")
          }
          setLineUserId(profile.userId)
          setLineDisplayName(profile.displayName)
          setLineIdToken(idToken)
        } catch (profileError) {
          // プロフィール取得失敗（トークン期限切れ等）
          // ログアウトしてリセット（次回ユーザーが手動でログインできるように）
          try { liff.logout() } catch {}
          clearLiffIdentity()
          setLiffError("LINE情報の取得に失敗しました。再度ログインしてください。")
        }
      } else {
        clearLiffIdentity()
      }

      setIsLiffReady(true)
    } catch (error) {
      clearLiffIdentity()
      const msg = error instanceof Error ? error.message : String(error)
      const detail =
        error instanceof Error && "code" in error && typeof error.code === "string"
          ? ` (code: ${error.code})`
          : ""
      setLiffError(`${msg}${detail}`)
      setIsLiffReady(true)
    }
  }, [clearLiffIdentity])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // 旧実装で永続化していた本人情報は復元せず、起動時に削除する。
    clearLegacyLiffStorage()
    initLiff()
  }, [initLiff])

  // ユーザーが手動でLINEログインを開始する
  const loginLiff = () => {
    if (!liffInstance) return
    liffInstance.login({ redirectUri: window.location.href })
  }

  const retryLiff = () => {
    clearLiffIdentity()
    setLiffError(null)
    setIsLiffReady(false)
    initialized.current = false
    initLiff()
  }

  // LINEアプリ内ブラウザのときだけウィンドウを閉じてトークに戻す。通常ブラウザでは何もしない（呼び出し側でフォールバック表示）。
  const closeWindow = () => {
    try { liffInstance?.closeWindow?.() } catch {}
  }

  return (
    <LiffContext.Provider value={{ lineUserId, lineDisplayName, lineIdToken, isLiffReady, isLiffLoggedIn, isInClient, liffError, loginLiff, retryLiff, closeWindow }}>
      {children}
    </LiffContext.Provider>
  )
}
