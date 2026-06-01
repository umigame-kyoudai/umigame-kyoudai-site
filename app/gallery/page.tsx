import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { createMetadata } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "ギャラリー",
  description: "海亀兄弟で撮影した写真ギャラリー。ウミガメとのシュノーケリング、水中写真、お客様の笑顔など感動の瞬間をご覧ください。写真は全て無料プレゼント。",
  path: "/gallery",
  image: "/images/gallery-nt-7944.jpg",
})
import { MobileCTA } from "@/components/mobile-cta"
import { GalleryHero } from "@/components/gallery-hero"
import { ImageGallery } from "@/components/image-gallery"
import { Footer } from "@/components/footer"

export default function GalleryPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <GalleryHero />
        <ImageGallery />
      </main>
      <Footer />
      <MobileCTA />
    </div>
  )
}
