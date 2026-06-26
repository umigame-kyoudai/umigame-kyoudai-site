import Image from "next/image"
import { BLUR_DATA_URLS } from "@/lib/image-placeholders"
import { TrackedCta } from "@/components/tracked-cta"
import { STAFF_MEMBERS, type StaffMember } from "@/lib/staff"

function StaffCard({ member }: { member: StaffMember }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-shadow duration-500">
      {/* Photo */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={member.image}
          alt={member.name}
          fill
          quality={80}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URLS.staff}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ objectPosition: member.objectPosition }}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Role badge */}
        <span className={`absolute top-4 left-4 ${member.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full`}>
          {member.role}
        </span>

        {/* Name overlay on photo */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg">{member.name}</h3>
          <p className="text-white/70 text-sm mt-1 italic">&ldquo;{member.catchphrase}&rdquo;</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-5 sm:p-6">
        <p className="text-gray-700 text-sm leading-relaxed mb-5">{member.description}</p>

        {/* Details */}
        <div className="space-y-2 mb-5">
          {member.details.map((detail) => (
            <div key={detail} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-xs text-gray-600">{detail}</span>
            </div>
          ))}
        </div>

        {/* Tours */}
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">担当ツアー</p>
          <div className="flex flex-wrap gap-1.5">
            {member.tours.map((tour) => (
              <span key={tour} className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                {tour}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function StaffGrid() {
  return (
    <section className="py-10 sm:py-16 md:py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Grid - 1col mobile, 2col desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {STAFF_MEMBERS.map((member) => (
            <StaffCard key={member.id} member={member} />
          ))}
        </div>

        {/* Team values */}
        <div className="mt-12 sm:mt-20">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-emerald-600 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-2">Our Values</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              私たちが<span className="text-emerald-600">大切にしていること</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                emoji: "🛡️",
                title: "安全管理の徹底",
                text: "安全講習・保険加入は当然。少人数制でスタッフの目が全員に行き届く体制。どんな海況でもお客様の安全を最優先に判断します。",
              },
              {
                emoji: "🤝",
                title: "誠実な対応",
                text: "無理な勧誘は一切なし。天候が悪ければ正直に中止をお伝えします（当日現地払いのため料金は一切いただきません）。お客様に嘘をつかない、当たり前のことを当たり前に。",
              },
              {
                emoji: "📸",
                title: "思い出をカタチに",
                text: "高画質カメラで全力撮影。枚数制限なし・全データ無料プレゼント。「こんな写真が撮りたい」のリクエストにもお応えします。",
              },
            ].map((value) => (
              <div
                key={value.title}
                className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 border border-gray-100"
              >
                <p className="text-2xl mb-3">{value.emoji}</p>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{value.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 sm:mt-16 text-center">
          <div className="bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-2xl sm:rounded-3xl p-8 sm:p-12 max-w-3xl mx-auto">
            <h3 className="text-xl sm:text-3xl font-bold text-white mb-3">
              このスタッフたちと、<br className="sm:hidden" />海に出かけよう
            </h3>
            <p className="text-emerald-100 text-sm sm:text-base mb-6 max-w-lg mx-auto">
              初めてでも大丈夫。私たちが全力でサポートします。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <TrackedCta
                event="book_cta_click"
                eventProps={{ location: "staff" }}
                href="/book"
                className="bg-white text-emerald-700 font-bold text-sm sm:text-base px-8 py-3.5 rounded-full shadow-xl transition-all active:scale-95 hover:bg-emerald-50"
              >
                ツアーを予約する
              </TrackedCta>
              <TrackedCta
                event="line_click"
                eventProps={{ location: "staff" }}
                href="https://lin.ee/jfp4laz"
                external
                className="bg-white/20 text-white font-bold text-sm sm:text-base px-8 py-3.5 rounded-full border border-white/30 transition-all active:scale-95"
              >
                LINEで質問する
              </TrackedCta>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
