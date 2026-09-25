"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { captureBookingSource } from "@/lib/booking-source-client"

export function BookingSourceTracker() {
  const searchParams = useSearchParams()
  useEffect(() => { captureBookingSource() }, [searchParams])
  return null
}
