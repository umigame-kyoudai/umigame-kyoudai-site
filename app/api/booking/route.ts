import { NextResponse } from 'next/server'
import { generateBookingNumber, sendToGAS, createAPIResponse, createAPIError } from '@/lib/services/gas-service'
import { validateEmail, validatePhoneNumber, validateRequired } from '@/lib/utils/validation'
import { PLANS, STAFF_FEE } from '@/lib/data'
import { calculateCouponDiscount } from '@/lib/constants/coupons'

interface BookingParticipant {
  name?: string
  age?: number | ''
  height?: number | ''
  weight?: number | ''
  footSize?: number | ''
  category: string
}

interface BookingRequest {
  selectedPlan: string
  selectedDate: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  planName: string
  selectedTime?: string
  selectedStaff?: string
  participants: BookingParticipant[]
  totalPrice?: number
  staffName?: string
  specialRequests?: string
  lineUserId?: string | null
  lineDisplayName?: string | null
  couponCode?: string
  couponDiscount?: number
}

const SUNSET_SUP_TIME_NOTE = 'サンセット時刻（予約確定時にご案内）'
const FREE_UNDER3_PLAN_IDS = new Set(['S3', 'S5'])
const STAFF_UNAVAILABLE_PLAN_IDS = new Set(['S3', 'S4', 'S5', 'slide-boat'])
const TIME_OPTIONAL_PLAN_IDS = new Set(['S4'])
const VALID_STAFF_IDS = new Set(['staff1', 'staff2', 'staff3', 'staff4', 'staff5'])
const STAFF_NAMES: Record<string, string> = {
  staff1: 'やまちゃん',
  staff2: 'ひかる',
  staff5: 'そうたろう',
  staff3: 'そういちろう',
  staff4: '凪',
}

const isNightTourPlan = (planId: string) => planId === 'S3' || planId === 'S5'

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

const getTodayInJapan = (): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date())

const getStaffName = (staffId?: string): string => {
  if (!staffId) return ''
  return STAFF_NAMES[staffId] || ''
}

const validateParticipant = (
  participant: BookingParticipant,
  plan: typeof PLANS[number],
  index: number
): { valid: boolean; error?: string } => {
  const label = `参加者${index + 1}`
  const category = participant.category
  const age = participant.age

  if (!['adult', 'child', 'under3'].includes(category)) {
    return { valid: false, error: `${label}の区分が不正です` }
  }

  if (!participant.name || !participant.name.trim()) {
    return { valid: false, error: `${label}の氏名が必須です` }
  }

  if (typeof age !== 'number' || !Number.isFinite(age)) {
    return { valid: false, error: `${label}の年齢が必須です` }
  }

  if (category === 'adult' && (age < 13 || age > 100)) {
    return { valid: false, error: `${label}の年齢と大人区分が一致していません` }
  }

  const childMinAge = isNightTourPlan(plan.id) ? 4 : 5
  if (category === 'child' && (age < childMinAge || age > 12)) {
    return { valid: false, error: `${label}の年齢と子ども区分が一致していません` }
  }

  if (category === 'under3') {
    if (!FREE_UNDER3_PLAN_IDS.has(plan.id)) {
      return { valid: false, error: '3歳以下のお子様が参加できるのはナイトツアーのみです' }
    }
    if (age < 0 || age > 3) {
      return { valid: false, error: `${label}の年齢と3歳以下区分が一致していません` }
    }
  }

  if (plan.id === 'S1' && age >= 60) {
    return {
      valid: false,
      error: '60歳以上の方がいるグループは【貸切】ウミガメシュノーケルツアーをご予約ください',
    }
  }

  if (!isNightTourPlan(plan.id)) {
    if (
      !isPositiveNumber(participant.height) ||
      !isPositiveNumber(participant.weight) ||
      !isPositiveNumber(participant.footSize)
    ) {
      return { valid: false, error: `${label}の身長・体重・足のサイズが必須です` }
    }
  }

  return { valid: true }
}

// 必須フィールドと予約内容の検証
const validateBookingRequest = (data: BookingRequest): { valid: boolean; error?: string } => {
  const { selectedDate, selectedTime, selectedStaff, customerName, customerEmail, customerPhone, participants, selectedPlan } = data

  if (!validateRequired(selectedPlan).valid) return { valid: false, error: 'プランが必須です' }
  const plan = PLANS.find((p) => p.id === selectedPlan)
  if (!plan) return { valid: false, error: '無効なプランです' }
  if (plan.status === 'coming_soon') {
    return { valid: false, error: 'このプランは近日公開のため、まだ予約できません' }
  }

  if (!validateRequired(selectedDate).valid) return { valid: false, error: '予約日が必須です' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
    return { valid: false, error: '予約日の形式が正しくありません' }
  }
  if (selectedDate < getTodayInJapan()) {
    return { valid: false, error: '過去の日付は予約できません' }
  }

  if (!TIME_OPTIONAL_PLAN_IDS.has(plan.id)) {
    if (!validateRequired(selectedTime || '').valid) {
      return { valid: false, error: '開始時間が必須です' }
    }

    const availableTimes = plan.timeTags.filter((time) => /^\d{2}:\d{2}$/.test(time))
    if (availableTimes.length > 0 && !availableTimes.includes(selectedTime || '')) {
      return { valid: false, error: '選択された開始時間がプランの時間帯と一致しません' }
    }
  }

  if (!validateRequired(customerName).valid) return { valid: false, error: '氏名が必須です' }
  const phoneValidation = validatePhoneNumber(customerPhone || '')
  if (!phoneValidation.valid) return { valid: false, error: phoneValidation.error || '電話番号が無効です' }
  if (customerEmail && !validateEmail(customerEmail).valid) {
    return { valid: false, error: 'メールアドレスが無効です' }
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    return { valid: false, error: '参加者情報が必要です' }
  }

  const { adultCount } = countParticipantsByCategory(participants)
  if (adultCount === 0) {
    return { valid: false, error: '参加者には大人を1名以上含めてください' }
  }

  for (const [index, participant] of participants.entries()) {
    const participantValidation = validateParticipant(participant, plan, index)
    if (!participantValidation.valid) return participantValidation
  }

  if (selectedStaff) {
    if (!VALID_STAFF_IDS.has(selectedStaff)) {
      return { valid: false, error: '無効なスタッフ指名です' }
    }
    if (STAFF_UNAVAILABLE_PLAN_IDS.has(plan.id)) {
      return { valid: false, error: 'このプランではスタッフ指名を利用できません' }
    }
  }

  return { valid: true }
}

// 参加者数をカテゴリ別に集計
const countParticipantsByCategory = (participants: Array<{ category: string }>) => ({
  adultCount: participants.filter((p) => p.category === 'adult').length,
  childCount: participants.filter((p) => p.category === 'child').length,
  under3Count: participants.filter((p) => p.category === 'under3').length,
})

// サーバー側で料金を再計算（クライアントから送られた値は信頼しない）
const calculateServerSidePrice = (
  plan: typeof PLANS[number],
  participants: BookingParticipant[],
  selectedStaff: string | undefined,
  couponDiscount: number
): number => {
  const { adultCount, childCount, under3Count } = countParticipantsByCategory(participants)
  const adultPrice = plan.price
  const childPrice = plan.childPrice ?? plan.price
  const under3Price = FREE_UNDER3_PLAN_IDS.has(plan.id) ? 0 : childPrice

  const baseTotal = adultCount * adultPrice + childCount * childPrice + under3Count * under3Price
  const vipSurcharge = plan.vipSurcharge ?? 0
  const staffFee = selectedStaff && !STAFF_UNAVAILABLE_PLAN_IDS.has(plan.id) ? STAFF_FEE : 0

  return Math.max(0, baseTotal + vipSurcharge + staffFee - couponDiscount)
}

// GAS用ペイロードを構築
const buildGASPayload = (
  bookingData: BookingRequest,
  plan: typeof PLANS[number],
  bookingNumber: string,
  validatedCoupon: { discount: number; code: string },
  serverTotalPrice: number
) => {
  const { adultCount, childCount, under3Count } = countParticipantsByCategory(bookingData.participants)

  return {
    bookingNumber,
    customerName: bookingData.customerName,
    customerEmail: bookingData.customerEmail || '',
    customerPhone: bookingData.customerPhone || '',
    planName: plan.name,
    selectedDate: bookingData.selectedDate,
    selectedTime: plan.id === 'S4' ? SUNSET_SUP_TIME_NOTE : bookingData.selectedTime || '',
    participants: bookingData.participants,
    adultCount,
    childCount,
    under3Count,
    totalPrice: serverTotalPrice,
    staffName: getStaffName(bookingData.selectedStaff),
    specialRequests: bookingData.specialRequests || '',
    lineUserId: bookingData.lineUserId || '',
    lineDisplayName: bookingData.lineDisplayName || '',
    couponCode: validatedCoupon.code,
    couponDiscount: validatedCoupon.discount,
  }
}

export async function POST(request: Request) {
  try {
    let bookingData: BookingRequest
    try {
      bookingData = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        createAPIError(parseError, 'リクエストの形式が正しくありません'),
        { status: 400 }
      )
    }

    const validation = validateBookingRequest(bookingData)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error, timestamp: new Date().toISOString() },
        { status: 400 }
      )
    }

    const plan = PLANS.find((p) => p.id === bookingData.selectedPlan)
    if (!plan) {
      return NextResponse.json(
        { success: false, error: '無効なプランです', timestamp: new Date().toISOString() },
        { status: 400 }
      )
    }

    const bookingNumber = generateBookingNumber()

    // クーポンをサーバー側で再計算（コードから直接金額を算出）
    const validatedCoupon = calculateCouponDiscount(bookingData.couponCode, bookingData.participants)

    // 合計金額もサーバー側で再計算（クライアント値は参考情報として無視）
    const serverTotalPrice = calculateServerSidePrice(
      plan,
      bookingData.participants,
      bookingData.selectedStaff,
      validatedCoupon.discount
    )

    const gasPayload = buildGASPayload(bookingData, plan, bookingNumber, validatedCoupon, serverTotalPrice)

    try {
      const result = await sendToGAS(gasPayload)
      return NextResponse.json(
        createAPIResponse(
          true,
          {
            bookingNumber,
            totalPrice: serverTotalPrice,
            couponDiscount: validatedCoupon.discount,
            couponCode: validatedCoupon.code,
            result,
          },
          '予約が正常に作成されました'
        )
      )
    } catch (gasError) {
      return NextResponse.json(
        createAPIError(gasError, 'GAS連携に失敗しました'),
        { status: 502 }
      )
    }
  } catch (error) {
    return NextResponse.json(createAPIError(error, '予約処理中にエラーが発生しました'), {
      status: 500,
    })
  }
}
