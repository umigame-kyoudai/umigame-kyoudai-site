import { isNightTourPlan, planHasNight } from "@/lib/plan-flags"
import { NIGHT_GUIDE } from "@/lib/staff"

// 公開ページではナイトの詳しい地点名を出さず、正確な集合場所は当日のLINEで案内する。
export const NIGHT_TOUR_PUBLIC_AREA = `インギャーマリンガーデン付近など、${NIGHT_GUIDE.name}が宮古島を歩いて見つけた、とっておきのスポット`
export const NIGHT_TOUR_PUBLIC_LOCATION = `${NIGHT_TOUR_PUBLIC_AREA}（正確な集合場所は当日LINEでご案内）`

/** 場所の候補数ではなく、ツアーの構成に応じた集合場所の連絡タイミング。 */
export function getMeetingPlaceNotice(planId: string): string {
  if (isNightTourPlan(planId)) {
    return "ナイトツアーの集合場所は当日にLINEでご案内します。"
  }
  if (planHasNight(planId)) {
    return "セット内の海系ツアーの集合場所は前日に、ナイトツアーの集合場所は当日に、それぞれLINEでご案内します。"
  }
  if (!planId) {
    return "集合場所は、海系ツアーは前日に、ナイトツアーは当日にLINEでご案内します。"
  }
  return "海系ツアーの集合場所は前日にLINEでご案内します。"
}
