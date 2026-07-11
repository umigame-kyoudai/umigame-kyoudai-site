// 多言語サイト（/en /ko /zh-tw）の辞書型。
// 1ロケール = 1辞書オブジェクト（IntlDict）。ページテンプレート（components/intl/*）と
// 国際版予約フォーム（components/booking-form-intl.tsx）はこの辞書だけを見る。
// 価格・時間帯などの数値は lib/data.ts の PLANS、国際版価格は lib/i18n/en-prices.ts が単一の真実。

export interface IntlSection {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export interface IntlSectionsContent {
  metaTitle: string
  metaDescription: string
  heroTitle?: string
  heroSubtitle?: string
  sections: IntlSection[]
}

export interface IntlPlanContent {
  id: string
  name: string
  tagline: string
  description: string[]
  highlights: string[]
  included: string[]
  whatToBring: string[]
  precautions: string[]
  ageNote: string
  timeNote?: string
  locationNote?: string
  priceNote?: string
  /** 一覧カードに載せる priceNote の短縮形（「¥11,000/人」など）。CJK言語は必須（英語はカンマ区切りで自動短縮） */
  priceNoteShort?: string
  options?: Array<{ name: string; price: number; note?: string }>
}

export interface IntlFaq {
  question: string
  answer: string
}

export interface IntlHomeCopy {
  metaTitle: string
  metaDescription: string
  hero: { badge: string; title: string; subtitle: string }
  trustItems: readonly string[]
  aboutHeading: string
  aboutParagraphs: readonly string[]
  howToBookHeading: string
  howToBook: ReadonlyArray<{ title: string; text: string }>
  lineExplainer: { title: string; text: string }
  toursHeading: string
  toursIntro: string
  faqHeading: string
  faqIntro: string
  contactHeading: string
  contactText: string
}

export interface IntlUiCopy {
  footer: {
    tagline: string
    quickLinksHeading: string
    businessHoursHeading: string
    hours: string
    openYearRound: string
    hoursNote: string
    lineLabel: string
    logoAlt: string
    quickLinks: ReadonlyArray<{ href: string; label: string }>
    legalLinks: ReadonlyArray<{ href: string; label: string }>
    copyright: string
  }
  mobileCta: { line: string; book: string; bookHref: string }
  nav: {
    items: ReadonlyArray<{ href: string; label: string }>
    line: string
    book: string
    menuAria: string
    homeHref: string
    bookHref: string
  }
  bookingFormLoading: string
}

/** ページテンプレート共通のUI文言（見出し・ボタン・パンくず等） */
export interface IntlCommonCopy {
  breadcrumbHome: string
  breadcrumbTours: string
  breadcrumbFaq: string
  breadcrumbGuide: string
  breadcrumbTerms: string
  breadcrumbPrivacy: string
  checkAvailability: string
  seeAllTours: string
  readGuideLink: string
  seeAllQuestions: string
  messageOnLine: string
  emailUs: string
  comingSoon: string
  comingSoonDetail: string
  perAdult: string
  perChild: string
  heroImageAlt: string
  guideHeroImageAlt: string
  legalEyebrow: string
  faqEyebrow: string
  tourPlansEyebrow: string
  guideEyebrow: string
  plansMetaTitle: string
  plansMetaDescription: string
  plansTitle: string
  plansIntro: string
  faqMetaTitle: string
  faqMetaDescription: string
  faqTitle: string
  faqIntro: string
  faqStillQuestions: string
  askOnLine: string
  orEmail: string
  readyToBook: string
  durationAbout: (hours: number) => string
  durationShort: (hours: number) => string
  priceAdultLabel: string
  childPricePrefix: string
  durationLabel: string
  agesLabel: string
  startTimesLabel: string
  dependsOnSunset: string
  highlightsHeading: string
  includedHeading: string
  optionalRentalsHeading: string
  bringHeading: string
  notesHeading: string
  paymentNote: { before: string; linkText: string; after: string }
  comingSoonCta: { before: string; linkText: string; after: string }
  bookThisTour: string
  detailsLabel: string
  guideCtaHeading: string
  guideCtaText: string
  bookMetaTitle: string
  bookMetaDescription: string
  bookTitle: string
  bookIntro: string
  bookIntroStrong: string
  planMetaTitles: Record<string, string>
}

export type IntlGuestCategory = "adult" | "child" | "under3"

/** 国際版予約フォームの全文言。複数形など言語差が出る箇所は関数にする */
export interface IntlFormCopy {
  staffNoPreference: string
  staffNames: Record<string, string>
  limitToast: (max: number) => string
  groupLimitInfo: (max: number, current: number) => string
  sectionChooseTour: string
  sectionDateTime: string
  sectionParticipants: string
  sectionStaff: string
  sectionContact: string
  dateLabel: string
  startTimeLabel: string
  startTimeSunset: string
  sunsetNote: string
  daySupNote: string
  chooseTourFirst: string
  participantsIntroBase: string
  participantsIntroShoe: string
  addAdult: string
  addChild: (minAge: number) => string
  addUnder3: string
  guestCategoryLabel: Record<IntlGuestCategory, string>
  guestHeading: (index: number, categoryLabel: string) => string
  removeGuestAria: (index: number) => string
  defaultGuestName: (index: number) => string
  nameLabel: string
  ageLabel: string
  heightLabel: string
  weightLabel: string
  shoeLabel: string
  shoePlaceholder: string
  shoeConversionNote: string
  needAdultError: string
  seniorNotice: { before: string; after: string }
  seniorFallbackPlanName: string
  staffIntro: string
  fullNameLabel: string
  phoneLabel: string
  phonePlaceholder: string
  emailLabel: string
  requestsLabel: string
  couponLabel: string
  couponApply: string
  couponChecking: string
  couponAppliedToast: string
  couponAppliedLine: (amount: string) => string
  couponInvalid: string
  couponNetworkError: string
  couponChangedInvalid: string
  couponRecalcError: string
  partySummary: (counts: { adult: number; child: number; under3: number }) => string
  guideFeeLine: (fee: string) => string
  estimatedTotalLabel: string
  cashOnDay: string
  agreeText: { before: string; termsLabel: string; between: string; privacyLabel: string; after: string }
  cancellationSmallPrint: string
  lineLoginHeading: string
  lineLoginBody: { before: string; after: string }
  lineLoginButton: string
  lineConnecting: string
  lineErrorPrefix: string
  missingHeading: (count: number) => string
  missingChooseTour: string
  missingDate: string
  missingTime: string
  missingAddGuest: string
  missingAdult: string
  missingReduceGroup: (max: number) => string
  missingAgeFor: (index: number) => string
  missingShoeFor: (index: number) => string
  missingFullName: string
  missingPhone: string
  missingAgree: string
  missingLineLogin: string
  lineExpiredError: string
  submitFailedError: string
  genericError: string
  submitSending: string
  submitLabel: string
  requestNote: string
  addFriendWarning: { before: string; linkText: string; after: string }
  successTitle: string
  successBody: { text: string; strong: string }
  successTourLabel: string
  successDateLabel: string
  successSunsetNote: string
  successGuestsLabel: string
  successCouponLabel: string
  successTotalPrefix: string
  successTotalSuffix: string
  addFriendBox: {
    title: string
    bodyPre: string
    bodyStrong1: string
    bodyMid: string
    bodyStrong2: string
    bodyPost: string
    note: string
    button: string
  }
  backHome: string
  /** 備考が空のときに入れる、スタッフ向けの英語メモ（何語サイト経由かを示す） */
  bookedViaSite: string
}

export interface IntlDict {
  plans: IntlPlanContent[]
  planById: Record<string, IntlPlanContent>
  faqs: IntlFaq[]
  guide: IntlSectionsContent
  home: IntlHomeCopy
  terms: IntlSectionsContent
  privacy: IntlSectionsContent
  ui: IntlUiCopy
  common: IntlCommonCopy
  form: IntlFormCopy
  /** 国際版価格（日本語+¥2,000）の根拠説明。価格の脇に表示 */
  priceSupportNote: string
}
