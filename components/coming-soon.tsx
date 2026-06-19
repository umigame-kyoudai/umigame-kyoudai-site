import { Bell, CalendarClock } from "lucide-react"
import { TrackedCta } from "@/components/tracked-cta"

type ComingSoonBadgeProps = {
  className?: string
  label?: string
}

export function ComingSoonBadge({ className = "", label = "Coming Soon" }: ComingSoonBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-800 ring-1 ring-cyan-200 ${className}`}
    >
      <CalendarClock className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

type ComingSoonBannerProps = {
  title?: string
  description?: string
  actionHref?: string
  actionLabel?: string
  className?: string
}

export function ComingSoonBanner({
  title = "近日公開・予約受付開始までお待ちください",
  description = "現在は告知のみ公開しています。受付開始後、このページから予約できるようになります。",
  actionHref = "https://lin.ee/jfp4laz",
  actionLabel = "LINEで開始通知を相談する",
  className = "",
}: ComingSoonBannerProps) {
  return (
    <div
      id="coming-soon"
      className={`rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-left shadow-sm ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-cyan-700 ring-1 ring-cyan-200">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <ComingSoonBadge className="mb-3" label="Coming Soon" />
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
          <TrackedCta
            event={actionHref.startsWith("http") ? "line_click" : "book_cta_click"}
            eventProps={{ location: "coming_soon" }}
            href={actionHref}
            external={actionHref.startsWith("http")}
            className="mt-4 inline-flex rounded-full bg-cyan-700 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cyan-800"
          >
            {actionLabel}
          </TrackedCta>
        </div>
      </div>
    </div>
  )
}
