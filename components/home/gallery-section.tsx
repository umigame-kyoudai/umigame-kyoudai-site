import Image from "next/image"
import Link from "next/link"
import { BLUR_DATA_URLS } from "@/lib/image-placeholders"
import { getFeaturedGalleryImages } from "@/lib/gallery-images"

// トップページに表示する写真は lib/gallery-images.ts で featured: true を付けて管理
const galleryImages = getFeaturedGalleryImages()

export function GallerySection() {
  return (
    <section className="py-20 md:py-28 bg-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-emerald-600 font-semibold text-sm tracking-widest uppercase mb-3">Gallery</p>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            こんな<span className="text-emerald-600">写真</span>が撮れます
          </h2>
          <p className="text-gray-500 text-lg">全てスタッフが撮影。データは無料でお渡しします。</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {galleryImages.map((img, i) => (
            <div
              key={i}
              className={`relative aspect-[4/3] rounded-xl overflow-hidden group cursor-pointer`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                quality={75}
                placeholder="blur"
                blurDataURL={BLUR_DATA_URLS.turtle}
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-8 py-3.5 rounded-full transition-all hover:scale-105 shadow-lg"
          >
            ギャラリーをもっと見る
          </Link>
        </div>
      </div>
    </section>
  )
}
