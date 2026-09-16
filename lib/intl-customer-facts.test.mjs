import assert from "node:assert/strict"
import test from "node:test"

import { getDict } from "./i18n/dict.ts"
import { SNORKEL_BEACHES } from "./beach-info.ts"
import { getPlanMaxParticipants } from "./booking-rules.ts"
import { DAY_SUP_TIMES, NIGHT_TOUR_TIMES, getParticipantAgeRange } from "./plan-flags.ts"
import { PLAN_PRICE_DATA } from "./plan-price-display.ts"
import { getRentalUnitPrice, planOffersRentals } from "./rental-options.ts"
import { formatIntlTime } from "./i18n/plan-facts.ts"

// 翻訳文の全文一致ではなく、実際に画面へ渡す辞書の重要な案内とWeb正本を比較する。
const checks = {
  en: {
    maskQuestion: /contact lenses or glasses/,
    free: /free/i,
    adultMask: /adult sizes only/i,
    noChildMask: /no child sizes/i,
    wetsuit: /wetsuit/i,
    sameDayQuestion: /book on the same day/,
    sameDay: /same-day bookings.*website/i,
    availability: /if space is available/i,
    healthQuestion: /medical condition/,
    health: /medical condition/,
    required: /must consult/,
    beforeBooking: /before booking/,
    review: /review your situation/,
    eligibility: /whether you can participate/,
    notGuaranteed: /does not guarantee participation/,
    unwellRule: /feeling unwell may not participate/,
    under3: /age 3 and under/,
    noCharge: /neither the tour fee nor a cancellation fee is charged/,
    sandals: /sandals are allowed/i,
    shoes: /walking shoes are recommended/,
    clothesQuestion: /What should I wear/,
    parkingQuestion: /Is parking available/,
    seaMeeting: /day before sea tours/,
    nightMeeting: /on the day of night tours/,
    drone: /drone/i,
    wind: /wind/,
    flight: /flight restrictions/,
    safety: /safety/,
    beaches: ["Aragusuku Beach", "Higashi-Hennazaki Beach", "Waiwai Beach", "Shigira Beach"],
  },
  ko: {
    maskQuestion: /콘택트렌즈나 안경/,
    free: /무료/,
    adultMask: /성인용만/,
    noChildMask: /어린이용[은 ]+없/,
    wetsuit: /웨트슈트/,
    sameDayQuestion: /당일 예약도/,
    sameDay: /당일에도 웹사이트에서 예약/,
    availability: /자리가 있으면/,
    healthQuestion: /지병이/,
    health: /지병/,
    required: /반드시/,
    beforeBooking: /예약 전에/,
    review: /내용을 확인한 후/,
    eligibility: /참여 가능 여부/,
    notGuaranteed: /참여가 보장되는 것은 아닙니다/,
    unwellRule: /몸이 불편한 분은 참여할 수 없습니다/,
    under3: /3세 이하/,
    noCharge: /투어 요금과 취소 수수료 모두 청구하지 않습니다/,
    sandals: /샌들도 가능/,
    shoes: /걷기 편한 신발을 권장/,
    clothesQuestion: /어떤 옷차림/,
    parkingQuestion: /주차장이/,
    seaMeeting: /해양 투어의 경우 전날/,
    nightMeeting: /나이트 투어의 경우 당일/,
    drone: /드론/,
    wind: /바람/,
    flight: /비행 규제/,
    safety: /안전/,
    beaches: ["아라구스쿠 비치", "히가시헨나자키 비치", "와이와이 비치", "시기라 비치"],
  },
  "zh-tw": {
    maskQuestion: /隱形眼鏡或眼鏡/,
    free: /免費/,
    adultMask: /僅提供成人尺寸/,
    noChildMask: /無兒童尺寸/,
    wetsuit: /防寒衣/,
    sameDayQuestion: /當天可以預約/,
    sameDay: /當天也可透過網站預約/,
    availability: /如有空位/,
    healthQuestion: /既往病症/,
    health: /既往病症/,
    required: /務必/,
    beforeBooking: /預約前/,
    review: /確認您的情況後/,
    eligibility: /是否可以參加/,
    notGuaranteed: /不代表一定可以參加/,
    unwellRule: /身體不適者不得參加/,
    under3: /3歲以下/,
    noCharge: /不收取行程費用或取消費用/,
    sandals: /涼鞋也可參加/,
    shoes: /建議穿著好走的鞋子/,
    clothesQuestion: /該怎麼穿/,
    parkingQuestion: /有停車場/,
    seaMeeting: /海上行程於前一天通知/,
    nightMeeting: /夜間行程於當天通知/,
    drone: /空拍/,
    wind: /風/,
    flight: /飛航管制/,
    safety: /安全/,
    beaches: ["新城海灘", "東平安名海灘", "ワイワイ（Waiwai）海灘", "シギラ（Shigira）海灘"],
  },
}

function answerFor(dict, question) {
  const faq = dict.faqs.find((entry) => question.test(entry.question))
  assert.ok(faq, `FAQが見つからない: ${question}`)
  return faq.answer
}

for (const [locale, check] of Object.entries(checks)) {
  const dict = getDict(locale)

  test(`${locale}: mask FAQ and private plan inclusions match free adult-only rentals`, () => {
    const answer = answerFor(dict, check.maskQuestion)
    assert.match(answer, check.free)
    assert.match(answer, check.adultMask)
    assert.match(answer, check.noChildMask)
    assert.doesNotMatch(answer, /[¥￥]\s*[\d,]+/)
    for (const plan of dict.plans.filter((entry) => planOffersRentals(entry.id))) {
      assert.equal(getRentalUnitPrice(plan.id), 0)
      const included = plan.included.join(" ")
      assert.match(included, check.wetsuit, plan.id)
      assert.match(included, check.adultMask, plan.id)
      assert.match(included, check.noChildMask, plan.id)
    }
  })

  test(`${locale}: FAQ permits same-day web booking when space is available`, () => {
    const answer = answerFor(dict, check.sameDayQuestion)
    assert.match(answer, check.sameDay)
    assert.match(answer, check.availability)
    assert.doesNotMatch(answer, /book up until the day before|전날까지 예약|最晚可預約到前一天/)
  })

  test(`${locale}: health concerns require consultation before booking and an eligibility decision`, () => {
    const faq = answerFor(dict, check.healthQuestion)
    const medicalTerms = dict.terms.sections.flatMap((section) => section.bullets ?? [])
      .filter((line) => check.health.test(line))
    assert.ok(medicalTerms.length > 0)
    const notices = [faq, ...medicalTerms]
    for (const plan of dict.plans) {
      const healthNotice = plan.precautions.find((line) => check.health.test(line))
      assert.ok(healthNotice, `${plan.id}: 予約前の健康相談案内がない`)
      notices.push(healthNotice)
    }
    for (const notice of notices) {
      for (const pattern of [check.required, check.beforeBooking, check.review, check.eligibility]) {
        assert.match(notice, pattern)
      }
      assert.doesNotMatch(notice, /conditions cannot participate|지병이 있는 분은 참여하실 수 없습니다|既往病症者無法參加/)
    }
    assert.match(faq, check.notGuaranteed)
    assert.match(JSON.stringify(dict.terms), check.unwellRule)
  })

  test(`${locale}: party summary includes age three and weather cancellations charge nothing`, () => {
    assert.match(dict.form.partySummary({ adult: 1, child: 0, under3: 1 }), check.under3)
    assert.doesNotMatch(JSON.stringify(dict), /\bunder 3\b|3세 미만|未滿3歲|one-group-per-day/i)
    assert.match(dict.form.cancellationSmallPrint, check.noCharge)
    assert.match(dict.form.cancellationSmallPrint, /100%/)
  })

  test(`${locale}: S2 lists every current snorkeling beach`, () => {
    assert.deepEqual(SNORKEL_BEACHES.map((beach) => beach.name), ["新城海岸", "東平安名ビーチ", "ワイワイビーチ", "シギラビーチ"])
    for (const beach of check.beaches) {
      assert.ok(dict.planById.S2.locationNote.includes(beach), beach)
    }
  })

  test(`${locale}: SUP drone caveats and night footwear/duration are visible`, () => {
    for (const id of ["S4", "S7"]) {
      const warning = dict.planById[id].precautions.find((line) => check.drone.test(line))
      assert.ok(warning, `${id}: ドローン実施条件がない`)
      for (const pattern of [check.wind, check.flight, check.safety]) assert.match(warning, pattern)
    }
    const night = dict.planById.S5
    const footwear = night.whatToBring.join(" ")
    assert.match(footwear, check.sandals)
    assert.match(footwear, check.shoes)
    const clothesFaq = answerFor(dict, check.clothesQuestion)
    assert.match(clothesFaq, check.sandals)
    assert.match(clothesFaq, check.shoes)
    assert.match(night.timeNote, /1\.5/)
    assert.match(night.timeNote, /90/)
    for (const time of NIGHT_TOUR_TIMES) {
      const [hour, minute] = time.split(":")
      const displayed = locale === "en" ? `${Number(hour) - 12}:${minute} PM` : time
      assert.ok(night.timeNote.includes(displayed), displayed)
    }
  })

  test(`${locale}: parking FAQ distinguishes sea and night meeting notices`, () => {
    const parkingFaq = answerFor(dict, check.parkingQuestion)
    assert.match(parkingFaq, check.seaMeeting)
    assert.match(parkingFaq, check.nightMeeting)
  })

  test(`${locale}: translated ages, prices, limits and daytime slots match booking facts`, () => {
    for (const plan of dict.plans) {
      const min = getParticipantAgeRange(plan.id, plan.id === "S5" ? "under3" : "child").min
      const max = getParticipantAgeRange(plan.id, "adult").max
      assert.deepEqual(plan.ageNote.match(/\d+/g).map(Number), [min, max], plan.id)
      if (plan.priceNoteShort) {
        assert.equal(Number(plan.priceNoteShort.match(/[¥￥]([\d,]+)/)[1].replaceAll(",", "")), PLAN_PRICE_DATA[plan.id].price, plan.id)
      }
    }
    assert.ok(dict.planById.S2.priceNote.includes(String(getPlanMaxParticipants("S2"))))
    const privateSupLimit = getPlanMaxParticipants("S7") + 1
    assert.ok(dict.planById.S7.precautions.some((line) => line.includes(String(privateSupLimit))))
    for (const time of DAY_SUP_TIMES) {
      assert.ok(dict.planById.S7.timeNote.includes(formatIntlTime(time, locale)), time)
    }
  })
}
