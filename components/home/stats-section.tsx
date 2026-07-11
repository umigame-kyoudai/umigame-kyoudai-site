import { Star, MessageCircle, Heart, Award } from "lucide-react"

function StatNumber({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString()
  return (
    <span className="text-3xl sm:text-4xl md:text-5xl font-black text-emerald-600 tabular-nums">
      {formatted}{suffix}
    </span>
  )
}

const stats = [
  { icon: Star, value: 4.9, suffix: "", label: "平均評価", iconColor: "text-yellow-500", fillIcon: true, decimals: 1 },
  { icon: MessageCircle, value: 10136, suffix: "+", label: "口コミ実績", iconColor: "text-blue-500", fillIcon: false, decimals: 0 },
  { icon: Heart, value: 5, suffix: "歳〜", label: "参加OK", iconColor: "text-pink-500", fillIcon: true, decimals: 0 },
  { icon: Award, value: 5000, suffix: "+", label: "年間案内実績", iconColor: "text-emerald-500", fillIcon: false, decimals: 0 },
]

export function StatsSection() {
  return (
    <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-b from-white to-emerald-50/50 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-emerald-700 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-2">Trust & Results</p>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900">
            数字が証明する<span className="text-emerald-600">信頼</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 md:gap-12">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center"
            >
              <div>
                <stat.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${stat.iconColor} mx-auto mb-2 sm:mb-4 ${stat.fillIcon ? "fill-current" : ""}`} />
              </div>
              <StatNumber value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
              <p className="text-gray-500 font-medium mt-1 sm:mt-2 text-xs sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
