"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { BOOKING_CLOSED_DATES, bookingClosedMessage, isBookingDateClosed } from "@/lib/booking-closures"
import { todayStr } from "@/lib/date-utils"
import { isValidCalendarDate } from "@/lib/utils/validation"

const COPY = {
  ja: { choose: "日付を選択", previous: "前の月", next: "次の月", closed: "休", closure: "休業日", weekdays: ["日", "月", "火", "水", "木", "金", "土"] },
  en: { choose: "Choose a date", previous: "Previous month", next: "Next month", closed: "Closed", closure: "Closed dates", weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] },
  ko: { choose: "날짜 선택", previous: "이전 달", next: "다음 달", closed: "휴무", closure: "휴무일", weekdays: ["일", "월", "화", "수", "목", "금", "토"] },
  "zh-tw": { choose: "選擇日期", previous: "上個月", next: "下個月", closed: "休", closure: "公休日", weekdays: ["日", "一", "二", "三", "四", "五", "六"] },
}

function utcDate(value: string) {
  return new Date(`${value}T12:00:00Z`)
}

export function BookingDatePicker({
  id,
  value,
  onChange,
  locale = "ja",
}: {
  id: string
  value: string
  onChange: (value: string) => void
  locale?: keyof typeof COPY
}) {
  const copy = COPY[locale]
  const today = todayStr()
  const validValue = isValidCalendarDate(value)
  const selectedClosed = isBookingDateClosed(value)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => (validValue && value >= today ? value : today).slice(0, 7))
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstDay = utcDate(`${month}-01`)
  const daysInMonth = new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + 1, 0)).getUTCDate()
  const monthTitle = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", timeZone: "UTC" }).format(firstDay)
  const dateLabel = (date: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(utcDate(date))
  const upcomingClosedDates = BOOKING_CLOSED_DATES.filter((date) => date >= today)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("pointerdown", closeOutside)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOutside)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  const changeMonth = (offset: number) => {
    const next = new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + offset, 1))
    setMonth(next.toISOString().slice(0, 7))
  }

  return (
    <div ref={containerRef} className="min-w-0 max-w-full">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-calendar`}
        data-closed={selectedClosed || undefined}
        aria-describedby={selectedClosed ? `${id}-error` : upcomingClosedDates.length ? `${id}-closures` : undefined}
        onClick={() => {
          if (!open) setMonth((validValue && value >= today ? value : today).slice(0, 7))
          setOpen(!open)
        }}
        className="flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-left text-sm text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <span>{validValue ? dateLabel(value) : copy.choose}</span>
        <CalendarDays className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
      </button>
      {open && (
        <div id={`${id}-calendar`} role="group" aria-label={copy.choose} className="mt-2 w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-2 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label={copy.previous} disabled={month <= today.slice(0, 7)} onClick={() => changeMonth(-1)} className="flex h-11 w-11 items-center justify-center rounded-lg text-emerald-800 hover:bg-emerald-50 disabled:opacity-30">
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="text-sm font-semibold text-emerald-900" aria-live="polite">{monthTitle}</span>
            <button type="button" aria-label={copy.next} onClick={() => changeMonth(1)} className="flex h-11 w-11 items-center justify-center rounded-lg text-emerald-800 hover:bg-emerald-50">
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {copy.weekdays.map((day, index) => <span key={index} aria-hidden="true" className="py-1 text-center text-xs text-gray-500">{day}</span>)}
            {Array.from({ length: firstDay.getUTCDay() }, (_, index) => <span key={`blank-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1
              const date = `${month}-${String(day).padStart(2, "0")}`
              const closed = isBookingDateClosed(date)
              const disabled = date < today || closed
              return (
                <button
                  key={date}
                  type="button"
                  data-date={date}
                  disabled={disabled}
                  aria-label={`${dateLabel(date)}${closed ? ` (${copy.closure})` : ""}`}
                  aria-pressed={value === date}
                  aria-current={date === today ? "date" : undefined}
                  onClick={() => {
                    onChange(date)
                    setOpen(false)
                    triggerRef.current?.focus()
                  }}
                  className={`flex min-h-11 min-w-0 flex-col items-center justify-center rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    closed ? "cursor-not-allowed bg-rose-50 text-rose-700" : disabled ? "text-gray-300" : value === date ? "bg-emerald-700 text-white" : "text-gray-800 hover:bg-emerald-50"
                  }`}
                >
                  <span className={closed ? "line-through" : undefined}>{day}</span>
                  {closed && <span className="text-[9px] leading-3">{copy.closed}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {upcomingClosedDates.length > 0 && (
        <p id={`${id}-closures`} className="mt-2 text-xs leading-relaxed text-rose-700">
          {copy.closure}: {upcomingClosedDates.map(dateLabel).join(" / ")}
        </p>
      )}
      {selectedClosed && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-rose-700">{bookingClosedMessage(locale)}</p>}
    </div>
  )
}
