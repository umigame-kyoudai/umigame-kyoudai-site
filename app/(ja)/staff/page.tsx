import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { createMetadata } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "スタッフ紹介",
  description: "海亀兄弟のスタッフをご紹介。宮古島の海を知り尽くした経験豊富なガイドが、安全で楽しい体験をお届けします。",
  path: "/staff",
  image: "/yamachan-staff-photo.jpg",
})
import { MobileCTA } from "@/components/mobile-cta"
import { StaffHero } from "@/components/staff-hero"
import { StaffGrid } from "@/components/staff-grid"
import { Footer } from "@/components/footer"
import { StaffPersonJsonLd } from "@/components/json-ld"
import { STAFFS } from "@/lib/data"

export default function StaffPage() {
  return (
    <div className="min-h-screen">
      <StaffPersonJsonLd staff={STAFFS} />
      <Navbar />
      <main>
        <StaffHero />
        <StaffGrid />
      </main>
      <Footer />
      <MobileCTA />
    </div>
  )
}
