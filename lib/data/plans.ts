import { PLANS as CANONICAL_PLANS } from '../data'

// 互換用のプラン型定義。実データは lib/data.ts を正とする。
export interface Plan {
  id: string
  name: string
  description: string
  duration: string
  price: number
  childPrice?: number
  maxParticipants: number
  features: string[]
  image: string
  rank?: number
}

export const plans: Plan[] = CANONICAL_PLANS.map((plan) => ({
  id: plan.id,
  name: plan.name,
  description: plan.description,
  duration: `約${plan.durationHours}時間`,
  price: plan.price,
  childPrice: plan.childPrice,
  maxParticipants: plan.maxParticipants ?? 99,
  features: plan.features,
  image: plan.image,
  rank: plan.rank,
}))

// 価格マップ（プランIDと価格の対応）
export const planPriceMap: Record<string, number> = plans.reduce<Record<string, number>>((acc, plan) => {
  acc[plan.id] = plan.price
  return acc
}, {})

// プランを取得
export const getPlanById = (id: string): Plan | undefined => {
  return plans.find((plan) => plan.id === id)
}

// プランの価格を取得
export const getPlanPrice = (id: string): number => {
  return planPriceMap[id] || 0
}

// 大文字でも利用できるようにエクスポート（互換性）
export const PLANS = plans
