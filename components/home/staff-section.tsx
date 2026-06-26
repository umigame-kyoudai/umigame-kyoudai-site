import Image from "next/image"
import Link from "next/link"
import { BLUR_DATA_URLS } from "@/lib/image-placeholders"

const staffMembers = [
  {
    name: "やまちゃん",
    role: "現場責任者",
    image: "/yamachan-staff-photo.jpg",
    description: "宮古島の海を知り尽くした頼れるリーダー",
    objectPosition: "center 20%",
  },
  {
    name: "ひかる",
    role: "やまちゃんの右腕",
    image: "/hikaru-staff-photo.jpg",
    description: "海の生き物が大好きな優しいガイド",
    objectPosition: "center center",
  },
  {
    name: "そうたろう",
    role: "ツアーガイド",
    image: "/img-2102-staff-photo.jpg",
    description: "初めての方にも寄り添うガイド",
    objectPosition: "center center",
  },
  {
    name: "そういちろう",
    role: "ナイトツアー専門",
    image: "/images/night-tour-coconut-crab.jpg",
    description: "夜の冒険のスペシャリスト",
    objectPosition: "center center",
  },
  {
    name: "凪",
    role: "ドローンパイロット",
    image: "/nagi-staff-photo.jpg",
    description: "空からの絶景を記録するプロ",
    objectPosition: "center center",
  },
  {
    name: "まなちゃん",
    role: "宮古島出身ガイド",
    image: "/mana-staff-photo.jpg",
    description: "地元目線で案内する小柄で明るいガイド",
    objectPosition: "center 30%",
  },
]

export function StaffSection() {
  return (
    <section className="py-12 sm:py-16 md:py-28 bg-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-emerald-600 font-semibold text-sm tracking-widest uppercase mb-3">Our Team</p>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            頼れる<span className="text-emerald-600">スタッフ</span>
          </h2>
          <p className="text-gray-500 text-lg">安心して楽しめるのは、経験豊富なスタッフがいるから</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8">
          {staffMembers.map((staff) => (
            <div
              key={staff.name}
              className="group text-center"
            >
              <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-4 rounded-full overflow-hidden ring-4 ring-emerald-100 group-hover:ring-emerald-300 transition-all duration-300 group-hover:scale-105">
                <Image
                  src={staff.image}
                  alt={staff.name}
                  fill
                  quality={75}
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URLS.staff}
                  className="object-cover"
                  style={{ objectPosition: staff.objectPosition }}
                  sizes="(max-width: 768px) 128px, 160px"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{staff.name}</h3>
                <p className="text-emerald-600 text-sm font-medium mb-2">{staff.role}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{staff.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/staff"
            className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
          >
            スタッフ紹介をもっと見る →
          </Link>
        </div>
      </div>
    </section>
  )
}
