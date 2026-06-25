"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { TrackedCta } from "@/components/tracked-cta"
import { BLUR_DATA_URLS } from "@/lib/image-placeholders"
import {
  galleryImages,
  getGalleryCategories,
  GALLERY_CATEGORY_LABELS,
  type GalleryImage,
} from "@/lib/gallery-images"

// フィルタの選択状態。"all" は「すべて」を表す
type FilterValue = "all" | GalleryImage["category"]

// 「すべて」 + 画像が存在するカテゴリのみ
const categoryFilters: FilterValue[] = ["all", ...getGalleryCategories()]
const filterLabel = (value: FilterValue) =>
  value === "all" ? "すべて" : GALLERY_CATEGORY_LABELS[value]

// --- Lightbox ---
function Lightbox({ images, index, onClose, onPrev, onNext, onSelect }: {
  images: GalleryImage[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onSelect: (index: number) => void
}) {
  const img = images[index]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") onPrev()
      if (e.key === "ArrowRight") onNext()
    }
    window.addEventListener("keydown", handler)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", handler)
      document.body.style.overflow = ""
    }
  }, [onClose, onPrev, onNext])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 relative z-10" onClick={(e) => e.stopPropagation()}>
        <div>
          <p className="text-white/60 text-xs">{index + 1} / {images.length}</p>
          <p className="text-white text-sm font-semibold">{img.title}</p>
        </div>
        <button
          type="button"
          aria-label="ギャラリーを閉じる"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 relative flex items-center justify-center px-2 sm:px-12" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full h-full max-w-5xl">
          <Image
            src={img.src}
            alt={img.title}
            fill
            className="object-contain"
            sizes="100vw"
            quality={90}
            priority
          />
        </div>

        {/* Nav arrows */}
        <button
          type="button"
          aria-label="前の写真を見る"
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          type="button"
          aria-label="次の写真を見る"
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="p-3 sm:p-4 relative z-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide justify-center">
          {images.map((thumb, i) => (
            <button
              type="button"
              key={i}
              aria-label={`${thumb.title}を表示`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => onSelect(i)}
              className={`relative flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden transition-all ${
                i === index ? "ring-2 ring-emerald-400 opacity-100" : "opacity-40 hover:opacity-70"
              }`}
            >
              <Image src={thumb.src} alt="" fill className="object-cover" sizes="56px" quality={30} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ImageGallery() {
  const [selectedCategory, setSelectedCategory] = useState<FilterValue>("all")
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(9)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const filteredImages = selectedCategory === "all"
    ? galleryImages
    : galleryImages.filter((img) => img.category === selectedCategory)

  const visibleImages = filteredImages.slice(0, visibleCount)

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredImages.length) {
          setVisibleCount((prev) => Math.min(prev + 9, filteredImages.length))
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    )
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [visibleCount, filteredImages.length])

  useEffect(() => {
    setVisibleCount(9)
  }, [selectedCategory])

  const openLightbox = (filteredIndex: number) => {
    setLightboxIndex(filteredIndex)
  }

  return (
    <section className="py-8 sm:py-12 md:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Category filters */}
        <div className="mb-6 sm:mb-10 overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap sm:justify-center">
            {categoryFilters.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full transition-all active:scale-95 ${
                  selectedCategory === cat
                    ? "bg-emerald-500 text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:text-emerald-600"
                }`}
              >
                {filterLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <p className="text-xs text-gray-400 mb-4">{filteredImages.length}枚の写真</p>

        {/* Grid */}
        <div className="columns-2 sm:columns-2 md:columns-3 gap-2 sm:gap-3 space-y-2 sm:space-y-3">
          {visibleImages.map((image, index) => (
            <div
              key={image.id}
              className="break-inside-avoid cursor-pointer group"
              role="button"
              tabIndex={0}
              onClick={() => openLightbox(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  openLightbox(index)
                }
              }}
            >
              <div className="relative overflow-hidden rounded-lg sm:rounded-xl">
                <div className="relative w-full" style={{ aspectRatio: index % 3 === 0 ? "3/4" : "4/3" }}>
                  <Image
                    src={image.src}
                    alt={image.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URLS.ocean}
                    quality={60}
                    loading="lazy"
                  />
                  {/* Hover/tap overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end">
                    <div className="w-full p-2.5 sm:p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <span className="text-white text-[10px] sm:text-xs font-medium bg-emerald-500/80 px-2 py-0.5 rounded-full">
                        {GALLERY_CATEGORY_LABELS[image.category]}
                      </span>
                      <p className="text-white text-xs sm:text-sm font-semibold mt-1 line-clamp-1">{image.title}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load more trigger */}
        {visibleCount < filteredImages.length && (
          <div ref={loadMoreRef} className="h-16 flex items-center justify-center mt-6">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
                />
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 sm:mt-20 text-center">
          <div className="bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-2xl sm:rounded-3xl p-8 sm:p-12 max-w-3xl mx-auto">
            <h3 className="text-xl sm:text-3xl font-bold text-white mb-3">あなたも感動体験を</h3>
            <p className="text-emerald-100 text-sm sm:text-base mb-6 max-w-lg mx-auto">
              ギャラリーの写真のような素晴らしい体験があなたを待っています。写真は全て無料でプレゼント。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <TrackedCta
                event="book_cta_click"
                eventProps={{ location: "gallery" }}
                href="/book"
                className="bg-white text-emerald-700 font-bold text-sm sm:text-base px-8 py-3.5 rounded-full shadow-xl transition-all active:scale-95 hover:bg-emerald-50"
              >
                今すぐ予約する
              </TrackedCta>
              <TrackedCta
                event="line_click"
                eventProps={{ location: "gallery" }}
                href="https://lin.ee/jfp4laz"
                external
                className="bg-white/20 text-white font-bold text-sm sm:text-base px-8 py-3.5 rounded-full border border-white/30 transition-all active:scale-95"
              >
                LINEで相談
              </TrackedCta>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={filteredImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((lightboxIndex - 1 + filteredImages.length) % filteredImages.length)}
          onNext={() => setLightboxIndex((lightboxIndex + 1) % filteredImages.length)}
          onSelect={setLightboxIndex}
        />
      )}
    </section>
  )
}
