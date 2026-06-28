"use client"

// 英語版の予約フォーム。日本語版（booking-form.tsx）とは独立した軽量実装で、
// 同じ /api/booking に送信する（最終検証・料金計算はサーバー側が行う）。
// プランのルール（時間帯・年齢制限・足サイズ必須など）はサーバーの検証と一致させること。

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { CheckCircle, MessageCircle, Plus, Trash2 } from "lucide-react"
import { useLiff } from "@/components/liff-provider"
import { todayStr } from "@/lib/date-utils"
import { PLANS, getStaffFee } from "@/lib/data"
import { EN_PLAN_BY_ID } from "@/lib/i18n/en"
import { getEnPrice, EN_PRICE_SUPPORT_NOTE } from "@/lib/i18n/en-prices"
import { SENIOR_RESTRICTED_PLAN_IDS, PRIVATE_COUNTERPART } from "@/lib/plan-flags"

const NIGHT_PLAN_IDS = new Set(["S3", "S5"])
const FREE_UNDER3_PLAN_IDS = NIGHT_PLAN_IDS
const STAFF_AVAILABLE_PLAN_IDS = new Set(["S1", "S2"])
const TIME_OPTIONAL_PLAN_IDS = new Set(["S4", "S6", "S7"])

const STAFF_LIST_EN = [
  { id: "", name: "No preference" },
  { id: "staff1", name: "Yama-chan" },
  { id: "staff2", name: "Hikaru" },
  { id: "staff5", name: "Sotaro" },
  { id: "staff3", name: "Soichiro" },
  { id: "staff4", name: "Nagi" },
]

type Category = "adult" | "child" | "under3"

interface ParticipantEn {
  id: string
  category: Category
  name: string
  age: number | ""
  height: number | ""
  weight: number | ""
  footSize: number | ""
}

let participantSeq = 0

export function BookingFormEn() {
  const searchParams = useSearchParams()
  const { lineUserId, lineDisplayName, isLiffReady, loginLiff, liffError } = useLiff()
  const liffRequired = !!process.env.NEXT_PUBLIC_LIFF_ID

  const bookablePlans = useMemo(() => PLANS.filter((p) => p.status !== "coming_soon" && EN_PLAN_BY_ID[p.id]), [])

  const initialPlan = searchParams.get("plan") || ""
  const [planId, setPlanId] = useState(bookablePlans.some((p) => p.id === initialPlan) ? initialPlan : "")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [participants, setParticipants] = useState<ParticipantEn[]>([])
  const [staffId, setStaffId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [specialRequests, setSpecialRequests] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const plan = bookablePlans.find((p) => p.id === planId)
  const en = planId ? EN_PLAN_BY_ID[planId] : undefined
  const isNight = NIGHT_PLAN_IDS.has(planId)
  const timeOptional = TIME_OPTIONAL_PLAN_IDS.has(planId)
  const isDaySup = planId === "S6" || planId === "S7"
  const staffAvailable = STAFF_AVAILABLE_PLAN_IDS.has(planId)
  const timeOptions = plan ? plan.timeTags.filter((t) => /^\d{2}:\d{2}$/.test(t)) : []

  const childMinAge = isNight ? 4 : 5

  const counts = useMemo(
    () => ({
      adult: participants.filter((p) => p.category === "adult").length,
      child: participants.filter((p) => p.category === "child").length,
      under3: participants.filter((p) => p.category === "under3").length,
    }),
    [participants]
  )

  const totalPrice = useMemo(() => {
    if (!plan) return 0
    // 英語サイトは英語価格（日本語＋¥2,000）で計算。サーバーも同じ getEnPrice で再計算する。
    const { price: adultPrice, childPrice } = getEnPrice(plan)
    const under3Price = FREE_UNDER3_PLAN_IDS.has(plan.id) ? 0 : childPrice
    const base = counts.adult * adultPrice + counts.child * childPrice + counts.under3 * under3Price
    const staffFee = staffAvailable ? getStaffFee(staffId) : 0
    return Math.max(0, base + (plan.vipSurcharge ?? 0) + staffFee - couponDiscount)
  }, [plan, counts, staffId, staffAvailable, couponDiscount])

  const addParticipant = (category: Category) => {
    participantSeq += 1
    setParticipants((prev) => [
      ...prev,
      { id: `en-${category}-${participantSeq}`, category, name: "", age: "", height: "", weight: "", footSize: "" },
    ])
  }

  const removeParticipant = (id: string) => setParticipants((prev) => prev.filter((p) => p.id !== id))

  const updateParticipant = (id: string, field: keyof ParticipantEn, value: ParticipantEn[keyof ParticipantEn]) =>
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))

  const handlePlanChange = (id: string) => {
    setPlanId(id)
    setTime("")
    if (!STAFF_AVAILABLE_PLAN_IDS.has(id)) setStaffId("")
    if (!NIGHT_PLAN_IDS.has(id)) {
      setParticipants((prev) => prev.filter((p) => p.category !== "under3"))
    }
  }

  const handleCouponApply = async () => {
    setIsApplyingCoupon(true)
    try {
      const response = await fetch("/api/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode, adultCount: counts.adult, childCount: counts.child }),
      })
      const result = await response.json().catch(() => ({ valid: false, discount: 0 }))
      if (response.ok && result.valid) {
        setCouponDiscount(result.discount)
        toast.success("Coupon applied!")
      } else {
        setCouponDiscount(0)
        toast.error("That coupon code is not valid.")
      }
    } catch {
      setCouponDiscount(0)
      toast.error("Could not verify the coupon. Please check your connection.")
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  // グループ版プランは60歳以上お断り → 対応する貸切版へ案内（判定は lib/plan-flags が単一ソース）
  const seniorRestricted =
    SENIOR_RESTRICTED_PLAN_IDS.has(planId) && participants.some((p) => typeof p.age === "number" && p.age >= 60)
  const seniorCounterpart = PRIVATE_COUNTERPART[planId]
  const seniorCounterpartName = seniorCounterpart
    ? EN_PLAN_BY_ID[seniorCounterpart.id]?.name ?? "the private plan"
    : ""

  const participantsValid = participants.every((p) => {
    const minAge = p.category === "under3" ? 0 : p.category === "child" ? childMinAge : 13
    const maxAge = p.category === "under3" ? 3 : p.category === "child" ? 12 : 100
    if (typeof p.age !== "number" || p.age < minAge || p.age > maxAge) return false
    if (!isNight && !(typeof p.footSize === "number" && p.footSize > 0)) return false
    return true
  })

  const isFormValid =
    !!plan &&
    !!date &&
    (timeOptional || !!time) &&
    counts.adult > 0 &&
    participants.length > 0 &&
    participantsValid &&
    !seniorRestricted &&
    customerName.trim().length > 0 &&
    customerPhone.trim().length >= 10 &&
    agreed

  const needsLineLogin = liffRequired && !lineUserId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plan || !en) return
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPlan: plan.id,
          selectedDate: date,
          selectedTime: time,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          planName: plan.name,
          locale: "en",
          selectedStaff: staffAvailable ? staffId || undefined : undefined,
          participants: participants.map((p, i) => ({
            ...p,
            name: p.name.trim() === "" ? `Guest ${i + 1}` : p.name.trim(),
          })),
          totalPrice,
          specialRequests: specialRequests.trim()
            ? `[EN booking] ${specialRequests.trim()}`
            : "[EN booking] Booked via English site",
          lineUserId,
          lineDisplayName,
          couponCode,
          couponDiscount,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const detail = errorData.error ? ` (${errorData.error})` : ""
        throw new Error(`We couldn't send your booking request.${detail} Please try again, or message us on LINE.`)
      }
      setIsSubmitted(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="bg-white/95 rounded-3xl ring-1 ring-emerald-100 shadow-2xl max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-emerald-800 mb-4">Booking request sent!</h2>
          <p className="text-gray-600 mb-6">
            Thank you! Our staff will check availability and reply to you on LINE.
            <br />
            <strong>Your booking is not confirmed until you receive our reply.</strong>
          </p>
          <div className="bg-emerald-50 rounded-lg p-4 mb-6 text-left text-sm text-gray-700">
            <p>Tour: {en?.name}</p>
            <p>
              Date & time: {date}{" "}
              {timeOptional
                ? isDaySup
                  ? "(start time will be adjusted for sea conditions and tide — we'll confirm it with you)"
                  : "(start time will follow the sunset — we'll confirm it with you)"
                : time}
            </p>
            <p>Guests: {participants.length}</p>
            <p>Estimated total: ¥{totalPrice.toLocaleString()} (cash, on the day)</p>
          </div>
          <Link href="/en" className="text-emerald-700 underline font-semibold">
            Back to home
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Plan */}
      <Card className="bg-white/80 rounded-3xl ring-1 ring-emerald-100 shadow-lg">
        <CardHeader>
          <CardTitle className="text-emerald-800">1. Choose your tour</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bookablePlans.map((p) => {
            const pe = EN_PLAN_BY_ID[p.id]
            const selected = planId === p.id
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => handlePlanChange(p.id)}
                className={`text-left rounded-2xl border-2 p-4 transition-colors ${
                  selected ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white hover:border-emerald-300"
                }`}
              >
                <span className="block font-bold text-gray-900 text-sm">{pe.name}</span>
                <span className="block text-xs text-gray-500 mt-1">
                  ¥{getEnPrice(p).price.toLocaleString()} / adult ・ {pe.ageNote}
                </span>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* Date & time */}
      <Card className="bg-white/80 rounded-3xl ring-1 ring-emerald-100 shadow-lg">
        <CardHeader>
          <CardTitle className="text-emerald-800">2. Date & start time</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="en-date" className="text-sm font-medium text-gray-700 mb-2 block">
              Date (Japan time) *
            </Label>
            <Input
              id="en-date"
              type="date"
              required
              min={todayStr()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border-emerald-200"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Start time {timeOptional ? (isDaySup ? "(confirmed after checking sea conditions)" : "(decided by sunset)") : "*"}
            </Label>
            {timeOptional ? (
              <p className="text-sm text-gray-500 leading-relaxed pt-2">
                {isDaySup
                  ? "The start time is adjusted based on sea conditions, tide level and wind — we'll confirm the exact time with you after booking."
                  : "The start time follows the sunset and changes by season — we'll confirm the exact time with you after booking."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(timeOptions.length > 0 ? timeOptions : []).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTime(t)}
                    className={`px-4 py-2 rounded-full border-2 text-sm font-semibold transition-colors ${
                      time === t ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-gray-200 text-gray-600 hover:border-emerald-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
                {!plan && <p className="text-sm text-gray-400 pt-2">Choose a tour first</p>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Participants */}
      <Card className="bg-white/80 rounded-3xl ring-1 ring-emerald-100 shadow-lg">
        <CardHeader>
          <CardTitle className="text-emerald-800">3. Who's joining?</CardTitle>
          <p className="text-sm text-gray-600">
            Age is required for safety. {isNight ? "" : "Shoe size (in cm) is required so we can prepare your fins — height and weight are optional but help us pick the right gear."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => addParticipant("adult")} className="rounded-full border-emerald-300 text-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Adult (13+)
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addParticipant("child")} className="rounded-full border-emerald-300 text-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Child ({childMinAge}–12)
            </Button>
            {isNight && (
              <Button type="button" variant="outline" size="sm" onClick={() => addParticipant("under3")} className="rounded-full border-emerald-300 text-emerald-700">
                <Plus className="w-4 h-4 mr-1" /> Age 0–3 (free)
              </Button>
            )}
          </div>

          {participants.map((p, index) => (
            <div key={p.id} className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-emerald-800 text-sm">
                  Guest {index + 1} ({p.category === "adult" ? "Adult" : p.category === "child" ? "Child" : "Age 0–3"})
                </h4>
                <button type="button" onClick={() => removeParticipant(p.id)} aria-label={`Remove guest ${index + 1}`} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Name (optional)</Label>
                  <Input value={p.name} onChange={(e) => updateParticipant(p.id, "name", e.target.value)} className="rounded-xl border-emerald-200" />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Age *</Label>
                  <Input
                    type="number"
                    required
                    min={p.category === "under3" ? 0 : p.category === "child" ? childMinAge : 13}
                    max={p.category === "under3" ? 3 : p.category === "child" ? 12 : 100}
                    value={p.age}
                    onChange={(e) => updateParticipant(p.id, "age", e.target.value === "" ? "" : Number.parseInt(e.target.value))}
                    className="rounded-xl border-emerald-200"
                  />
                </div>
                {!isNight && (
                  <>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Height cm (optional)</Label>
                      <Input type="number" min={50} max={220} value={p.height} onChange={(e) => updateParticipant(p.id, "height", e.target.value === "" ? "" : Number.parseInt(e.target.value))} className="rounded-xl border-emerald-200" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Weight kg (optional)</Label>
                      <Input type="number" min={5} max={150} value={p.weight} onChange={(e) => updateParticipant(p.id, "weight", e.target.value === "" ? "" : Number.parseInt(e.target.value))} className="rounded-xl border-emerald-200" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Shoe size cm *</Label>
                      <Input
                        type="number"
                        required
                        step="0.5"
                        min={10}
                        max={35}
                        placeholder="e.g. 26.5"
                        value={p.footSize}
                        onChange={(e) => updateParticipant(p.id, "footSize", e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
                        className="rounded-xl border-emerald-200"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {participants.length > 0 && counts.adult === 0 && (
            <p className="text-sm text-red-600">At least one adult (13+) must join.</p>
          )}
          {seniorRestricted && seniorCounterpart && (
            <p className="text-sm text-red-600">
              For safety, groups including guests aged 60+ should book the{" "}
              <Link href={`/en/plans/${seniorCounterpart.id}`} className="underline font-semibold">
                {seniorCounterpartName}
              </Link>{" "}
              instead.
            </p>
          )}
          {!isNight && participants.length > 0 && (
            <p className="text-xs text-gray-500">
              Shoe size in cm: US men's 8.5 ≈ 26.5 cm, US women's 7 ≈ 23.5 cm, EU 42 ≈ 26.5 cm.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Staff nomination */}
      {staffAvailable && (
        <Card className="bg-white/80 rounded-3xl ring-1 ring-emerald-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-emerald-800">4. Request a guide (optional)</CardTitle>
            <p className="text-sm text-gray-600">No preference is perfectly fine — every guide will give you a great tour.</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {STAFF_LIST_EN.map((s) => (
              <button
                type="button"
                key={s.id || "none"}
                onClick={() => setStaffId(s.id)}
                className={`px-4 py-2 rounded-full border-2 text-sm font-semibold transition-colors ${
                  staffId === s.id ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-gray-200 text-gray-600 hover:border-emerald-300"
                }`}
              >
                {s.name}
                {s.id && <span className="ml-1 text-xs opacity-70">+¥{getStaffFee(s.id).toLocaleString()}</span>}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Contact */}
      <Card className="bg-white/80 rounded-3xl ring-1 ring-emerald-100 shadow-lg">
        <CardHeader>
          <CardTitle className="text-emerald-800">{staffAvailable ? "5" : "4"}. Your contact details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="en-name" className="text-sm font-medium text-gray-700 mb-2 block">Full name *</Label>
            <Input id="en-name" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="rounded-xl border-emerald-200" />
          </div>
          <div>
            <Label htmlFor="en-phone" className="text-sm font-medium text-gray-700 mb-2 block">Phone (with country code) *</Label>
            <Input id="en-phone" type="tel" required placeholder="+1 555 123 4567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="rounded-xl border-emerald-200" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="en-email" className="text-sm font-medium text-gray-700 mb-2 block">Email (recommended)</Label>
            <Input id="en-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="rounded-xl border-emerald-200" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="en-requests" className="text-sm font-medium text-gray-700 mb-2 block">Questions or requests (optional)</Label>
            <Textarea id="en-requests" rows={3} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} className="rounded-xl border-emerald-200" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Coupon code (optional)</Label>
            <div className="flex gap-2">
              <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="rounded-xl border-emerald-200" />
              <Button type="button" onClick={handleCouponApply} disabled={isApplyingCoupon} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4">
                {isApplyingCoupon ? "Checking..." : "Apply"}
              </Button>
            </div>
            {couponDiscount > 0 && (
              <p className="text-emerald-600 text-sm font-semibold mt-2">Coupon applied: −¥{couponDiscount.toLocaleString()}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary & submit */}
      <Card className="bg-white/80 rounded-3xl ring-1 ring-emerald-100 shadow-lg">
        <CardContent className="p-6 space-y-5">
          {plan && participants.length > 0 && (
            <div className="bg-emerald-50 rounded-2xl p-4 text-sm text-gray-700 space-y-1">
              <p className="font-bold text-emerald-800">{en?.name}</p>
              <p>
                {counts.adult} adult{counts.adult !== 1 ? "s" : ""}
                {counts.child > 0 && `, ${counts.child} child${counts.child !== 1 ? "ren" : ""}`}
                {counts.under3 > 0 && `, ${counts.under3} under 3 (free)`}
              </p>
              {staffId && staffAvailable && <p>Guide request: +¥{getStaffFee(staffId).toLocaleString()}</p>}
              {couponDiscount > 0 && <p>Coupon: −¥{couponDiscount.toLocaleString()}</p>}
              <p className="font-black text-lg text-emerald-800">
                Estimated total: ¥{totalPrice.toLocaleString()}
                <span className="text-xs font-medium text-gray-500 ml-2">cash on the day</span>
              </p>
              <p className="text-xs text-gray-500">{EN_PRICE_SUPPORT_NOTE}</p>
            </div>
          )}

          <div className="flex items-start space-x-3">
            <Checkbox id="en-terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} className="mt-1" />
            <Label htmlFor="en-terms" className="text-sm text-gray-600 leading-relaxed">
              I agree to the{" "}
              <a href="/en/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
                Terms of Service & Cancellation Policy
              </a>{" "}
              and the{" "}
              <a href="/en/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
                Privacy Policy
              </a>
              .
              <br />
              <span className="text-xs text-gray-500">
                Free cancellation until the day before. Same-day cancellations and no-shows are charged 100% of the tour
                fee. Full refund if we cancel due to weather.
              </span>
            </Label>
          </div>

          {needsLineLogin && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <h3 className="flex items-center gap-2 font-bold text-gray-900 mb-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                One last step: log in with LINE
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                We confirm every booking through LINE, a free messaging app. Please log in with LINE to send your
                request — if you don't have the app yet, download it from the App Store or Google Play first (it takes a
                minute). Can't use LINE? Email us at{" "}
                <a href="mailto:info@umigamekyoudaimiyakojima.com" className="text-emerald-700 underline">
                  info@umigamekyoudaimiyakojima.com
                </a>{" "}
                instead.
              </p>
              <Button
                type="button"
                onClick={loginLiff}
                disabled={!isLiffReady}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl"
              >
                {isLiffReady ? "Log in with LINE" : "Connecting to LINE..."}
              </Button>
              {liffError && <p className="text-xs text-red-600 mt-2">LINE connection error: {liffError}</p>}
            </div>
          )}

          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting || needsLineLogin}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-6 rounded-2xl disabled:opacity-50"
          >
            {isSubmitting ? "Sending..." : "Send booking request"}
          </Button>
          <p className="text-xs text-gray-500 text-center">
            This sends a booking request — your booking is confirmed only after our staff replies on LINE.
          </p>
        </CardContent>
      </Card>
    </form>
  )
}
