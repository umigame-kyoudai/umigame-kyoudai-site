import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

import * as config from "./site-config.ts"
import * as bookingPolicyCopy from "./booking-policy-copy.ts"
import * as seo from "./seo.ts"
import * as dict from "./i18n/dict.ts"
import * as locales from "./i18n/locales.ts"
import * as navigation from "./navigation.ts"
import * as routes from "./routes.ts"
import * as data from "./data.ts"
import * as enPrices from "./i18n/en-prices.ts"
import * as tourMaster from "./tour-master.ts"
import sitemap from "../app/sitemap.ts"
import robots from "../app/robots.ts"

const { SITE_CONFIG, formatBusinessHours } = config
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
const Empty = () => null
const Anchor = ({ href, children }) => React.createElement("a", { href }, children)

// 表示対象の TSX だけを評価し、Next の描画部品と計測処理を起動しない。
// 事実データ・辞書・SEO は実際のモジュールを使う。想定外の依存は自動実行せず失敗させる。
const dependencies = {
  "next/link": Anchor,
  "next/image": Empty,
  "lucide-react": new Proxy({}, { get: () => Empty }),
  "@/components/navbar": { Navbar: Empty },
  "@/components/footer": { Footer: Empty },
  "@/components/mobile-cta": { MobileCTA: Empty },
  "@/components/json-ld": { BreadcrumbJsonLd: Empty },
  "@/components/tracked-cta": { TrackedCta: Anchor, TrackedTel: Anchor },
  "@/lib/site-config": config,
  "@/lib/booking-policy-copy": bookingPolicyCopy,
  "@/lib/seo": seo,
  "@/lib/i18n/dict": dict,
  "@/lib/i18n/locales": locales,
  "@/lib/navigation": navigation,
  "@/lib/routes": routes,
  "@/lib/data": data,
  "@/lib/i18n/en-prices": enPrices,
  "@/lib/tour-master": tourMaster,
}
function loadTsx(file) {
  const { outputText } = ts.transpileModule(read(file), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  })
  const exports = {}
  new Function("React", "require", "exports", outputText)(React, (id) => {
    assert.ok(Object.hasOwn(dependencies, id), `${file}: 未指定の依存 ${id}`)
    return dependencies[id]
  }, exports)
  return exports
}
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))
const visible = (html) => html.replace(/<[^>]*>/g, "")

test("Footer の電話・住所・LINE・営業時間は日本語と全外国語で公開 config と一致", () => {
  const { Footer } = loadTsx("components/footer.tsx")
  for (const locale of ["ja", ...locales.INTL_LOCALES]) {
    const html = render(Footer, { locale })
    const text = visible(html)
    assert.ok(html.includes(`href="tel:${SITE_CONFIG.phone}"`), locale)
    assert.ok(html.includes(`href="${SITE_CONFIG.lineUrl}"`), locale)
    assert.ok(text.includes(locale === "ja" ? SITE_CONFIG.phoneDisplayJa : SITE_CONFIG.phoneDisplayIntl), locale)
    // 既存仕様どおり、外国語Footerの所在地は英語表記。
    assert.ok(text.includes(locale === "ja" ? SITE_CONFIG.address.formattedJa : SITE_CONFIG.address.formattedEn), locale)
    assert.ok(text.includes(formatBusinessHours(locale)), locale)
  }
})

test("JSON-LD の事業者名・URL・電話・住所・営業時間は公開 config と一致", () => {
  const { LocalBusinessJsonLd, OrganizationJsonLd, WebSiteJsonLd } = loadTsx("components/json-ld.tsx")
  const json = (Component) => JSON.parse(render(Component).replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""))
  const localBusiness = json(LocalBusinessJsonLd)
  assert.equal(localBusiness.name, SITE_CONFIG.siteNameJa)
  assert.equal(localBusiness.url, SITE_CONFIG.siteUrl)
  assert.equal(localBusiness.telephone, SITE_CONFIG.phoneDisplayIntl)
  assert.deepEqual(localBusiness.address, {
    "@type": "PostalAddress",
    postalCode: SITE_CONFIG.address.postalCode,
    streetAddress: SITE_CONFIG.address.streetAddress,
    addressLocality: SITE_CONFIG.address.locality,
    addressRegion: SITE_CONFIG.address.region,
    addressCountry: SITE_CONFIG.address.country,
  })
  assert.equal(localBusiness.openingHoursSpecification.opens, SITE_CONFIG.businessHours.opens)
  assert.equal(localBusiness.openingHoursSpecification.closes, SITE_CONFIG.businessHours.closes)
  const organization = json(OrganizationJsonLd)
  assert.equal(organization.telephone, SITE_CONFIG.phoneDisplayIntl)
  assert.equal(organization.name, SITE_CONFIG.siteNameJa)
  assert.equal(organization.url, SITE_CONFIG.siteUrl)
  assert.equal(json(WebSiteJsonLd).url, SITE_CONFIG.siteUrl)
})

test("特商法ページの公開連絡先・受付時間は config と一致", () => {
  const html = render(loadTsx("app/(ja)/tokushoho/page.tsx").default)
  const text = visible(html)
  for (const expected of [SITE_CONFIG.siteNameJa, SITE_CONFIG.address.formattedJa, SITE_CONFIG.phoneDisplayJa, SITE_CONFIG.publicEmail, formatBusinessHours("ja", "〜")]) {
    assert.ok(text.includes(expected), expected)
  }
  assert.ok(html.includes(`href="tel:${SITE_CONFIG.phone}"`))
  assert.ok(html.includes(`href="mailto:${SITE_CONFIG.publicEmail}"`))
})

test("多言語ホームの電話・メール・LINEは各ロケールで同じ公開 config を参照", () => {
  const { IntlHomePage } = loadTsx("components/intl/home-page.tsx")
  for (const locale of locales.INTL_LOCALES) {
    const html = render(IntlHomePage, { locale })
    assert.ok(html.includes(`href="tel:${SITE_CONFIG.phone}"`), locale)
    assert.ok(html.includes(`href="mailto:${SITE_CONFIG.publicEmail}"`), locale)
    assert.ok(html.includes(`href="${SITE_CONFIG.lineUrl}"`), locale)
    assert.ok(visible(html).includes(SITE_CONFIG.phoneDisplayIntl), locale)
  }
})

test("SEO・sitemap・robots の公開URLは config のドメインと一致", () => {
  assert.equal(seo.SITE_URL, SITE_CONFIG.siteUrl)
  assert.equal(seo.SITE_NAME, SITE_CONFIG.siteNameJa)
  assert.equal(seo.SITE_NAME_INTL, SITE_CONFIG.siteNameEn)
  for (const locale of ["ja", ...locales.INTL_LOCALES]) {
    const path = locales.localePath(locale, "/faq")
    const metadata = seo.createMetadata({ title: "FAQ", description: "確認用", locale, path, intlBasePath: "/faq" })
    assert.equal(metadata.alternates.canonical, `${SITE_CONFIG.siteUrl}${path}`)
    assert.equal(metadata.openGraph.url, `${SITE_CONFIG.siteUrl}${path}`)
    assert.equal(metadata.openGraph.siteName, locale === "ja" ? SITE_CONFIG.siteNameJa : SITE_CONFIG.siteNameEn)
    for (const url of Object.values(metadata.alternates.languages)) assert.ok(url.startsWith(`${SITE_CONFIG.siteUrl}/`), url)
    for (const image of metadata.openGraph.images) assert.ok(image.url.startsWith(`${SITE_CONFIG.siteUrl}/`), image.url)
  }
  const entries = sitemap()
  assert.ok(entries.length > 0)
  assert.ok(entries.some((entry) => entry.url === SITE_CONFIG.siteUrl))
  for (const entry of entries) assert.equal(new URL(entry.url).origin, SITE_CONFIG.siteUrl, entry.url)
  assert.equal(robots().sitemap, `${SITE_CONFIG.siteUrl}/sitemap.xml`)
})

test("公開 config には管理用ID・通知先・認証情報を含めず、表示形式は正本から導出", () => {
  assert.deepEqual(Object.keys(SITE_CONFIG).sort(), [
    "siteNameJa", "siteNameEn", "siteUrl", "phone", "phoneDisplayJa", "phoneDisplayIntl", "publicEmail", "lineUrl", "address", "businessHours",
  ].sort())
  function inspect(value) {
    if (!value || typeof value !== "object") return
    for (const [key, child] of Object.entries(value)) {
      assert.doesNotMatch(key, /secret|token|password|calendar|spreadsheet|scriptId|notify|webhook|liff|admin|account|apiKey|sheetId/i, key)
      inspect(child)
    }
  }
  inspect(SITE_CONFIG)
  assert.doesNotMatch(JSON.stringify(SITE_CONFIG), /gmail\.com|secret|script[\s_-]*properties|@group\.calendar\.google\.com|script\.google\.com|docs\.google\.com\/spreadsheets/i)
  assert.doesNotMatch(read("lib/site-config.ts"), /process\.env|PropertiesService|ScriptApp|SpreadsheetApp|CalendarApp/)
  assert.equal(SITE_CONFIG.phoneDisplayJa.replaceAll("-", ""), SITE_CONFIG.phone)
  assert.equal(SITE_CONFIG.phoneDisplayIntl.replaceAll("-", ""), `+81${SITE_CONFIG.phone.slice(1)}`)
  assert.equal(formatBusinessHours("ja"), "7:00 - 18:00")
  assert.equal(formatBusinessHours("en"), "7:00 AM - 6:00 PM")
})

test("主要な公開連絡先・所在地・営業時間は config 以外へ再直書きしない", () => {
  const forbidden = [
    SITE_CONFIG.phone, SITE_CONFIG.phoneDisplayJa, SITE_CONFIG.phoneDisplayIntl,
    SITE_CONFIG.publicEmail, new URL(SITE_CONFIG.siteUrl).hostname,
    `${new URL(SITE_CONFIG.lineUrl).hostname}${new URL(SITE_CONFIG.lineUrl).pathname}`,
    SITE_CONFIG.address.postalCode, SITE_CONFIG.address.streetAddress, SITE_CONFIG.address.streetNameEn,
  ]
  const failures = []
  function scan(directory) {
    for (const entry of readdirSync(new URL(`../${directory}`, import.meta.url), { withFileTypes: true })) {
      const file = `${directory}/${entry.name}`
      if (entry.isDirectory()) { scan(file); continue }
      if (!/\.[cm]?[jt]sx?$/.test(file) || /\.test\./.test(file) || file === "lib/site-config.ts") continue
      const source = read(file)
      const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
      function visit(node) {
        if (ts.isStringLiteralLike(node) || ts.isJsxText(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
          const literal = node.text
          const copied = forbidden.find((value) => literal.includes(value))
          // プランの単独開始時刻は対象外。営業時間の範囲表記とJSON-LDの営業時間だけを検査。
          const hours = /0?7:00\s*(?:AM\s*)?(?:[-–—〜～~]|to)\s*(?:18:00|6:00\s*PM)/i.test(literal)
          const jsonLdHours = file === "components/json-ld.tsx" && ts.isPropertyAssignment(node.parent) && ["opens", "closes"].includes(node.parent.name.getText(ast))
          if (copied || hours || jsonLdHours) {
            failures.push(`${file}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1} ${copied ?? "営業時間"}`)
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(ast)
    }
  }
  for (const directory of ["app", "components", "lib"]) scan(directory)
  assert.deepEqual(failures, [], `公開情報の重複: \n${failures.join("\n")}`)
})
