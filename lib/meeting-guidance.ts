import { isNightTourPlan, planHasNight } from "@/lib/plan-flags"

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
