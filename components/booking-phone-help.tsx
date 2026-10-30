import { Phone } from "lucide-react"
import { SITE_CONFIG } from "@/lib/site-config"

export function BookingPhoneHelp() {
  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-gray-800">
      <p>LINEを使えない方は、お電話でご相談ください。</p>
      <a
        href={`tel:${SITE_CONFIG.phone}`}
        className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-bold text-emerald-800 underline underline-offset-4 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        {SITE_CONFIG.phoneDisplayJa}（電話で相談）
      </a>
    </div>
  )
}
