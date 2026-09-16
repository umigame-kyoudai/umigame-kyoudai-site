import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

import { getHomeComboSavingsText, getHomePlanFacts, getHomeRentalHighlight } from "./home-plan-facts.ts"
import { getPlanMaxParticipants } from "./booking-rules.ts"
import { PLAN_DETAILS } from "./plan-details.ts"
import { getCustomerDurationLabel } from "./plan-durations.ts"
import { getParticipantAgeRange, PRIVATE_PLAN_IDS } from "./plan-flags.ts"
import { getComboSavings, getPlanCode, PLAN_PRICE_DATA } from "./plan-price-display.ts"
import { getRentalUnitPrice, planOffersRentals } from "./rental-options.ts"
import { getBookingPolicyCopy } from "./booking-policy-copy.ts"
import { pagePath } from "./routes.ts"

const source = readFileSync(new URL("../components/home/plans-section.tsx", import.meta.url), "utf8")
const ast = ts.createSourceFile("plans-section.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

// 実際のカードと価格コンポーネントを描画する。Next の画像・リンクとアイコンだけを置換し、
// 関係のないカルーセルのブラウザー動作を起動せず表示データの接続を検査する。
const componentNames = new Set(["priceToneClass", "PlanPricePair", "TourCard"])
const componentSource = ast.statements
  .filter((node) => ts.isFunctionDeclaration(node) && componentNames.has(node.name?.text))
  .map((node) => node.getText(ast))
  .join("\n")
const compiled = ts.transpileModule(componentSource, {
  compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
}).outputText
const scope = {
  React,
  useState: React.useState,
  getHomePlanFacts,
  getPlanCode,
  pagePath,
  TourImageCarousel: () => null,
  SeniorParticipationNote: () => null, // 通常7プランと貸切案内先の対応は ja-customer-facts.test.mjs で検査。
  Clock: () => null,
  Users: () => null,
  Check: () => null,
  Link: ({ href, children }) => React.createElement("a", { href }, children),
  trackEvent: () => {},
}
const { TourCard } = new Function(...Object.keys(scope), `${compiled}; return { TourCard }`)(...Object.values(scope))

function renderCard(id) {
  return renderToStaticMarkup(React.createElement(TourCard, {
    tour: { tagline: "ホームの訴求", variants: [{ id, highlights: [] }] },
  }))
}

const visibleText = (html) => html.replace(/<[^>]*>/g, "")

test("ホーム比較表の各行も名称・料金・年齢・所要時間・人数条件を正本から表示", () => {
  const quickCompareDeclaration = ast.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((declaration) => declaration.name.getText(ast) === "quickCompare")
  const quickCompare = new Function(`return ${quickCompareDeclaration.initializer.getText(ast)}`)()
  const section = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "PlansSection")
  const sectionCode = ts.transpileModule(section.getText(ast).replace(/^export /, ""), {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const sectionScope = {
    ...scope,
    bookingPolicyCopy: getBookingPolicyCopy(),
    useRef: React.useRef,
    useEffect: React.useEffect,
    quickCompare,
    tours: [], // カードは上記の実カード検査に任せ、比較表の行だけを対象にする。
    ComingSoonBadge: () => null,
    Camera: () => null,
    Shield: () => null,
    ChevronLeft: () => null,
    ChevronRight: () => null,
  }
  const PlansSection = new Function(...Object.keys(sectionScope), `${sectionCode}; return PlansSection`)(...Object.values(sectionScope))
  const rows = renderToStaticMarkup(React.createElement(PlansSection)).split('class="grid grid-cols-4 border-t').slice(1)
  assert.equal(rows.length, quickCompare.length)
  quickCompare.forEach(({ id }, index) => {
    const facts = getHomePlanFacts(id)
    const price = PLAN_PRICE_DATA[id]
    const text = visibleText(rows[index])
    for (const expected of [
      facts.name,
      `大人¥${price.price.toLocaleString("ja-JP")}`,
      `子供¥${(price.childPrice ?? price.price).toLocaleString("ja-JP")}`,
      facts.age,
      facts.duration,
      facts.capacityNote ?? "",
    ]) assert.ok(text.includes(expected), `${id}: ${expected}`)
  })
})

test("ホームカードの大人・子供料金は全プランで PLAN_PRICE_DATA と一致", () => {
  for (const [id, price] of Object.entries(PLAN_PRICE_DATA)) {
    const text = visibleText(renderCard(id))
    assert.ok(text.includes(`大人¥${price.price.toLocaleString("ja-JP")}`), id)
    assert.ok(text.includes(`子供¥${(price.childPrice ?? price.price).toLocaleString("ja-JP")}`), id)
  }
})

test("ホームカードの年齢範囲は予約の最少年齢・成人上限から導出し、近日公開の注記を維持", () => {
  for (const id of Object.keys(PLAN_DETAILS)) {
    const minimum = getParticipantAgeRange(id, "under3")?.min ?? getParticipantAgeRange(id, "child").min
    const maximum = getParticipantAgeRange(id, "adult").max
    const expected = `${minimum}〜${maximum}歳${PLAN_DETAILS[id].status === "coming_soon" ? "予定" : ""}`
    assert.equal(getHomePlanFacts(id).age, expected, id)
    assert.ok(visibleText(renderCard(id)).includes(expected), id)
  }
})

test("ホームの最大人数とLINE相談の境界は booking-rules と一致", () => {
  for (const id of Object.keys(PLAN_DETAILS)) {
    const facts = getHomePlanFacts(id)
    const max = getPlanMaxParticipants(id)
    assert.equal(facts.maxParticipants, max, id)
    if (max === undefined) {
      assert.equal(facts.capacityNote, undefined, id)
    } else {
      const expected = `最大${max}名・${max + 1}名以上はLINE相談`
      assert.equal(facts.capacityNote, expected, id)
      assert.ok(visibleText(renderCard(id)).includes(expected), id)
    }
  }
})

test("ホームの名称・所要時間・含まれるものは選択プランの正本を表示", () => {
  for (const [id, detail] of Object.entries(PLAN_DETAILS)) {
    const facts = getHomePlanFacts(id)
    const text = visibleText(renderCard(id))
    assert.equal(facts.name, detail.name, id)
    assert.equal(facts.duration, getCustomerDurationLabel(id), id)
    assert.strictEqual(facts.included, detail.included, id)
    assert.ok(text.includes(detail.name), id)
    assert.ok(text.includes(facts.duration), id)
    for (const included of detail.included) assert.ok(text.includes(included), `${id}: ${included}`)
  }
  for (const id of ["C3", "C4"]) assert.equal(getHomePlanFacts(id).duration, "約3時間", id)
})

test("ホームの貸切レンタル案内は無料料金の正本を使用し大人用マスクを明示", () => {
  for (const id of PRIVATE_PLAN_IDS) {
    assert.equal(getRentalUnitPrice(id), 0, id)
    if (!planOffersRentals(id)) continue
    assert.equal(getHomeRentalHighlight(id, "ウェットスーツ"), "ウェットスーツ無料", id)
    assert.equal(getHomeRentalHighlight(id, "度付きマスク"), "度付きマスク無料（大人用のみ）", id)
    assert.ok(getHomePlanFacts(id).included.includes("ウェットスーツ"), id)
    assert.ok(getHomePlanFacts(id).included.includes("度付きマスク（大人用のみ）"), id)
  }
})

test("ホームのセット割引と幼児無料案内は料金・参加区分の正本から導出", () => {
  for (const id of ["C1", "C2", "C3", "C4", "C5", "C6"]) {
    assert.equal(getHomeComboSavingsText(id), `通常より${getComboSavings(id).savings.toLocaleString("ja-JP")}円お得`, id)
  }
  for (const id of Object.keys(PLAN_DETAILS)) {
    const freeChildRange = getParticipantAgeRange(id, "under3")
    assert.equal(getHomePlanFacts(id).freeChildNote, freeChildRange ? `${freeChildRange.max}歳以下は無料` : "", id)
  }
})

test("ホームの tours / quickCompare に名称・料金・年齢・時間・含むものの複製を持たせない", () => {
  const forbidden = new Set(["name", "price", "priceNote", "childPrice", "age", "duration", "time", "included", "maxParticipants"])
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!["tours", "quickCompare"].includes(declaration.name.getText(ast))) continue
      function inspect(node) {
        if (ts.isPropertyAssignment(node)) {
          assert.ok(!forbidden.has(node.name.getText(ast)), `${declaration.name.getText(ast)}: ${node.name.getText(ast)}`)
        }
        ts.forEachChild(node, inspect)
      }
      inspect(declaration.initializer)
    }
  }
})
