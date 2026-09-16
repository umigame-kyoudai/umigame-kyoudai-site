import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

import * as policy from "./booking-policy.ts"
import * as policyCopy from "./booking-policy-copy.ts"
import * as siteConfig from "./site-config.ts"
import * as seo from "./seo.ts"
import * as dictionaries from "./i18n/dict.ts"
import * as locales from "./i18n/locales.ts"
import { CANCELLATION_POLICY as legacyPolicy, PLANS } from "./data.ts"
import { FAQ_ENTRIES } from "./faq.ts"
import { PLAN_DETAILS } from "./plan-details.ts"
import { PLAN_PRICE_DATA } from "./plan-price-display.ts"
import { COMBO_COMPONENT_PLAN_IDS } from "./plan-flags.ts"

const { BOOKING_POLICY, CANCELLATION_POLICY, formatCancellationFee } = policy
const { getBookingPolicyCopy } = policyCopy
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
const Empty = () => null
const Anchor = ({ href, children }) => React.createElement("a", { href }, children)
const visible = (html) => html.replace(/<[^>]*>/g, "").replaceAll("&#x27;", "'").replaceAll("&quot;", '"').replaceAll("&amp;", "&")
const dependencies = {
  "next/link": Anchor,
  "lucide-react": new Proxy({}, { get: () => Empty }),
  "@/components/navbar": { Navbar: Empty },
  "@/components/footer": { Footer: Empty },
  "@/components/mobile-cta": { MobileCTA: Empty },
  "@/components/json-ld": { BreadcrumbJsonLd: Empty },
  "@/components/tracked-cta": { TrackedTel: Anchor, TrackedCta: Anchor },
  "@/lib/booking-policy": policy,
  "@/lib/booking-policy-copy": policyCopy,
  "@/lib/site-config": siteConfig,
  "@/lib/seo": seo,
  "@/lib/i18n/dict": dictionaries,
  "@/lib/i18n/locales": locales,
}
const compilerOptions = { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }

// 読み取り専用の規約ページを実際に描画する。Next・計測・LINE等の処理は起動しない。
function loadPage(file) {
  const { outputText } = ts.transpileModule(read(file), { fileName: file, compilerOptions })
  const exports = {}
  new Function("React", "require", "exports", outputText)(React, (id) => {
    assert.ok(Object.hasOwn(dependencies, id), `${file}: 未指定の依存 ${id}`)
    return dependencies[id]
  }, exports)
  return exports
}
const pageText = (file, props, name = "default") => visible(renderToStaticMarkup(React.createElement(loadPage(file)[name], props)))

// 予約フォームは同意ラベルのJSXだけを描画し、予約・LIFF・fetch・入力状態を起動しない。
function formPolicyText(locale = "ja") {
  const file = locale === "ja" ? "components/booking-form.tsx" : "components/booking-form-intl.tsx"
  const ast = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let label
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === "Label") {
      const target = locale === "ja" ? "terms" : "intl-terms"
      if (node.openingElement.attributes.properties.some((prop) => ts.isJsxAttribute(prop) && prop.name.text === "htmlFor" && prop.initializer?.text === target)) label = node
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.ok(label, `${file}: 利用規約の同意ラベルが見つからない`)
  const scope = {
    React,
    Label: ({ children }) => React.createElement("label", null, children),
    policyCopy: getBookingPolicyCopy(),
    copy: locale === "ja" ? undefined : dictionaries.getDict(locale).form,
    locale,
    localePath: locales.localePath,
  }
  const { outputText } = ts.transpileModule(`const rendered = (${label.getText(ast)});`, { fileName: file, compilerOptions })
  const element = new Function(...Object.keys(scope), `${outputText}; return rendered`)(...Object.values(scope))
  return visible(renderToStaticMarkup(element))
}

const checks = {
  ja: { previous: /前日[^。]*無料/, sameDay: /当日(?:の)?キャンセル[^。]*100%/, noShow: /無断キャンセル[^。]*100%/, payment: [/当日/, /現地/, /現金/], noPrepayment: /事前決済はありません/ },
  en: { previous: /(?:free[^.]*day before|day before[^.]*free)/i, sameDay: /same[- ]day[^.]*100%/i, noShow: /no[- ]shows?[^.]*100%/i, payment: [/day of your tour/i, /on site/i, /cash/i], noPrepayment: /no advance payment/i },
  ko: { previous: /전날[^.]*무료/, sameDay: /당일 취소[^.]*100%/, noShow: /노쇼[^.]*100%/, payment: [/투어 당일/, /현장/, /현금/], noPrepayment: /선결제는 없습니다/ },
  "zh-tw": { previous: /前一天[^。]*免費/, sameDay: /當天取消[^。]*100%/, noShow: /未到場[^。]*100%/, payment: [/行程當天/, /現場/, /現金/], noPrepayment: /無須預付/ },
}
// 事前決済なしと、当日受領後の当店判断中止による返金は両立する。
const refundPromise = /\brefund(?:s|ed|ing)?\b|返金|払い戻し|환불|退款/i

function assertCancellationAndPayment(text, locale, label) {
  const check = checks[locale]
  const copy = getBookingPolicyCopy(locale)
  for (const condition of [check.previous, check.sameDay, check.noShow, ...check.payment]) assert.match(text, condition, label)
  assert.ok(text.includes(copy.weatherNotice), `${label}: 事業者判断の悪天候中止は両料金とも請求なし`)
  assert.ok(text.includes(copy.setPaymentNotice), `${label}: セットは最初に全額受領`)
  assert.match(text, refundPromise, `${label}: 受領済み時の返金を案内`)
}

test("前日までのキャンセル料率は0%で、旧 CANCELLATION_POLICY も同じ正本を参照", () => {
  assert.equal(BOOKING_POLICY.previousDayCancellationPercent, 0)
  assert.equal(CANCELLATION_POLICY.previousDay, "無料")
  assert.strictEqual(legacyPolicy, CANCELLATION_POLICY)
})

test("当日キャンセル料率は100%", () => {
  assert.equal(BOOKING_POLICY.sameDayCancellationPercent, 100)
  assert.equal(CANCELLATION_POLICY.sameDay, formatCancellationFee(BOOKING_POLICY.sameDayCancellationPercent))
})

test("無断キャンセル料率は100%で、当日キャンセルと独立した事実を保持", () => {
  assert.equal(BOOKING_POLICY.noShowCancellationPercent, 100)
  assert.equal(CANCELLATION_POLICY.noShow, formatCancellationFee(BOOKING_POLICY.noShowCancellationPercent))
})

test("当店判断の悪天候中止はキャンセル料とツアー料金の両方を請求しない", () => {
  assert.equal(BOOKING_POLICY.operatorWeatherCancellationPercent, 0)
  assert.equal(BOOKING_POLICY.operatorWeatherTourChargePercent, 0)
  assert.equal(CANCELLATION_POLICY.weatherCancellation, "無料")
})

test("事前決済はないが当日受領後の当店判断中止では返金する", () => {
  assert.equal(BOOKING_POLICY.prepaid, false)
  for (const locale of Object.keys(checks)) {
    const copy = getBookingPolicyCopy(locale)
    assert.match(copy.prepaymentNotice, checks[locale].noPrepayment, locale)
    assert.match(copy.weatherNotice, refundPromise, locale)
    assert.match(copy.partialCancellationNotice, refundPromise, locale)
  }
})

test("支払日はツアー当日・支払場所は現地・支払方法は現金", () => {
  assert.equal(BOOKING_POLICY.paymentTiming, "tour_day")
  assert.equal(BOOKING_POLICY.paymentLocation, "on_site")
  assert.equal(BOOKING_POLICY.paymentMethod, "cash")
  for (const locale of Object.keys(checks)) {
    for (const condition of checks[locale].payment) assert.match(getBookingPolicyCopy(locale).paymentSummary, condition, locale)
  }
})

test("4言語の共通表示は前日無料・当日100%・無断100%・悪天候請求なしを示す", () => {
  const free = { ja: "無料", en: "free", ko: "무료", "zh-tw": "免費" }
  const weather = {
    ja: /当店判断.*ツアー料金・キャンセル料は請求しません/,
    en: /we cancel.*neither the tour fee nor a cancellation fee is charged/i,
    ko: /저희가.*투어 요금과 취소 수수료 모두 청구하지 않습니다/,
    "zh-tw": /由我們取消.*不收取行程費用或取消費用/,
  }
  for (const locale of Object.keys(checks)) {
    const copy = getBookingPolicyCopy(locale)
    assert.equal(copy.previousDayFee, free[locale], locale)
    assert.equal(copy.sameDayFee, `${BOOKING_POLICY.sameDayCancellationPercent}%`, locale)
    assert.equal(copy.noShowFee, `${BOOKING_POLICY.noShowCancellationPercent}%`, locale)
    assert.match(copy.weatherNotice, weather[locale], locale)
  }
})

test("日本語の利用規約・特商法・FAQ・予約フォームは同じキャンセルと支払条件を表示", () => {
  const texts = [
    ["利用規約", pageText("app/(ja)/terms/page.tsx")],
    ["特商法", pageText("app/(ja)/tokushoho/page.tsx")],
    ["FAQ", FAQ_ENTRIES.find((faq) => faq.id === "faq-11").answer],
    ["予約フォーム", formPolicyText()],
  ]
  for (const [label, text] of texts) assertCancellationAndPayment(text, "ja", label)
  const copy = getBookingPolicyCopy()
  const paymentFaq = FAQ_ENTRIES.find((faq) => faq.id === "faq-10").answer
  assert.ok(paymentFaq.includes(copy.paymentSummary))
  assert.ok(paymentFaq.includes(copy.prepaymentNotice))
  assert.ok(pageText("app/(ja)/safety/page.tsx").includes(copy.weatherNotice))
  assert.ok(FAQ_ENTRIES.find((faq) => faq.id === "home-03").answer.includes(copy.weatherNotice))
})

for (const locale of locales.INTL_LOCALES) {
  test(`${locale}: 規約・FAQ・予約フォームも日本語と同じキャンセル・支払条件`, () => {
    const dictionary = dictionaries.getDict(locale)
    const cancellationQuestion = { en: /cancellation fee/i, ko: /취소 수수료/, "zh-tw": /取消.*手續費/ }[locale]
    const cancellationFaq = dictionary.faqs.find((faq) => cancellationQuestion.test(faq.question))
    assert.ok(cancellationFaq, `${locale}: キャンセルFAQがない`)
    const termsText = pageText("components/intl/legal-page.tsx", { locale, kind: "terms" }, "IntlLegalPage")
    const texts = [["規約", termsText], ["FAQ", cancellationFaq.answer], ["予約フォーム", formPolicyText(locale)]]
    for (const [label, text] of texts) assertCancellationAndPayment(text, locale, `${locale}: ${label}`)
    assert.ok(termsText.includes(getBookingPolicyCopy(locale).partialCancellationNotice), locale)
  })
}

test("全プランの支払い説明は当日現地現金で、近日公開の予定注記も維持", () => {
  const copy = getBookingPolicyCopy()
  for (const plan of [...PLANS, ...Object.values(PLAN_DETAILS)]) {
    assert.ok(plan.paymentMethod.includes(copy.paymentSummary), plan.id)
    if (plan.status === "coming_soon") assert.match(plan.paymentMethod, /予定/, plan.id)
  }
})

test("セットの一部中止は内部配分ではなく実施単品料金で請求し、全セットの説明に単品正本価格を掲載", () => {
  assert.equal(BOOKING_POLICY.partialCancellationSettlement, "performed_single_tour_prices")
  const copy = getBookingPolicyCopy()
  assert.match(copy.partialCancellationNotice, /当店判断.*実際に実施した単品ツアー分だけ/)
  assert.ok(pageText("app/(ja)/terms/page.tsx").includes(copy.partialCancellationNotice))
  for (const [id, singleIds] of Object.entries(COMBO_COMPONENT_PLAN_IDS)) {
    const faq = PLAN_DETAILS[id].faqs.find((entry) => /中止.*料金/.test(entry.q))
    const plan = PLANS.find((candidate) => candidate.id === id)
    assert.ok(faq, id)
    assert.ok(faq.a.includes(copy.partialCancellationNotice), id)
    assert.ok(plan.description.includes(copy.partialCancellationNotice), `${id}: PLANS の顧客説明`)
    assert.ok(plan.description.includes(copy.weatherNotice), `${id}: 全中止は請求なし`)
    for (const singleId of singleIds) {
      const single = PLAN_PRICE_DATA[singleId]
      for (const amount of new Set([single.price, single.childPrice ?? single.price])) {
        for (const [source, text] of [["FAQ", faq.a], ["PLANS", plan.description]]) {
          assert.ok(text.includes(`¥${amount.toLocaleString("ja-JP")}`), `${source} ${id}: ${singleId} の単品料金 ${amount}`)
        }
      }
    }
  }
})

test("返金の案内は当店判断の中止に限定し、お客様都合の料率を変えない", () => {
  for (const locale of Object.keys(checks)) {
    const copy = getBookingPolicyCopy(locale)
    assert.match(copy.weatherNotice, refundPromise)
    assert.match(copy.partialCancellationNotice, refundPromise)
    assert.equal(copy.sameDayFee, "100%")
    assert.equal(copy.noShowFee, "100%")
  }
  const copy = getBookingPolicyCopy()
  assert.match(copy.weatherNotice, /全構成を中止.*すでに料金を受領.*全額返金/)
  assert.match(copy.partialCancellationNotice, /受領済みセット料金.*合計.*差し引いた金額を返金/)
})

test("規約・予約フォーム・安全ページは妊娠不可と持病の事前相談を別に表示", () => {
  const copy = getBookingPolicyCopy()
  for (const text of [pageText("app/(ja)/terms/page.tsx"), pageText("app/(ja)/safety/page.tsx"), formPolicyText()]) {
    assert.ok(text.includes(copy.pregnancyNotice))
    assert.match(text, /持病.*予約前.*相談/)
    assert.doesNotMatch(text, /持病・妊娠.*相談/)
  }
  for (const locale of locales.INTL_LOCALES) {
    const translated = getBookingPolicyCopy(locale)
    for (const text of [pageText("components/intl/legal-page.tsx", { locale, kind: "terms" }, "IntlLegalPage"), formPolicyText(locale)]) {
      assert.ok(text.includes(translated.pregnancyNotice))
      assert.ok(text.includes(translated.healthConsultationNotice))
    }
  }
})

test("表示文の料率は固定文字列ではなく、渡された構造化ポリシーから導出する", () => {
  // 実ファイル・実exportは変更しない。別の評価環境へ仮の正本を渡して依存関係を検査する。
  const changedPolicy = { ...BOOKING_POLICY, previousDayCancellationPercent: 5, sameDayCancellationPercent: 75, noShowCancellationPercent: 90, operatorWeatherCancellationPercent: 10, operatorWeatherTourChargePercent: 20, prepaid: true }
  const exports = {}
  const { outputText } = ts.transpileModule(read("lib/booking-policy-copy.ts"), { compilerOptions })
  new Function("require", "exports", outputText)((id) => {
    assert.equal(id, "@/lib/booking-policy")
    return { ...policy, BOOKING_POLICY: changedPolicy }
  }, exports)
  for (const locale of Object.keys(checks)) {
    const copy = exports.getBookingPolicyCopy(locale)
    assert.equal(copy.previousDayFee, "5%", locale)
    assert.equal(copy.sameDayFee, "75%", locale)
    assert.equal(copy.noShowFee, "90%", locale)
    assert.match(copy.weatherNotice, /20%/, locale)
    assert.match(copy.weatherNotice, /10%/, locale)
    assert.notEqual(copy.prepaymentNotice, getBookingPolicyCopy(locale).prepaymentNotice, locale)
  }
})
