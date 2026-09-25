import Image from "next/image"
import Link from "next/link"
import { BLUR_DATA_URLS } from "@/lib/image-placeholders"
import { STAFF_MEMBERS } from "@/lib/staff"

// トップの Our Team は短い紹介文（shortDescription）を使う。スタッフ定義は lib/staff.ts が単一ソース。
const staffMembers = STAFF_MEMBERS.map((m) => ({
  name: m.name,
  role: m.role,
  image: m.image,
  description: m.shortDescription,
  objectPosition: m.objectPosition,
  tourPage: m.tourPage,
}))

export function StaffSection() {
  return (
    <section className="py-12 sm:py-16 md:py-28 bg-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-emerald-700 font-semibold text-sm tracking-widest uppercase mb-3">Our Team</p>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            頼れる<span className="text-emerald-600">スタッフ</span>
          </h2>
          <p className="text-gray-500 text-lg">海も、夜の森も。それぞれの得意分野で、宮古島をご案内します。</p>
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
                <p className="text-emerald-700 text-sm font-medium mb-2">{staff.role}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{staff.description}</p>
                {staff.tourPage && <Link href={staff.tourPage} className="inline-block mt-3 text-xs font-semibold text-emerald-700 underline underline-offset-4">{staff.name}のナイトツアーを見る →</Link>}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/staff"
            className="inline-flex items-center text-emerald-700 hover:text-emerald-800 font-semibold transition-colors"
          >
            スタッフ紹介をもっと見る →
          </Link>
        </div>
      </div>
    </section>
  )
}
