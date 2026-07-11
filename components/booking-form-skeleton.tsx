export function BookingFormSkeleton({ locale = "ja" }: { locale?: "ja" | "en" }) {
  const loadingLabel = locale === "en" ? "Loading booking form" : "予約フォームを読み込んでいます"
  const cardHeights = ["h-44", "h-80", "h-56", "h-64"]

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={loadingLabel}
      className="min-h-[1250px] space-y-8"
    >
      <span className="sr-only">{loadingLabel}</span>
      <div className="animate-pulse rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
        <div className="h-3 w-24 rounded bg-emerald-100" />
        <div className="mt-3 h-6 w-52 rounded bg-emerald-100" />
        <div className="mt-5 grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-12 rounded-xl bg-emerald-50" />
          ))}
        </div>
        <div className="mt-5 h-3 w-full rounded bg-gray-100" />
        <div className="mt-2 h-3 w-4/5 rounded bg-gray-100" />
      </div>

      {cardHeights.map((height, index) => (
        <div
          key={index}
          className={`${height} animate-pulse rounded-3xl border border-emerald-100 bg-white/75 p-6 shadow-sm`}
        >
          <div className="h-6 w-40 rounded bg-emerald-100" />
          <div className="mt-5 h-11 w-full rounded-xl bg-gray-100" />
          <div className="mt-3 h-11 w-full rounded-xl bg-gray-100" />
          <div className="mt-3 h-3 w-2/3 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}
