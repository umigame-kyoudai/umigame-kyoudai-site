import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { createMetadata } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "スタッフ紹介",
  description: "海亀兄弟のスタッフをご紹介。海のガイドから、アマゾン帰りのジャングル・ナイトツアー担当まで。それぞれの得意分野で宮古島の自然をご案内します。",
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
