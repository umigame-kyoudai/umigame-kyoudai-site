import { handleLegacyReferralVerification } from "@/lib/referral-migration"

export const dynamic = "force-dynamic"
export const maxDuration = 10

export async function POST(request: Request) {
  return handleLegacyReferralVerification(request)
}
