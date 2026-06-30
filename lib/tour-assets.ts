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
  // 2026-06 実写の宣材写真に差し替え。カバー（先頭）・カルーセルは横位置のみ
  // （詳細ヒーロー/カードは object-cover の固定アスペクトで上下が切れるため）。
  // 縦位置の名作（立ちこぎ・空撮・親子・縦構図）はギャラリー側（lib/gallery-images.ts）へ。
  sup: [
    "/images/tours/sup/sunset-sup-group-hands-raised-001.webp",
    "/images/tours/sup/sunset-sup-solo-arms-raised-001.webp",
    "/images/tours/sup/sunset-sup-solo-paddling-001.webp",
    "/images/tours/sup/sunset-sup-group-hands-raised-002.webp",
    "/images/tours/sup/sunset-sup-solo-arm-raised-001.webp",
  ],
  daySup: [
    "/images/tours/day-sup/day-sup-hero.webp",
    "/images/tours/day-sup/day-sup-turquoise-aerial-013.webp",
    "/images/tours/day-sup/day-sup-topdown-aerial-002.webp",
  ],
  slideBoat: ["/images/slide-boat-photo.jpg"],
  // 複合プラン（昼:シュノーケル + 夜:ナイト）。先頭は昼夜を対角合成したカバー、
  // 続けて昼・夜の個別写真を並べ、カルーセルで「昼と夜の両方」が一目で分かるようにする。
  // 合成画像は scripts/generate-combo-cover.mjs で生成。
  combo: [
    "/images/tours/combo/combo-day-night.webp",
    "/images/tours/snorkel/snorkel-01.webp",
    "/images/tours/night/night-01.webp",
    "/images/tours/snorkel/snorkel-03.webp",
    "/images/tours/night/night-03.webp",
  ],
  // 海空セット（昼:シュノーケル + 昼:ドローンSUP）。合成カバーは未作成のため、
  // 実写のシュノーケル写真とドローンSUPの空撮を交互に並べ「海と空の両方」を見せる。
  comboSeaSky: [
    "/images/tours/day-sup/day-sup-turquoise-aerial-013.webp",
    "/images/tours/snorkel/snorkel-01.webp",
    "/images/tours/day-sup/day-sup-hero.webp",
    "/images/tours/snorkel/snorkel-03.webp",
    "/images/tours/day-sup/day-sup-topdown-aerial-002.webp",
  ],
  // まるごと1日セット（朝:シュノーケル + 昼:ドローンSUP + 夜:ナイトツアー）。
  // 合成カバーは未作成のため、海・空・夜の実写を並べて1日の流れが伝わるようにする。
  comboFullDay: [
    "/images/tours/combo/combo-day-night.webp",
    "/images/tours/snorkel/snorkel-01.webp",
    "/images/tours/day-sup/day-sup-hero.webp",
    "/images/tours/night/night-01.webp",
    "/images/tours/snorkel/snorkel-03.webp",
  ],
} as const

export const PLAN_COVER_IMAGE = {
  snorkel: TOUR_IMAGE_PATHS.snorkel[0],
  snorkelPrivate: TOUR_IMAGE_PATHS.snorkel[2],
  night: TOUR_IMAGE_PATHS.night[0],
  nightPrivate: TOUR_IMAGE_PATHS.night[2],
  sup: TOUR_IMAGE_PATHS.sup[0],
  daySup: TOUR_IMAGE_PATHS.daySup[0],
  slideBoat: TOUR_IMAGE_PATHS.slideBoat[0],
  // 詳細ページのヒーロー背景はラベルなしの合成（ページ側がタイトルを重ねるため）
  combo: "/images/tours/combo/combo-hero.webp",
  // 海空セットは合成ヒーロー未作成。ドローンSUPの空撮（海と空が一枚に収まる）をヒーローに流用。
  comboSeaSky: TOUR_IMAGE_PATHS.comboSeaSky[0],
  // まるごと1日セットは昼夜合成ヒーローを流用（海・空・夜を1日で）。
  comboFullDay: "/images/tours/combo/combo-hero.webp",
} as const
