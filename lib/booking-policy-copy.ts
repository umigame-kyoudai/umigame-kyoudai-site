import { BOOKING_POLICY, formatCancellationFee, type PolicyLocale } from "@/lib/booking-policy"

// 画面ごとの説明文は各画面・辞書に残し、共通の運用を表す短い文だけを導出する。
export function getBookingPolicyCopy(locale: PolicyLocale = "ja") {
  const p = BOOKING_POLICY
  const labels = {
    ja: { timing: { tour_day: "ツアー当日" }, location: { on_site: "現地" }, method: { cash: "現金決済" } },
    en: { timing: { tour_day: "on the day of your tour" }, location: { on_site: "on site" }, method: { cash: "cash" } },
    ko: { timing: { tour_day: "투어 당일" }, location: { on_site: "현장" }, method: { cash: "현금 결제" } },
    "zh-tw": { timing: { tour_day: "行程當天" }, location: { on_site: "現場" }, method: { cash: "現金付款" } },
  }[locale]
  const paymentTimingLabel = labels.timing[p.paymentTiming]
  const paymentLocationLabel = labels.location[p.paymentLocation]
  const paymentMethodLabel = labels.method[p.paymentMethod]
  const paymentSummary = {
    ja: `${paymentTimingLabel}・${paymentLocationLabel}での${paymentMethodLabel}`,
    en: `${paymentMethodLabel} ${paymentLocationLabel} ${paymentTimingLabel}`,
    ko: `${paymentTimingLabel} ${paymentLocationLabel}에서 ${paymentMethodLabel}`,
    "zh-tw": `${paymentTimingLabel}${paymentLocationLabel}${paymentMethodLabel}`,
  }[locale]
  const prepaymentNotice = {
    ja: p.prepaid ? "事前決済が必要です。" : "事前決済はありません。",
    en: p.prepaid ? "Advance payment is required." : "No advance payment is required.",
    ko: p.prepaid ? "선결제가 필요합니다." : "선결제는 없습니다.",
    "zh-tw": p.prepaid ? "須預先付款。" : "無須預付。",
  }[locale]
  const noWeatherCharge = p.operatorWeatherCancellationPercent === 0 && p.operatorWeatherTourChargePercent === 0
  const setPaymentNotice = {
    ja: "セットツアーは、最初のツアー開始時にセット料金の全額を現地で現金にてお支払いください。",
    en: "For a package, pay the full package price in cash on site at the start of the first tour.",
    ko: "패키지는 첫 번째 투어 시작 시 현장에서 패키지 요금 전액을 현금으로 결제해 주세요.",
    "zh-tw": "套裝行程請於第一個行程開始時，在現場以現金支付套裝費用全額。",
  }[locale]
  const pregnancyNotice = {
    ja: "妊娠中、または妊娠の可能性がある方は参加できません。",
    en: "Guests who are pregnant or may be pregnant cannot participate.",
    ko: "임신 중이거나 임신 가능성이 있는 분은 참여하실 수 없습니다.",
    "zh-tw": "懷孕中或可能懷孕者無法參加。",
  }[locale]
  const healthConsultationNotice = {
    ja: "持病・その他の健康上の不安がある方は必ず予約前にご相談ください。内容を確認したうえで参加可否をご案内します。",
    en: "If you have a pre-existing medical condition or other health concerns, you must consult us before booking. We will review your situation and confirm whether you can participate. Consultation does not guarantee participation.",
    ko: "지병이나 기타 건강에 우려가 있는 분은 반드시 예약 전에 상담해 주세요. 내용을 확인한 후 참여 가능 여부를 안내합니다. 상담하더라도 참여가 보장되는 것은 아닙니다.",
    "zh-tw": "有既往病症或其他健康疑慮者，務必在預約前與我們洽詢。我們會確認您的情況後，告知是否可以參加，事前洽詢不代表一定可以參加。",
  }[locale]
  const weatherNotice = {
    ja: noWeatherCharge
      ? "悪天候・海況不良により当店判断でツアーの全構成を中止した場合、ツアー料金・キャンセル料は請求しません。すでに料金を受領している場合は全額返金します。"
      : `悪天候・海況不良により当店判断で中止した場合、ツアー料金の${p.operatorWeatherTourChargePercent}%とキャンセル料${p.operatorWeatherCancellationPercent}%が適用されます。`,
    en: noWeatherCharge
      ? "If we cancel all parts of your tour due to bad weather or unsafe sea conditions, neither the tour fee nor a cancellation fee is charged. Any tour payment already received will be refunded in full."
      : `If we cancel due to bad weather or unsafe sea conditions, ${p.operatorWeatherTourChargePercent}% of the tour fee and a ${p.operatorWeatherCancellationPercent}% cancellation fee apply.`,
    ko: noWeatherCharge
      ? "악천후나 해상 상황 악화로 저희가 투어 전체를 취소하는 경우, 투어 요금과 취소 수수료 모두 청구하지 않습니다. 이미 받은 투어 요금은 전액 환불합니다."
      : `악천후나 해상 상황 악화로 저희가 취소하는 경우, 투어 요금의 ${p.operatorWeatherTourChargePercent}%와 취소 수수료 ${p.operatorWeatherCancellationPercent}%가 적용됩니다.`,
    "zh-tw": noWeatherCharge
      ? "若因天候不佳或海況不安全由我們取消全部行程，不收取行程費用或取消費用。已收取的行程費用將全額退款。"
      : `若因天候不佳或海況不安全由我們取消行程，收取行程費用的${p.operatorWeatherTourChargePercent}%及${p.operatorWeatherCancellationPercent}%取消費用。`,
  }[locale]
  const partialCancellationNotice = {
    performed_single_tour_prices: {
      ja: "当店判断でセットの一部を中止した場合、実際に実施した単品ツアー分だけを請求します。最終的なご負担は実施済み単品料金の合計です。受領済みセット料金からこの合計を差し引いた金額を返金します。",
      en: "If we cancel part of a package, your final charge is the sum of the standalone prices of the tours that actually take place. The refund is the package payment already received minus that sum.",
      ko: "저희 판단으로 패키지 일부를 취소하면 최종 부담액은 실제 진행한 투어의 단품 요금 합계입니다. 이미 받은 패키지 요금에서 이 합계를 뺀 금액을 환불합니다.",
      "zh-tw": "若由我們取消套裝行程的一部分，最終費用為實際成行項目的單項行程價格合計。退款金額為已收取的套裝費用減去該合計。",
    },
  }[p.partialCancellationSettlement][locale]
  return {
    previousDayFee: formatCancellationFee(p.previousDayCancellationPercent, locale),
    sameDayFee: formatCancellationFee(p.sameDayCancellationPercent, locale),
    noShowFee: formatCancellationFee(p.noShowCancellationPercent, locale),
    weatherFee: formatCancellationFee(p.operatorWeatherCancellationPercent, locale),
    paymentTimingLabel, paymentLocationLabel, paymentMethodLabel, paymentSummary,
    prepaymentNotice, setPaymentNotice, weatherNotice, partialCancellationNotice,
    pregnancyNotice, healthConsultationNotice,
  }
}
