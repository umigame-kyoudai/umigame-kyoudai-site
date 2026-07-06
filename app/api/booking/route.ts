import { NextResponse } from 'next/server'
import { generateBookingNumber, sendToGAS, createAPIResponse, createAPIError } from '@/lib/services/gas-service'
import { validateEmail, validatePhoneNumber, validateRequired } from '@/lib/utils/validation'
import { PLANS, getStaffFee } from '@/lib/data'
import { calculateCouponDiscount } from '@/lib/constants/coupons'
import { getEnPrice } from '@/lib/i18n/en-prices'
import {
  COMBO_PLAN_IDS,
  STAFF_UNAVAILABLE_PLAN_IDS,
  TIME_OPTIONAL_PLAN_IDS,
  SENIOR_RESTRICTED_PLAN_IDS,
  getPrivateCounterpartName,
  FREE_UNDER3_PLAN_IDS,
  COMBO_NIGHT_TIMES,
  DAY_SUP_TIME_NOTE,
  isNightTourPlan,
  isComboPlan,
  planHasSup,
  planHasNight,
  getComboContentText,
} from '@/lib/plan-flags'

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
  locale?: string
  selectedTime?: string
  nightTime?: string
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

// プラン分類は lib/plan-flags.ts を単一ソースとして参照する（予約フォーム等と共通）
const SUNSET_SUP_TIME_NOTE = 'サンセット時刻（予約確定時にご案内）'
const VALID_STAFF_IDS = new Set(['staff1', 'staff2', 'staff3', 'staff4', 'staff5'])
const STAFF_NAMES: Record<string, string> = {
  staff1: 'やまちゃん',
  staff2: 'ひかる',
  staff5: 'そうたろう',
  staff3: 'そういちろう',
  staff4: '凪',
}

// 簡易レートリミット（インスタンス内メモリ）。Vercelはインスタンスを再利用するため
// 完全ではないが、スパム送信によるGAS予約シート・LINE通知の氾濫を抑止する
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 5
const rateLimitMap = new Map<string, number[]>()

const isRateLimited = (clientKey: string): boolean => {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const timestamps = (rateLimitMap.get(clientKey) || []).filter((t) => t > windowStart)
  if (timestamps.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(clientKey, timestamps)
    return true
  }
  timestamps.push(now)
  rateLimitMap.set(clientKey, timestamps)
  // Mapの肥大化防止: 定員超過時に期限切れエントリを掃除
  if (rateLimitMap.size > 1000) {
    for (const [key, ts] of rateLimitMap) {
      if (!ts.some((t) => t > windowStart)) rateLimitMap.delete(key)
    }
  }
  return false
}

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

// 任意項目用: 未入力（undefined/null/空文字）は許容し、入力があれば正の数を要求
const isEmptyOrPositiveNumber = (value: unknown): boolean =>
  value === undefined || value === null || value === '' || isPositiveNumber(value)

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

  if (SENIOR_RESTRICTED_PLAN_IDS.has(plan.id) && age >= 60) {
    return {
      valid: false,
      error: `60歳以上の方がいるグループは${getPrivateCounterpartName(plan.id)}をご予約ください`,
    }
  }

  // 身長・体重は全プランで任意（フォームの案内文と一致させる）。入力された場合のみ正の数を要求
  if (!isEmptyOrPositiveNumber(participant.height) || !isEmptyOrPositiveNumber(participant.weight)) {
    return { valid: false, error: `${label}の身長・体重の値が正しくありません` }
  }

  if (!isNightTourPlan(plan.id)) {
    // シュノーケル系はフィン準備のため足のサイズのみ必須
    if (!isPositiveNumber(participant.footSize)) {
      return { valid: false, error: `${label}の足のサイズが必須です` }
    }
  } else if (!isEmptyOrPositiveNumber(participant.footSize)) {
    return { valid: false, error: `${label}の足のサイズの値が正しくありません` }
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

  if (planHasNight(plan.id)) {
    if (!validateRequired(data.nightTime || '').valid) {
      return { valid: false, error: 'ヤシガニ探検（ナイトツアー）の開始時間が必須です' }
    }
    if (!COMBO_NIGHT_TIMES.includes(data.nightTime || '')) {
      return { valid: false, error: '選択されたヤシガニ探検時間がプランの時間帯と一致しません' }
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
  couponDiscount: number,
  isEnglish: boolean
): number => {
  const { adultCount, childCount, under3Count } = countParticipantsByCategory(participants)
  // 英語サイト経由（locale==='en'）は英語価格（日本語＋¥2,000）で請求。フォームと同じ getEnPrice を使う。
  const { price: adultPrice, childPrice } = isEnglish
    ? getEnPrice(plan)
    : { price: plan.price, childPrice: plan.childPrice ?? plan.price }
  const under3Price = FREE_UNDER3_PLAN_IDS.has(plan.id) ? 0 : childPrice

  const baseTotal = adultCount * adultPrice + childCount * childPrice + under3Count * under3Price
  const vipSurcharge = plan.vipSurcharge ?? 0
  const staffFee = selectedStaff && !STAFF_UNAVAILABLE_PLAN_IDS.has(plan.id) ? getStaffFee(selectedStaff) : 0

  return Math.max(0, baseTotal + vipSurcharge + staffFee - couponDiscount)
}

const buildSpecialRequests = (bookingData: BookingRequest, plan: typeof PLANS[number]): string => {
  const rawRequests = bookingData.specialRequests?.trim() || ''

  if (!isComboPlan(plan.id)) return rawRequests

  // 海亀(必須)＋ SUP(あれば)＋ ナイト(あれば) を並べる。トリプル(C5/C6)は3つとも入る。
  const lines = [
    '[COMBO booking]',
    `プラン：${plan.name}`,
    getComboContentText(plan.id),
    `海亀希望時間：${bookingData.selectedTime || ''}`,
  ]
  if (planHasSup(plan.id)) lines.push(`ドローンSUP希望時間：${DAY_SUP_TIME_NOTE}`)
  if (planHasNight(plan.id)) lines.push(`ヤシガニ探検希望時間：${bookingData.nightTime || ''}`)
  const comboBlock = lines.join('\n')

  const cleanedRequests = rawRequests
    .replace(/\[COMBO booking\][\s\S]*?(?:\n───\n|$)/, '')
    .trim()

  return cleanedRequests ? `${comboBlock}\n───\n${cleanedRequests}` : comboBlock
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
    selectedTime: plan.id === 'S4'
      ? SUNSET_SUP_TIME_NOTE
      : bookingData.selectedTime || '',
    participants: bookingData.participants,
    adultCount,
    childCount,
    under3Count,
    totalPrice: serverTotalPrice,
    staffName: getStaffName(bookingData.selectedStaff),
    specialRequests: buildSpecialRequests(bookingData, plan),
    lineUserId: bookingData.lineUserId || '',
    lineDisplayName: bookingData.lineDisplayName || '',
    couponCode: validatedCoupon.code,
    couponDiscount: validatedCoupon.discount,
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { success: false, error: 'リクエストが多すぎます。しばらく時間をおいてからお試しください。', timestamp: new Date().toISOString() },
        { status: 429 }
      )
    }

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
    // 昼夜セットなど対象外プランは plan.id を渡すことで割引0に強制する
    const validatedCoupon = calculateCouponDiscount(bookingData.couponCode, bookingData.participants, plan.id)

    // 合計金額もサーバー側で再計算（クライアント値は参考情報として無視）
    const serverTotalPrice = calculateServerSidePrice(
      plan,
      bookingData.participants,
      bookingData.selectedStaff,
      validatedCoupon.discount,
      bookingData.locale === 'en'
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
