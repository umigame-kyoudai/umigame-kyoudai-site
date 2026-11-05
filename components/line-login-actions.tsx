"use client"

import { useEffect, useState } from "react"
import { useLiff } from "@/components/liff-provider"
import { getAttribution } from "@/lib/attribution"
import { getBookingSourceToken } from "@/lib/booking-source-client"
import { trackLineLoginClick, trackLineLoginRedirectStarted } from "@/lib/booking-funnel"
import { buildLineBookingUrl, LINE_APP_ENTRY_QUERY, LINE_LOGIN_PREVIEW_NOTICE } from "@/lib/line-login"

const copy = {
  ja: {
    app: "LINEアプリで予約を続ける",
    appBody: "LINEで認証すると、このホームページの予約フォームがLINE内で開きます。選んだプラン・日付を引き継ぎます。",
    browser: "このブラウザでLINEログイン",
    login: "LINEで認証して戻る",
    saved: "入力内容を保存して認証へ進みます。戻ったら続きから入力できます。",
    help: "LINEが開かない・ログイン画面が出る場合",
    helpBody: "メールアドレスやパスワードの画面が出たら、下にある「LINEアプリでログイン」を押してください。Instagram内でLINEが開かない場合は、入力前にメニューからSafari／Chromeで開いてお試しください。",
    retry: "LINEとの接続をやり直す",
    connecting: "LINEの状態を確認しています…",
    error: "LINEに接続できませんでした。通信状況を確認して、もう一度お試しください。",
    appFallback: "LINEアプリが開かなかった場合は、下のボタンからログインできます。",
  },
  en: {
    app: "Continue booking in LINE",
    appBody: "Authorize in LINE to open this website’s booking form inside LINE. Your selected tour and date carry over.",
    browser: "Log in to LINE in this browser",
    login: "Log in to LINE and return",
    saved: "Your entries will be saved before login so you can continue when you return.",
    help: "If LINE does not open or asks for a password",
    helpBody: "On the email/password screen, choose “Log in with LINE app” near the bottom. If Instagram does not open LINE, open this page in Safari or Chrome before filling in the form.",
    retry: "Reconnect to LINE",
    connecting: "Checking your LINE login…",
    error: "Could not connect to LINE. Check your connection and try again.",
    appFallback: "If the LINE app did not open, use the login button below.",
  },
  ko: {
    app: "LINE 앱에서 예약 계속하기",
    appBody: "LINE에서 인증하면 이 홈페이지의 예약 양식이 LINE 안에서 열립니다. 선택한 투어와 날짜가 유지됩니다.",
    browser: "이 브라우저에서 LINE 로그인",
    login: "LINE 인증 후 돌아오기",
    saved: "입력 내용을 저장한 후 로그인합니다. 돌아오면 이어서 입력할 수 있습니다.",
    help: "LINE이 열리지 않거나 비밀번호를 요청하는 경우",
    helpBody: "이메일과 비밀번호 화면이 나오면 아래쪽의 ‘LINE 앱으로 로그인’을 눌러 주세요. Instagram에서 LINE이 열리지 않으면 입력 전에 Safari 또는 Chrome으로 이 페이지를 열어 주세요.",
    retry: "LINE에 다시 연결",
    connecting: "LINE 로그인 상태를 확인하고 있습니다…",
    error: "LINE에 연결할 수 없습니다. 통신 상태를 확인한 후 다시 시도해 주세요.",
    appFallback: "LINE 앱이 열리지 않으면 아래 버튼으로 로그인해 주세요.",
  },
  "zh-tw": {
    app: "在 LINE App 繼續預約",
    appBody: "在 LINE 授權後，會在 LINE 內開啟本網站的預約表單，並保留已選的行程與日期。",
    browser: "在此瀏覽器登入 LINE",
    login: "登入 LINE 後返回",
    saved: "登入前會儲存填寫內容，返回後可接著填寫。",
    help: "LINE 無法開啟或出現密碼畫面時",
    helpBody: "如果出現電子郵件與密碼畫面，請按下方的「使用 LINE 應用程式登入」。如果 Instagram 無法開啟 LINE，請在填寫前用 Safari 或 Chrome 開啟此頁。",
    retry: "重新連接 LINE",
    connecting: "正在確認 LINE 登入狀態…",
    error: "無法連接 LINE，請確認網路連線後再試一次。",
    appFallback: "若 LINE App 沒有開啟，可使用下方按鈕登入。",
  },
}

interface Props {
  locale?: keyof typeof copy
  location: string
  planId: string
  date: string
  hasInputToKeep: boolean
  onBeforeLogin: () => boolean
  draftReady?: boolean
}

export function LineLoginActions({ locale = "ja", location, planId, date, hasInputToKeep, onBeforeLogin, draftReady = true }: Props) {
  const text = copy[locale]
  const { isLiffReady, isInClient, liffError, loginLiff, retryLiff, allowLineAppLink, isBookingPreview } = useLiff()
  const [environment, setEnvironment] = useState<{
    mobile: boolean
    appEntry: boolean
    currentUrl: string
    bookingSource: string | null
    attribution: ReturnType<typeof getAttribution>
  } | null>(null)

  useEffect(() => {
    const appEntry = new URLSearchParams(window.location.search).get(LINE_APP_ENTRY_QUERY) === "app"
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    setEnvironment({ mobile, appEntry, currentUrl: window.location.href,
      bookingSource: getBookingSourceToken(), attribution: getAttribution() })
  }, [isLiffReady])

  const returnedWithoutApp = environment?.appEntry && !isInClient
  // 入力が変わった同じ描画でリンクを消す。useEffectの更新待ち中に切り替えない。
  const appUrl = environment?.mobile && allowLineAppLink && !isInClient && !environment.appEntry && !hasInputToKeep && draftReady
      ? buildLineBookingUrl({
        liffId: process.env.NEXT_PUBLIC_LIFF_ID || "",
        currentUrl: environment.currentUrl,
        planId,
        date,
        bookingSource: environment.bookingSource,
        attribution: environment.attribution,
      })
      : null

  if (!draftReady || !isLiffReady) return <p role="status" className="text-sm text-emerald-800">{text.connecting}</p>

  return (
    <div className="space-y-3">
      {isBookingPreview && <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{LINE_LOGIN_PREVIEW_NOTICE[locale]}</p>}
      {appUrl ? (
        <>
          <p className="text-sm leading-relaxed text-gray-700">{text.appBody}</p>
          {/* 普通のa要素によるユーザーのタップを保つ。JSリダイレクト・別窓・非同期処理を挟まない。 */}
          <a
            href={appUrl}
            aria-disabled={isBookingPreview || undefined}
            onClick={(event) => {
              if (isBookingPreview) { event.preventDefault(); return }
              if (!onBeforeLogin()) { event.preventDefault(); return }
              trackLineLoginClick({ location, locale })
              // LINEアプリを開く試みを記録する。実際に開けたかの判定ではない。
              trackLineLoginRedirectStarted({ redirectMethod: "line_app" })
            }}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#06C755] px-4 py-3 text-center text-sm font-bold text-[#003b1b] hover:bg-[#05b34c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >{text.app}</a>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-gray-700">{returnedWithoutApp ? text.appFallback : text.saved}</p>
      )}
      {liffError && <p role="alert" className="text-sm text-rose-800">{text.error}</p>}
      <button
        type="button"
        disabled={isBookingPreview}
        onClick={() => {
          if (!onBeforeLogin()) return
          if (liffError || isInClient) { retryLiff(); return }
          trackLineLoginClick({ location, locale })
          loginLiff()
        }}
        className={appUrl
          ? "min-h-11 w-full rounded-lg px-3 py-2 text-sm text-emerald-800 underline underline-offset-4"
          : "min-h-12 w-full rounded-xl bg-[#06C755] px-4 py-3 text-sm font-bold text-[#003b1b] hover:bg-[#05b34c]"}
      >{liffError || isInClient ? text.retry : appUrl ? text.browser : text.login}</button>
      <details className="text-xs leading-relaxed text-gray-600">
        <summary className="cursor-pointer py-2 font-medium text-emerald-800">{text.help}</summary>
        <p className="pb-1">{text.helpBody}</p>
      </details>
    </div>
  )
}
