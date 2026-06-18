import { NextResponse } from 'next/server'
import { calculateCouponDiscount, isCouponEligiblePlan } from '@/lib/constants/coupons'

// クーポンコードの検証はサーバー側でのみ行う。
// クライアントバンドルにコード一覧（COUPON_LIST）を含めないためのエンドポイント。

// 総当たりでコードを推測されないよう、IPごとに試行回数を制限する
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 15
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
  if (rateLimitMap.size > 1000) {
    for (const [key, ts] of rateLimitMap) {
      if (!ts.some((t) => t > windowStart)) rateLimitMap.delete(key)
    }
  }
  return false
}

interface CouponRequest {
  couponCode?: string
  adultCount?: number
  childCount?: number
  planId?: string
}

const toCount = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 50 ? value : 0

export async function POST(request: Request) {
  try {
    const clientIp = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { valid: false, discount: 0, error: '試行回数が多すぎます。しばらく時間をおいてからお試しください。' },
        { status: 429 }
      )
    }

    let body: CouponRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ valid: false, discount: 0, error: 'リクエストの形式が正しくありません' }, { status: 400 })
    }

    // 対象外プラン（C1など）はコードを問わず割引不可。専用メッセージで明示する。
    const planId = typeof body.planId === 'string' ? body.planId : undefined
    if (!isCouponEligiblePlan(planId)) {
      return NextResponse.json({ valid: false, discount: 0, error: 'このプランはクーポン対象外です' })
    }

    const participants = [
      ...Array(toCount(body.adultCount)).fill({ category: 'adult' }),
      ...Array(toCount(body.childCount)).fill({ category: 'child' }),
    ]

    const { discount, code } = calculateCouponDiscount(
      typeof body.couponCode === 'string' ? body.couponCode.trim() : '',
      participants,
      planId
    )

    if (!code) {
      return NextResponse.json({ valid: false, discount: 0 })
    }

    return NextResponse.json({ valid: true, discount })
  } catch {
    return NextResponse.json({ valid: false, discount: 0, error: 'クーポンの確認中にエラーが発生しました' }, { status: 500 })
  }
}
