export const TOUR_IMAGE_PATHS = {
  snorkel: [
    "/images/tours/snorkel/snorkel-01.webp",
    "/images/tours/snorkel/snorkel-02.webp",
    "/images/tours/snorkel/snorkel-03.webp",
    "/images/tours/snorkel/snorkel-04.webp",
    "/images/tours/snorkel/snorkel-05.webp",
    "/images/tours/snorkel/snorkel-06.webp",
  ],
  night: [
    "/images/tours/night/night-01.webp",
    "/images/tours/night/night-02.webp",
    "/images/tours/night/night-03.webp",
    "/images/tours/night/night-04.webp",
    "/images/tours/night/night-05.webp",
    "/images/tours/night/night-06.webp",
  ],
  sup: [
    "/images/tours/sup/sup-01.webp",
    "/images/tours/sup/sup-02.webp",
    "/images/tours/sup/sup-03.webp",
    "/images/tours/sup/sup-04.webp",
    "/images/tours/sup/sup-05.webp",
    "/images/tours/sup/sup-06.webp",
  ],
  slideBoat: ["/images/slide-boat-photo.jpg"],
} as const

export const PLAN_COVER_IMAGE = {
  snorkel: TOUR_IMAGE_PATHS.snorkel[0],
  snorkelPrivate: TOUR_IMAGE_PATHS.snorkel[2],
  night: TOUR_IMAGE_PATHS.night[0],
  nightPrivate: TOUR_IMAGE_PATHS.night[2],
  sup: TOUR_IMAGE_PATHS.sup[3],
  slideBoat: TOUR_IMAGE_PATHS.slideBoat[0],
} as const
