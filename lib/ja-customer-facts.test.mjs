import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

import { PLANS } from "./data.ts"
import { PLAN_DETAILS } from "./plan-details.ts"
import { PLAN_PRICE_DATA } from "./plan-price-display.ts"
import { getPlanMaxParticipants } from "./booking-rules.ts"
import { FAQ_ENTRIES } from "./faq.ts"
import { PRIVATE_COUNTERPART, SENIOR_RESTRICTED_PLAN_IDS } from "./plan-flags.ts"
import { getBookingPolicyCopy } from "./booking-policy-copy.ts"

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")

test("全プランとFAQの持病案内は予約前の相談必須・確認後の参加可否案内", () => {
  const texts = [
    ...Object.values(PLAN_DETAILS).map((plan) => [plan.id, plan.precautions.join("\n")]),
    ...PLANS.map((plan) => [plan.id, plan.precautions.join("\n")]),
    ["faq", FAQ_ENTRIES.find((entry) => entry.id === "faq-24").answer],
  ]
  for (const [id, text] of texts) {
    assert.match(text, /持病.*必ず予約前に.*相談/, id)
    assert.match(text, /内容を確認したうえで参加可否/, id)
    assert.doesNotMatch(text, /持病[^。\n]*参加不可/, id)
  }
})

test("ナイトツアーの顧客向け所要は90分でサンダル参加可・歩きやすい靴推奨", () => {
  for (const id of ["S3", "S5"]) {
    assert.equal(PLAN_DETAILS[id].duration, "約1.5時間", id)
    assert.equal(PLANS.find((plan) => plan.id === id).durationHours, 1.5, id)
    for (const plan of [PLAN_DETAILS[id], PLANS.find((plan) => plan.id === id)]) {
      assert.match(plan.whatToBring.join("\n"), /サンダルでも参加可能ですが、歩きやすい靴をおすすめします/, id)
    }
  }
  assert.match(FAQ_ENTRIES.find((entry) => entry.id === "faq-19").answer, /ナイトツアーもサンダルで参加可能.*歩きやすい靴/)
})

test("海空セットは顧客向け約3時間で移動時間による延長を明示", () => {
  for (const id of ["C3", "C4"]) {
    const detail = PLAN_DETAILS[id]
    assert.match(detail.duration, /^約3時間/, id)
    assert.equal(PLANS.find((plan) => plan.id === id).durationHours, 3, id)
    assert.equal(detail.flow.filter((step) => step.time === "約1.5時間").length, 2, id)
    assert.match(detail.precautions.join("\n"), /別のビーチへ移動.*移動時間の分だけ延長/, id)
    assert.doesNotMatch(JSON.stringify(detail), /3\.5[〜～-]4時間/, id)
  }
  // 昼夜セットの顧客向け2時間は、内部カレンダーの90分と別用途。
  for (const id of ["C1", "C2"]) {
    assert.equal(PLAN_DETAILS[id].flow[1].time, "約2時間", id)
    assert.equal(PLANS.find((plan) => plan.id === id).durationHours, 3.5, id)
  }
})

test("セットの当店判断による一部中止は実施した単品料金だけを請求", () => {
  const components = { C1: ["S1", "S3"], C2: ["S2", "S5"], C3: ["S1", "S6"], C4: ["S2", "S7"], C5: ["S1", "S6", "S3"], C6: ["S2", "S7", "S5"] }
  for (const [id, singles] of Object.entries(components)) {
    const answer = PLAN_DETAILS[id].faqs.find((faq) => /中止.*料金/.test(faq.q)).a
    assert.ok(answer.includes(getBookingPolicyCopy().partialCancellationNotice), id)
    for (const single of singles) {
      const prices = PLAN_PRICE_DATA[single]
      for (const price of new Set([prices.price, prices.childPrice ?? prices.price])) {
        assert.ok(answer.includes(`¥${price.toLocaleString("ja-JP")}`), `${id}: ${single} 単品 ${price} 円が案内にない`)
      }
    }
  }
})

test("子連れ記事はC1全員5歳以上・参加者が異なる場合は単品予約かLINE相談", () => {
  const text = read("content/blog/miyakojima-kids-snorkeling-age-guide.md")
  assert.match(text, /予約参加者全員が5歳以上/)
  assert.match(text, /0〜4歳.*参加者が異なる場合.*単品.*LINE/)
  assert.doesNotMatch(text, /夜は家族全員.*昼夜セット/)
})

test("ブログの貸切SUP相談人数は定員+1、ナイトツアーは0歳から", () => {
  const sup = read("content/blog/miyakojima-drone-sup-guide.md")
  const match = sup.match(/最大(\d+)名までWeb予約可能です。(\d+)名以上/)
  assert.ok(match)
  assert.equal(Number(match[1]), getPlanMaxParticipants("S7"))
  assert.equal(Number(match[2]), getPlanMaxParticipants("S7") + 1)
  const night = read("content/blog/miyakojima-repeater-deep-guide.md")
  assert.match(night, /はい、0歳から参加できます。3歳以下は無料/)
  assert.doesNotMatch(night, /1歳から参加できます/)
})

test("ホームの60歳以上の案内は通常7プランすべてで対応する貸切へ導く", () => {
  const source = read("components/home/plans-section.tsx")
  const ast = ts.createSourceFile("plans-section.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const component = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "SeniorParticipationNote")
  assert.ok(component, "ホームの参加条件案内がない")
  const compiled = ts.transpileModule(component.getText(ast), { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText
  const Link = ({ href, children }) => React.createElement("a", { href }, children)
  const renderNote = new Function("React", "Link", "PRIVATE_COUNTERPART", "SENIOR_RESTRICTED_PLAN_IDS", `${compiled}; return SeniorParticipationNote`)(React, Link, PRIVATE_COUNTERPART, SENIOR_RESTRICTED_PLAN_IDS)
  for (const id of Object.keys(PLAN_DETAILS)) {
    const html = renderToStaticMarkup(React.createElement(renderNote, { planId: id }))
    if (SENIOR_RESTRICTED_PLAN_IDS.has(id)) {
      assert.match(html, /60歳以上/, id)
      assert.ok(html.includes(`href="/plans/${PRIVATE_COUNTERPART[id].id}"`), id)
      assert.match(html, /ご予約が必要/, id)
    } else {
      assert.equal(html, "", id)
    }
  }
  assert.match(source, /<SeniorParticipationNote planId=\{variant\.id\}/, "選択中のカードに条件案内がない")
  assert.match(source, /<SeniorParticipationNote planId=\{item\.id\}/, "比較表に条件案内がない")
})
