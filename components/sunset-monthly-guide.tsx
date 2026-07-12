"use client"

// サンセットSUP（S4）の「今月の集合・解散目安」。閲覧時点の月で動的に表示する。
// SSG時のビルド月とズレてもハイドレーション警告が出ないよう、マウント後にのみ描画する。
// 時刻の単一ソースは lib/beach-info.ts の SUNSET_SUP_MEETING_TIMES（日没の約90分前）。

import { useEffect, useState } from "react"
import { Sun } from "lucide-react"
import { getSunsetSupGuide } from "@/lib/beach-info"
import type { Locale } from "@/lib/i18n/locales"

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const LABELS: Record<Locale, (month: number, meet: string, end: string) => string> = {
  ja: (m, meet, end) => `今月（${m}月）の目安：集合 ${meet}頃・解散 ${end}頃`,
  en: (m, meet, end) => `This month (${MONTHS_EN[m - 1]}): meet around ${meet}, finish around ${end}`,
  ko: (m, meet, end) => `이번 달(${m}월) 기준: 집합 ${meet}경 · 해산 ${end}경`,
  "zh-tw": (m, meet, end) => `本月（${m}月）參考：集合約${meet}・解散約${end}`,
}

export function SunsetMonthlyGuide({ locale = "ja" }: { locale?: Locale }) {
  const [month, setMonth] = useState<number | null>(null)
  useEffect(() => {
    setMonth(new Date().getMonth() + 1)
  }, [])

  if (month === null) return null
  const { meet, end } = getSunsetSupGuide(month)

  return (
    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-800">
      <Sun className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" aria-hidden="true" />
      {LABELS[locale](month, meet, end)}
    </p>
  )
}
