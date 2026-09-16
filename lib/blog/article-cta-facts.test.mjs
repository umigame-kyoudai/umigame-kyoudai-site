import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import React from "react"
import * as jsxRuntime from "react/jsx-runtime"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

import * as articleCta from "./article-cta.ts"
import { getBlogPostCta } from "./index.ts"
import { getPlanPriceDisplay } from "../plan-price-display.ts"
import { FREE_UNDER3_PLAN_IDS, getParticipantAgeRange, isNightTourPlan, PRIVATE_COUNTERPART, PRIVATE_PLAN_IDS, SENIOR_RESTRICTED_AGE, SENIOR_RESTRICTED_PLAN_IDS } from "../plan-flags.ts"
import { getPlanRentalOptions } from "../rental-options.ts"
import { FAQ_ENTRIES } from "../faq.ts"
import { getMeetingPlaceNotice } from "../meeting-guidance.ts"

const { ARTICLE_CTA_CONFIGS, getCtaPriceNote } = articleCta
const entries = Object.entries(ARTICLE_CTA_CONFIGS)
const cardFor = (slug, position) => ARTICLE_CTA_CONFIGS[slug].cards.find((card) => card.position === position)
const cardText = (card) => [card.title, card.description, ...(card.features ?? []), getCtaPriceNote(card)].join("\n")
const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8")

// 実コンポーネントの文章・料金・予約リンクを描画する。外部通信と計測は使用しない。
const compiled = ts.transpileModule(read("components/blog/article-cta-card.tsx"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const componentExports = {}
new Function("exports", "require", compiled)(componentExports, (name) => {
  if (name === "react/jsx-runtime") return jsxRuntime
  if (name === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children) }
  if (name === "lucide-react") return { Check: () => null, MessageCircle: () => null, Waves: () => null }
  if (name === "@/lib/blog/article-cta") return articleCta
  if (name === "@/lib/detailed-analytics") return { sendDetailedEvent: () => { throw new Error("No analytics in local render tests") } }
  throw new Error(`Unexpected dependency: ${name}`)
})
const renderCard = (card) => renderToStaticMarkup(React.createElement(componentExports.ArticleCtaCard, { card, campaign: "local_regression" }))

test("持ち物記事のS1カードは通常レンタル料金と大人用マスク条件を正本どおり表示する", () => {
  const card = cardFor("miyakojima-snorkeling-outfit-packing", "article_middle")
  assert.equal(card.primary.planId, "S1")
  const html = renderCard(card)
  for (const option of getPlanRentalOptions(card.primary.planId)) {
    const fee = option.price === 0 ? "無料" : `${option.price.toLocaleString("ja-JP")}円`
    assert.ok(html.includes(`${option.name}は${fee}`), `${option.name}: ${fee}`)
  }
  assert.match(html, /度付きマスクは大人用のみ/)
  assert.match(html, /子供用のご用意はありません/)
  assert.doesNotMatch(html, /無料で貸し出し|追加料金はかかりません/)
  assert.match(html, /href="\/book\?plan=S1&amp;/)
})

test("C1を予約する記事カードは3歳以下無料と案内せず、修正対象2記事で全員の最低年齢を明示する", () => {
  const minimum = getParticipantAgeRange("C1", "child").min
  assert.equal(FREE_UNDER3_PLAN_IDS.has("C1"), false)
  for (const [slug, config] of entries) {
    for (const card of config.cards.filter((item) => item.primary.planId === "C1")) {
      assert.doesNotMatch(cardText(card), /3歳以下無料|0歳から参加/, `${slug}/${card.position}`)
    }
  }
  for (const slug of ["miyakojima-tourism-latest-2026", "miyakojima-local-izakaya-guide"]) {
    const card = cardFor(slug, "article_bottom")
    const html = renderCard(card)
    assert.ok(html.includes(`参加者全員${minimum}歳以上`), slug)
    assert.match(html, /href="\/book\?plan=C1&amp;/, slug)
    assert.ok(html.includes(getPlanPriceDisplay("C1").compact), slug)
  }
  // 夜単品とセットを同じカードで紹介するときも、無料条件をセットへ流用しない。
  for (const slug of ["miyakojima-night-tour-yashigani-guide", "miyakojima-family-2nights-3days"]) {
    const text = cardText(cardFor(slug, "article_bottom"))
    assert.ok(text.includes(`昼夜セットは参加者全員${minimum}歳以上`), slug)
  }
})

test("貸切を紹介する3カードは主予約先・プランID・表示料金を対応する貸切へ揃える", () => {
  const cases = [
    ["miyakojima-sup-beginner-guide", "article_bottom", "S8"],
    ["miyakojima-family-2nights-3days", "article_middle", "S1"],
    ["miyakojima-couple-romantic-2nights-3days", "article_middle", "S8"],
  ]
  for (const [slug, position, standardId] of cases) {
    const card = cardFor(slug, position)
    const privateId = PRIVATE_COUNTERPART[standardId].id
    assert.equal(card.primary.planId, privateId, slug)
    assert.ok(PRIVATE_PLAN_IDS.has(card.primary.planId), slug)
    assert.equal(new URL(card.primary.href, "https://local.test").searchParams.get("plan"), privateId, slug)
    assert.equal(getCtaPriceNote(card), getPlanPriceDisplay(privateId).compact, slug)
    const html = renderCard(card)
    assert.ok(html.includes(getPlanPriceDisplay(privateId).compact), slug)
    assert.ok(html.includes(`/book?plan=${privateId}&amp;`), slug)
    assert.ok(!html.includes(`/book?plan=${standardId}&amp;`), slug)
  }
})

test("通常ナイトへの全記事カード・関連紹介に60歳以上の貸切必須条件が表示される", () => {
  let checkedCards = 0
  let checkedRelated = 0
  for (const [slug, config] of entries) {
    for (const card of config.cards) {
      for (const action of [card.primary, card.secondary]) {
        const id = action?.planId
        if (!id || !isNightTourPlan(id) || !SENIOR_RESTRICTED_PLAN_IDS.has(id)) continue
        checkedCards++
        const html = renderCard(card)
        assert.ok(html.includes(`${SENIOR_RESTRICTED_AGE}歳以上の方を含むグループ`), `${slug}/${card.position}`)
        assert.ok(html.includes(`${PRIVATE_COUNTERPART[id].name}のご予約が必要`), `${slug}/${card.position}`)
      }
    }
    for (const item of config.related) {
      if (item.kind !== "plan" || !isNightTourPlan(item.planId) || !SENIOR_RESTRICTED_PLAN_IDS.has(item.planId)) continue
      checkedRelated++
      assert.ok(item.description.includes(`${SENIOR_RESTRICTED_AGE}歳以上`), slug)
      assert.ok(item.description.includes(`${PRIVATE_COUNTERPART[item.planId].name}のご予約が必要`), slug)
    }
  }
  assert.ok(checkedCards > 0)
  assert.ok(checkedRelated > 0)
  assert.equal(articleCta.getCtaNightParticipationNotice("S5"), "", "貸切ナイトに別プラン必須の案内を追加しない")
  assert.equal(articleCta.getCtaNightParticipationNotice("S1"), "", "海のみのカードは今回の自動注記の対象外")
})

test("駐車場FAQとアクセスの実表示は海前日・夜当日のLINE案内に一致する", () => {
  const faq = FAQ_ENTRIES.find((entry) => entry.id === "faq-16")
  assert.ok(faq.answer.includes(getMeetingPlaceNotice("")))
  assert.match(faq.answer, /海系ツアーは前日.*ナイトツアーは当日.*LINE/)
  assert.doesNotMatch(faq.answer, /駐車場の場所はツアー前日/)

  const source = read("app/(ja)/access/page.tsx")
  const ast = ts.createSourceFile("access.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let paragraph
  const visit = (node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === "p" && node.getText(ast).includes("レンタカーでのお越し")) paragraph = node.getText(ast)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.ok(paragraph, "駐車場の案内段落が見つからない")
  const output = ts.transpileModule(`const Paragraph = () => (${paragraph});`, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const Paragraph = new Function("React", "getMeetingPlaceNotice", `${output}; return Paragraph`)(React, getMeetingPlaceNotice)
  const html = renderToStaticMarkup(React.createElement(Paragraph))
  assert.ok(html.includes(getMeetingPlaceNotice("")))
  assert.match(html, /海系ツアーは前日.*ナイトツアーは当日.*LINE/)
  assert.doesNotMatch(html, /駐車場情報は前日のLINE/)
})

test("汎用ブログCTAもナイトの記事では同じ60歳以上の貸切条件を案内する", () => {
  for (const keyword of ["ナイトツアー", "ヤシガニ", "夜行性"]) {
    const cta = getBlogPostCta({ title: keyword, category: "観光", tags: [] })
    assert.equal(cta.primaryHref, "/plans/S3")
    assert.equal(cta.secondaryHref, "/book?plan=S3")
    assert.ok(cta.description.includes(`${SENIOR_RESTRICTED_AGE}歳以上の方を含むグループ`))
    assert.ok(cta.description.includes(`${PRIVATE_COUNTERPART.S3.name}のご予約が必要`))
  }
  const sea = getBlogPostCta({ title: "ウミガメシュノーケル", category: "海", tags: [] })
  assert.ok(!sea.description.includes(PRIVATE_COUNTERPART.S3.name))
})
