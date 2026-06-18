// FAQ型定義
export interface FAQ {
  id: string
  category: string
  question: string
  answer: string
  order: number
}

// FAQ一覧
export const faqs: FAQ[] = [
  {
    id: 'faq-1',
    category: 'ツアー予約',
    question: 'どのようにして予約しますか？',
    answer:
      'オンライン予約フォームから予約いただくか、LINE、電話でお問い合わせください。予約は24時間前までにお願いします。',
    order: 1,
  },
  {
    id: 'faq-2',
    category: 'ツアー予約',
    question: 'キャンセルはできますか？',
    answer:
      '前日までにご連絡いただければキャンセル料は無料です。当日キャンセル・無断キャンセルはツアー料金の100%をいただきます。お支払いは当日・現地現金決済のため、悪天候により当店判断で中止する場合はキャンセル料も料金もかかりません。',
    order: 2,
  },
  {
    id: 'faq-3',
    category: 'ツアー内容',
    question: '子供も参加できますか？',
    answer:
      'はい。シュノーケルとSUPは5歳以上、ナイトツアーは0歳から参加できます。ナイトツアーは3歳以下のお子様は無料です。',
    order: 3,
  },
  {
    id: 'faq-4',
    category: 'ツアー内容',
    question: '初心者でもシュノーケリングできますか？',
    answer:
      'もちろんです。スキルレベルに関わらず、ガイドが丁寧にサポートします。事前に不安なことはお知らせください。',
    order: 4,
  },
  {
    id: 'faq-5',
    category: '季節と天気',
    question: '雨の日でもツアーはありますか？',
    answer:
      'ツアーは通常どおり開催されます。ただし、台風や悪天候の場合は安全のため中止になることがあります。',
    order: 5,
  },
  {
    id: 'faq-6',
    category: '季節と天気',
    question: 'ベストシーズンはいつですか？',
    answer:
      '通年で楽しめますが、5月～10月は水温が高く、11月～4月は気温が温かいです。一年を通して体験できます。',
    order: 6,
  },
]

// カテゴリ別にFAQを取得
export const getFAQsByCategory = (category: string): FAQ[] => {
  return faqs
    .filter((faq) => faq.category === category)
    .sort((a, b) => a.order - b.order)
}

// FAQカテゴリ一覧を取得
export const getFAQCategories = (): string[] => {
  const categories = [...new Set(faqs.map((faq) => faq.category))]
  return categories.sort()
}

// 全FAQを取得
export const getAllFAQs = (): FAQ[] => {
  return faqs.sort((a, b) => a.order - b.order)
}
