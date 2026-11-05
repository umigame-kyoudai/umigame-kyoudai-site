import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { LiffProvider } from "@/components/liff-provider"
import { REFERRAL_COOKIE_NAME } from "@/lib/referral"

export function BookingLiffProvider({ children }: { children: ReactNode }) {
  // 紹介料の判定に使うHttpOnly Cookieは別ブラウザへ移せない。
  // Cookieの内容はクライアントへ渡さず、この場合は従来の認証往復を維持する。
  const allowLineAppLink = !cookies().has(REFERRAL_COOKIE_NAME)
  return <LiffProvider allowLineAppLink={allowLineAppLink} isBookingPreview={process.env.VERCEL_ENV === "preview"}>{children}</LiffProvider>
}
