import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import test from "node:test"
import ts from "typescript"

import { getDict } from "./dict.ts"
import { getEnPrice, EN_PRICE_DATA } from "./en-prices.ts"
import { INTL_LOCALES, INTL_PLAN_IDS } from "./locales.ts"
import {
  formatIntlAgeNote, formatIntlFreeChildNote, formatIntlGroupLimit, formatIntlNightTimeNote,
  formatIntlRentalFee, formatIntlTime, formatIntlTimeList, formatIntlYen, getIntlPlanFacts,
} from "./plan-facts.ts"
import { getPlanMaxParticipants } from "../booking-rules.ts"
import { getCustomerDurationHours, getCustomerDurationMinutes } from "../plan-durations.ts"
import {
  ADULT_AGE_MIN, DAY_SUP_TIMES, FREE_UNDER3_PLAN_IDS, NIGHT_TOUR_TIMES,
  PRIVATE_COUNTERPART, SENIOR_RESTRICTED_AGE, SENIOR_RESTRICTED_PLAN_IDS, getAdultAgeMax, getParticipantAgeRange,
} from "../plan-flags.ts"
import { PLAN_PRICE_DATA } from "../plan-price-display.ts"
import { getRentalUnitPrice, planOffersRentals } from "../rental-options.ts"

const root = fileURLToPath(new URL("../../", import.meta.url))
const numbers = (text) => (text.match(/\d+/g) ?? []).map(Number)

// 別プロセスのメモリ上で正本を差し替え、辞書を初回ロードする。
// ファイル・Git・本番状態は一切変更せず、他のテストへ変更を漏らさない。
function changedSources(replacements, afterLoad = "") {
  const script = `
    import assert from "node:assert/strict";
    import { registerHooks } from "node:module";
    const replacements = ${JSON.stringify(replacements)};
    const changed = new Set();
    registerHooks({ load(url, context, nextLoad) {
      const result = nextLoad(url, context);
      const file = Object.keys(replacements).find((file) => url.endsWith("/" + file));
      if (!file) return result;
      let source = String(result.source);
      for (const [before, after] of replacements[file]) {
        assert.ok(source.includes(before), file + ": fixture no longer matches " + before);
        source = source.replace(before, after);
      }
      changed.add(file);
      return { ...result, source };
    }});
    ${afterLoad}
    const { getDict } = await import("./lib/i18n/dict.ts");
    const { getIntlPlanFacts, formatIntlFreeChildNote, formatIntlGroupLimit } = await import("./lib/i18n/plan-facts.ts");
    const { getParticipantAgeRange } = await import("./lib/plan-flags.ts");
    const output = Object.fromEntries(["en", "ko", "zh-tw"].map((locale) => {
      const dict = getDict(locale);
      return [locale, {
        plans: dict.planById, faqs: dict.faqs, home: dict.home, guide: dict.guide,
        form: { addAdult: dict.form.addAdult, addChild: dict.form.addChild(6, getParticipantAgeRange("S2", "child").max), addUnder3: dict.form.addUnder3,
          guestCategoryLabel: dict.form.guestCategoryLabel, needAdultError: dict.form.needAdultError, seniorNotice: dict.form.seniorNotice,
          partySummary: dict.form.partySummary({ adult: 1, child: 0, under3: 1 }) },
        facts: Object.fromEntries(["S2", "S3", "S4", "S5", "S7"].map((id) => [id, getIntlPlanFacts(id)])),
        freeNight: formatIntlFreeChildNote("S5", locale), nightGroup: formatIntlGroupLimit("S5", locale),
      }];
    }));
    assert.deepEqual([...changed].sort(), Object.keys(replacements).sort());
    console.log(JSON.stringify(output));
  `
  const result = spawnSync(process.execPath, ["--import", "./scripts/test-alias-hooks.mjs", "--input-type=module", "-e", script], {
    cwd: root, encoding: "utf8", timeout: 20_000,
  })
  assert.equal(result.status, 0, result.stderr || String(result.error))
  return JSON.parse(result.stdout)
}

test("翻訳用事実は全掲載プランで料金・参加区分・上限・所要時間の正本を参照", () => {
  assert.deepEqual(EN_PRICE_DATA, {}, "現在は日本語と同額の確定仕様")
  for (const id of INTL_PLAN_IDS) {
    const facts = getIntlPlanFacts(id)
    const expectedPrice = getEnPrice({ id, ...PLAN_PRICE_DATA[id] })
    const child = getParticipantAgeRange(id, "child")
    const free = getParticipantAgeRange(id, "under3")
    assert.equal(facts.price, expectedPrice.price, id)
    assert.equal(facts.childPrice, expectedPrice.childPrice, id)
    assert.equal(facts.minAge, (free ?? child).min, id)
    assert.equal(facts.maxAge, getAdultAgeMax(id), id)
    assert.equal(facts.childMinAge, child.min, id)
    assert.equal(facts.childMaxAge, child.max, id)
    assert.deepEqual(facts.freeAgeRange, free, id)
    assert.equal(facts.maxParticipants, getPlanMaxParticipants(id), id)
    assert.equal(facts.durationMinutes, getCustomerDurationMinutes(id), id)
    assert.equal(facts.durationHours, getCustomerDurationHours(id), id)
  }
})

test("S3の0〜75歳・60歳以上はS5案内と、S5の制限なし・3歳以下無料を区別", () => {
  assert.equal(SENIOR_RESTRICTED_AGE, 60)
  for (const id of ["S3", "S5"]) {
    const facts = getIntlPlanFacts(id)
    assert.equal(facts.minAge, 0)
    assert.equal(facts.maxAge, 75)
    assert.deepEqual(facts.freeAgeRange, { min: 0, max: 3 })
    assert.ok(FREE_UNDER3_PLAN_IDS.has(id))
    assert.equal(facts.seniorRestricted, SENIOR_RESTRICTED_PLAN_IDS.has(id))
    assert.equal(facts.maxParticipants, undefined, `${id}: 勝手に人数上限を追加しない`)
    assert.equal(facts.largeGroupMin, undefined)
    for (const locale of INTL_LOCALES) assert.equal(formatIntlGroupLimit(id, locale), "")
  }
  assert.equal(getIntlPlanFacts("S3").seniorRestricted, true)
  assert.equal(getIntlPlanFacts("S3").privateCounterpartId, PRIVATE_COUNTERPART.S3.id)
  assert.equal(getIntlPlanFacts("S3").privateCounterpartId, "S5")
  assert.equal(getIntlPlanFacts("S5").seniorRestricted, false)
  assert.equal(getIntlPlanFacts("S5").privateCounterpartId, null)
})

for (const locale of INTL_LOCALES) {
  test(`${locale}: 掲載範囲・料金注記・年齢注記は同じ正本から生成`, () => {
    const dict = getDict(locale)
    assert.deepEqual(dict.plans.map((plan) => plan.id).sort(), [...INTL_PLAN_IDS].sort())
    for (const plan of dict.plans) {
      const facts = getIntlPlanFacts(plan.id)
      assert.equal(plan.ageNote, formatIntlAgeNote(plan.id, locale), plan.id)
      if (plan.priceNote) assert.ok(plan.priceNote.includes(formatIntlYen(facts.price)), plan.id)
      if (plan.priceNoteShort) assert.ok(plan.priceNoteShort.includes(formatIntlYen(facts.price)), plan.id)
      assert.deepEqual(numbers(plan.ageNote), [facts.minAge, facts.maxAge], plan.id)
    }
    assert.ok(dict.form.addAdult.includes(String(ADULT_AGE_MIN)))
    assert.ok(dict.form.needAdultError.includes(String(ADULT_AGE_MIN)))
    assert.ok(dict.form.seniorNotice.before.includes(String(SENIOR_RESTRICTED_AGE)))
    const child = getParticipantAgeRange("S2", "child")
    assert.deepEqual(numbers(dict.form.addChild(child.min, child.max)), [child.min, child.max])
  })

  test(`${locale}: 人数制限とLINE相談の境界は最大人数と最大人数+1`, () => {
    const dict = getDict(locale)
    for (const id of INTL_PLAN_IDS.filter((id) => getPlanMaxParticipants(id) !== undefined)) {
      const max = getPlanMaxParticipants(id)
      const note = formatIntlGroupLimit(id, locale)
      assert.deepEqual(numbers(note), [max, max + 1])
      const plan = dict.planById[id]
      // S4は人数の本文注記を元々持たず、予約フォームの共通案内で表示する。
      if (id !== "S4") assert.ok([plan.priceNote, ...plan.precautions].some((line) => line?.includes(note)), id)
    }
    // 実値10だけの検査では「11名以上」の直書きを検知できないため別上限も渡す。
    for (const max of [4, 10, 14]) {
      assert.deepEqual(numbers(dict.form.limitToast(max)), [max, max + 1])
      assert.deepEqual(numbers(dict.form.groupLimitInfo(max, 2)), [max, 2, max + 1])
      assert.deepEqual(numbers(dict.form.missingReduceGroup(max)), [max, max + 1])
    }
  })

  test(`${locale}: 昼SUPとナイトの全開始時刻・翌日終了時刻を正本から表示`, () => {
    const dict = getDict(locale)
    const day = dict.planById.S7
    for (const time of DAY_SUP_TIMES) assert.ok(day.timeNote.includes(formatIntlTime(time, locale)), time)
    const night = dict.planById.S5
    assert.equal(night.timeNote, formatIntlNightTimeNote("S5", locale))
    assert.ok(night.timeNote.includes(formatIntlTimeList(NIGHT_TOUR_TIMES, locale)))
    assert.ok(night.timeNote.includes(String(getCustomerDurationMinutes("S5"))))
    assert.ok(night.timeNote.includes(String(getCustomerDurationHours("S5"))))
    assert.ok(night.timeNote.includes(formatIntlTime("00:50", locale)))
  })

  test(`${locale}: 貸切レンタル無料・大人用マスクと3歳以下無料を維持`, () => {
    const dict = getDict(locale)
    const adultOnly = { en: /adult sizes only.*no child sizes/i, ko: /성인용만.*어린이용[은 ]+없/, "zh-tw": /僅提供成人尺寸.*無兒童尺寸/ }[locale]
    for (const plan of dict.plans) {
      if (planOffersRentals(plan.id)) {
        assert.equal(getIntlPlanFacts(plan.id).rentalPrice, getRentalUnitPrice(plan.id))
        assert.equal(getRentalUnitPrice(plan.id), 0)
        assert.match(plan.included.join(" "), adultOnly, plan.id)
        const free = formatIntlRentalFee(plan.id, locale)
        assert.ok(plan.included.some((line) => line.toLowerCase().includes(free)), plan.id)
      } else {
        assert.equal(getIntlPlanFacts(plan.id).rentalPrice, null)
        assert.equal(formatIntlRentalFee(plan.id, locale), "")
      }
    }
    assert.ok(dict.planById.S5.priceNote.includes(formatIntlFreeChildNote("S5", locale)))
    assert.doesNotMatch(JSON.stringify(dict.plans), /\bunder 3\b|3세 미만|未滿3歲/i)
  })
}

test("料金・最大人数の正本変更が全言語の本文へ反映し、料金上書き経路も維持", () => {
  const output = changedSources({
    "lib/plan-price-display.ts": [["S2: { price: 9000, childPrice: 9000 }", "S2: { price: 12345, childPrice: 12345 }"]],
    "lib/booking-rules.ts": [["S2: 10", "S2: 4"]],
  })
  for (const locale of INTL_LOCALES) {
    const { plans, facts } = output[locale]
    assert.equal(facts.S2.price, 12345)
    assert.equal(facts.S2.childPrice, 12345)
    assert.equal(facts.S2.maxParticipants, 4)
    assert.ok(plans.S2.priceNote.includes("¥12,345"))
    assert.ok(plans.S2.priceNoteShort.includes("¥12,345"))
    assert.match(plans.S2.priceNote, /4/)
    assert.match(plans.S2.priceNote, /5/)
    assert.doesNotMatch(plans.S2.priceNote, /¥9,000|\b10\b|\b11\b/)
  }
  const override = changedSources({}, `
    const { EN_PRICE_DATA } = await import("./lib/i18n/en-prices.ts");
    EN_PRICE_DATA.S2 = { price: 11234, childPrice: 10234 };
  `)
  for (const locale of INTL_LOCALES) {
    assert.equal(override[locale].facts.S2.price, 11234)
    assert.equal(override[locale].facts.S2.childPrice, 10234)
    assert.ok(override[locale].plans.S2.priceNote.includes("¥11,234"))
    assert.ok(override[locale].plans.S2.priceNoteShort.includes("¥11,234"))
    assert.ok(override[locale].plans.S2.priceNote.includes("¥10,234"))
    assert.ok(override[locale].plans.S2.priceNoteShort.includes("¥10,234"))
  }
})

test("年齢区分の正本変更が全言語のプランと予約区分へ反映", () => {
  const output = changedSources({
    "lib/plan-flags.ts": [
      ["ADULT_AGE_MIN = 13", "ADULT_AGE_MIN = 14"],
      ["SENIOR_RESTRICTED_AGE = 60", "SENIOR_RESTRICTED_AGE = 61"],
      ["ADULT_AGE_MAX_DEFAULT = 65", "ADULT_AGE_MAX_DEFAULT = 66"],
      ["ADULT_AGE_MAX_NIGHT_TOUR = 75", "ADULT_AGE_MAX_NIGHT_TOUR = 76"],
      ["isNightTourPlan(planId) ? 4 : 5, max: 12", "isNightTourPlan(planId) ? 4 : 6, max: 13"],
      ["return { min: 0, max: 3 }", "return { min: 0, max: 2 }"],
    ],
  })
  for (const locale of INTL_LOCALES) {
    const { plans, form } = output[locale]
    assert.deepEqual(numbers(plans.S2.ageNote), [6, 66])
    assert.deepEqual(numbers(plans.S5.ageNote), [0, 76])
    assert.deepEqual(numbers(form.addAdult), [14])
    assert.deepEqual(numbers(form.addChild), [6, 13])
    assert.deepEqual(numbers(form.addUnder3), [0, 2])
    assert.deepEqual(numbers(form.seniorNotice.before), [61])
    assert.doesNotMatch(plans.S5.priceNote, /3(?: and under|세 이하|歲以下)/)
    assert.ok(plans.S5.priceNote.includes("2"))
  }
})

test("無料参加フラグを外した場合は無料表記と0歳開始を残さず、上限は捏造しない", () => {
  const output = changedSources({
    "lib/plan-flags.ts": [["FREE_UNDER3_PLAN_IDS = new Set([\"S3\", \"S5\"])", "FREE_UNDER3_PLAN_IDS = new Set<string>()"]],
  })
  for (const locale of INTL_LOCALES) {
    const entry = output[locale]
    assert.equal(entry.freeNight, "")
    assert.equal(entry.nightGroup, "")
    for (const id of ["S3", "S5"]) {
      assert.equal(entry.facts[id].minAge, 4)
      assert.equal(entry.facts[id].freeAgeRange, null)
      assert.equal(entry.facts[id].maxParticipants, undefined)
    }
    assert.deepEqual(numbers(entry.plans.S5.ageNote), [4, 75])
    assert.doesNotMatch(entry.plans.S5.priceNote, /ages 3 and under|3세 이하|3歲以下/)
  }
})

test("開始時刻・ナイト所要時間の正本変更が辞書の出発回数と日付またぎにも反映", () => {
  const output = changedSources({
    "lib/plan-flags.ts": [
      ["NIGHT_TOUR_TIMES = [\"19:20\", \"21:10\", \"23:20\"]", "NIGHT_TOUR_TIMES = [\"18:40\", \"22:40\"]"],
      ["\"07:00\", \"08:00\", \"09:00\", \"10:00\", \"11:00\",", "\"06:30\", \"08:00\", \"09:00\", \"10:00\", \"11:00\","],
    ],
    "lib/plan-durations.ts": [["role: \"night\", minutes: 90", "role: \"night\", minutes: 100"]],
  })
  for (const locale of INTL_LOCALES) {
    const { plans, facts } = output[locale]
    assert.equal(facts.S5.durationMinutes, 100)
    assert.ok(plans.S5.timeNote.includes("100"))
    for (const time of ["18:40", "22:40", "00:20"]) assert.ok(plans.S5.timeNote.includes(formatIntlTime(time, locale)), time)
    for (const time of NIGHT_TOUR_TIMES) assert.ok(!plans.S5.timeNote.includes(formatIntlTime(time, locale)), time)
    assert.match(plans.S5.timeNote, { en: /2 departures.*next day/, ko: /2회.*다음 날/, "zh-tw": /2個.*隔天/ }[locale])
    assert.ok(plans.S7.timeNote.includes(formatIntlTime("06:30", locale)))
  }
})

test("レンタル正本が変わると全言語のFAQと含まれるものの無料表示も追随", () => {
  const output = changedSources({
    "lib/rental-options.ts": [["RENTAL_INCLUDED_PLAN_IDS.has(planId) ? 0 : RENTAL_UNIT_PRICE_YEN", "RENTAL_INCLUDED_PLAN_IDS.has(planId) ? 1234 : RENTAL_UNIT_PRICE_YEN"]],
  })
  for (const locale of INTL_LOCALES) {
    const { plans, faqs, facts } = output[locale]
    for (const id of ["S2", "S4", "S7"]) {
      assert.equal(facts[id].rentalPrice, 1234)
      assert.ok(plans[id].included.join(" ").includes("¥1,234"), id)
    }
    const maskQuestion = { en: /contact lenses or glasses/, ko: /콘택트렌즈나 안경/, "zh-tw": /隱形眼鏡或眼鏡/ }[locale]
    assert.ok(faqs.find((faq) => maskQuestion.test(faq.question)).answer.includes("¥1,234"))
  }
})

test("料金・年齢・人数注記へ古い実値を直書きして戻さない", () => {
  const failures = []
  const guarded = new Set(["priceNote", "priceNoteShort", "ageNote", "limitToast", "groupLimitInfo", "missingReduceGroup", "addAdult", "addChild", "addUnder3", "needAdultError", "missingAdult"])
  for (const locale of INTL_LOCALES) {
    const file = `lib/i18n/${locale}.ts`
    const ast = ts.createSourceFile(file, readFileSync(new URL(`./${locale}.ts`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true)
    function inspect(node, guardedField = false) {
      const relevant = ts.isPropertyAssignment(node) && guarded.has(node.name.getText(ast))
      const within = guardedField || relevant
      if (within && (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node))) {
        if (/[¥￥]\s*\d|\b(?:65|75|10|11|12|13)\b|\b[035]\s*[–〜~～-]\s*[3567]/.test(node.text)) {
          failures.push(`${file}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}: ${node.text}`)
        }
      }
      ts.forEachChild(node, (child) => inspect(child, within))
    }
    inspect(ast)
  }
  assert.deepEqual(failures, [], `プラン事実の再直書き:\n${failures.join("\n")}`)
})
