// 英語サイト専用の料金（サーバー安全・'use client'なし）。
// 英語価格は日本語の各プラン＋¥2,000（大人・子供とも）。
// 「英語対応ガイド＋英語サポート込み」の価格として明示し、外国人税ではなく付加価値として案内する。
//
// この1モジュールを、英語予約フォーム（表示・合計）・予約API（サーバー請求）・
// 英語各ページ（ホーム/一覧/詳細）が共通参照することで、表示と請求の食い違いを防ぐ。
//
// 対象は英語サイトに掲載される稼働プランのみ（S1〜S5）。
// C1（昼夜プラン）は英語サイト対象外、slide-boatはComing Soonのため含めない
//（マップに無いIDは getEnPrice が日本語価格にフォールバックする）。

export const EN_PRICE_DATA: Record<string, { price: number; childPrice: number }> = {
  S1: { price: 8500, childPrice: 8000 },
  S2: { price: 11000, childPrice: 11000 },
  S3: { price: 6000, childPrice: 6000 },
  S4: { price: 10000, childPrice: 8000 },
  S5: { price: 10000, childPrice: 10000 },
}

// 英語サイトで表示・請求する価格を返す。マップに無いプランは日本語価格にフォールバック。
export function getEnPrice(plan: { id: string; price: number; childPrice?: number }): {
  price: number
  childPrice: number
} {
  const en = EN_PRICE_DATA[plan.id]
  if (en) return en
  return { price: plan.price, childPrice: plan.childPrice ?? plan.price }
}

// 価格の根拠を明示する一文（付加価値としての提示）。英語各ページ・予約フォームで価格脇に表示する。
// 実態に合わせた文言: 予約・連絡は英語、ツアー中も英語でサポート（ガイドの流暢さは約束しない）。
export const EN_PRICE_SUPPORT_NOTE =
  "Includes English-language support for your booking and during the tour."
