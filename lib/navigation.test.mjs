import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

import * as routes from "./routes.ts"
import * as navigation from "./navigation.ts"
import * as dictionaries from "./i18n/dict.ts"
import * as locales from "./i18n/locales.ts"
import * as siteConfig from "./site-config.ts"

const { PAGE_ROUTES, pagePath, isPageAvailable } = routes
const { JA_NAVIGATION_ITEMS, JA_DESKTOP_NAVIGATION_ITEMS, navigationItems, getIntlNavFallback } = navigation
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")

// 現在公開しているURLを固定し、共通化時にURL自体が変わることも検知する。
const expectedPaths = {
  home: "/", plans: "/plans", book: "/book", seaTurtleGuide: "/miyakojima-sea-turtle",
  staff: "/staff", gallery: "/gallery", blog: "/blog", faq: "/faq", safety: "/safety",
  access: "/access", terms: "/terms", privacy: "/privacy", tokushoho: "/tokushoho",
}
const translatedIds = ["home", "plans", "book", "seaTurtleGuide", "faq", "terms", "privacy"]
const jaMobile = [
  ["/", "ホーム"], ["/plans", "ツアープラン一覧"], ["/book", "ご予約"],
  ["/miyakojima-sea-turtle", "宮古島ウミガメガイド"], ["/staff", "スタッフ紹介"],
  ["/gallery", "ギャラリー"], ["/blog", "ブログ"], ["/faq", "よくある質問"],
  ["/safety", "安全への取り組み"], ["/access", "集合場所・アクセス"],
].map(([href, label]) => ({ href, label }))
const jaDesktop = [
  ["/", "ホーム"], ["/plans", "プラン"], ["/staff", "スタッフ"], ["/gallery", "ギャラリー"],
  ["/blog", "ブログ"], ["/miyakojima-sea-turtle", "ウミガメガイド"], ["/faq", "よくある質問"],
].map(([href, label]) => ({ href, label }))
const labels = {
  en: { nav: ["Home", "Tours", "Sea Turtle Guide", "FAQ"], footer: ["Home", "All Tours", "Book a Tour", "Sea Turtle Guide", "FAQ"] },
  ko: { nav: ["홈", "투어", "바다거북 가이드", "FAQ"], footer: ["홈", "투어 전체 보기", "투어 예약", "바다거북 가이드", "자주 묻는 질문"] },
  "zh-tw": { nav: ["首頁", "行程", "海龜指南", "常見問題"], footer: ["首頁", "所有行程", "預約行程", "海龜指南", "常見問題"] },
}

const Anchor = ({ href, children, className }) => React.createElement("a", { href, className }, children)
const Empty = () => null
const Button = ({ asChild, children, className, ...props }) => asChild
  ? React.cloneElement(React.Children.only(children), { className })
  : React.createElement("button", { className, "aria-label": props["aria-label"], "aria-expanded": props["aria-expanded"] }, children)

// 実際のTSXを評価する。外部通信・計測・Next遷移は起動せず、メニューの状態だけを制御する。
function loadComponent(file, { pathname = "/", open = false, languageOpen = false } = {}) {
  const state = [open, languageOpen]
  let cursor = 0
  const dependencies = {
    react: { ...React, useState: (initial) => {
      const index = cursor++
      if (state[index] === undefined) state[index] = initial
      return [state[index], (next) => { state[index] = typeof next === "function" ? next(state[index]) : next }]
    } },
    "next/link": Anchor,
    "next/image": Empty,
    "next/navigation": { usePathname: () => pathname },
    "lucide-react": new Proxy({}, { get: () => Empty }),
    "@/components/ui/button": { Button },
    "@/components/tracked-cta": { TrackedCta: Anchor, TrackedTel: Anchor },
    "@/lib/analytics": { trackEvent: () => {} },
    "@/lib/site-config": siteConfig,
    "@/lib/i18n/dict": dictionaries,
    "@/lib/i18n/locales": locales,
    "@/lib/navigation": navigation,
    "@/lib/routes": routes,
  }
  const { outputText } = ts.transpileModule(read(file), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  })
  const exports = {}
  new Function("React", "require", "exports", outputText)(React, (id) => {
    assert.ok(Object.hasOwn(dependencies, id), `${file}: 未指定の依存 ${id}`)
    return dependencies[id]
  }, exports)
  return (name, props) => {
    cursor = 0
    const tree = exports[name](props)
    // SSRでも評価し、無効なReact要素やレンダリング中の例外を検知する。
    renderToStaticMarkup(tree)
    return tree
  }
}

function nodes(tree, predicate) {
  const result = []
  function visit(node) {
    if (!React.isValidElement(node)) return
    if (predicate(node)) result.push(node)
    React.Children.forEach(node.props.children, visit)
  }
  React.Children.forEach(tree, visit)
  return result
}
function textOf(tree) {
  return React.Children.toArray(tree).map((node) => React.isValidElement(node) ? textOf(node.props.children) : String(node)).join("")
}
const links = (tree) => nodes(tree, (node) => node.type === Anchor).map((node) => ({ href: node.props.href, label: textOf(node.props.children) }))
const mobileMenu = (tree) => nodes(tree, (node) => node.type === "div" && node.props.className === "xl:hidden")[0]
const desktopMenu = (tree) => nodes(tree, (node) => node.type === "div" && node.props.className?.startsWith("hidden xl:flex items-center gap-4"))[0]
const footerQuickLinks = (tree) => nodes(tree, (node) => node.type === "ul" && node.props.className === "space-y-2 text-emerald-200")[0]
const fixturePath = (locale, id) => locale === "ja" ? expectedPaths[id] : `/${locale}${expectedPaths[id] === "/" ? "" : expectedPaths[id]}`

test("全13ページのURLと公開ロケールを維持し、定義したリンク先の実ページが存在する", () => {
  assert.deepEqual(Object.keys(PAGE_ROUTES).sort(), Object.keys(expectedPaths).sort())
  for (const [id, path] of Object.entries(expectedPaths)) {
    assert.equal(PAGE_ROUTES[id].path, path, id)
    assert.equal(PAGE_ROUTES[id].localized, translatedIds.includes(id), id)
    assert.equal(pagePath("ja", id), path)
    assert.ok(isPageAvailable("ja", id))
    for (const locale of ["ja", ...locales.INTL_LOCALES]) {
      if (locale !== "ja" && !translatedIds.includes(id)) continue
      const href = fixturePath(locale, id)
      assert.equal(pagePath(locale, id), href)
      const group = locale === "zh-tw" ? "zh" : locale
      const file = `app/(${group})${href === "/" ? "" : href}/page.tsx`
      assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${locale}/${id}: ${file} がない`)
    }
  }
})

test("日本語のみのページを外国語URLへ変換せず、利用可能な同一pageIdは同じURLになる", () => {
  for (const locale of locales.INTL_LOCALES) {
    for (const id of Object.keys(expectedPaths)) {
      const available = translatedIds.includes(id)
      assert.equal(isPageAvailable(locale, id), available)
      if (!available) {
        assert.throws(() => pagePath(locale, id))
        assert.throws(() => navigationItems(locale, [{ pageId: id, label: "確認" }]))
      } else {
        const [navItem, footerItem] = navigationItems(locale, [{ pageId: id, label: "nav" }, { pageId: id, label: "footer" }])
        assert.equal(navItem.href, pagePath(locale, id))
        assert.equal(navItem.href, footerItem.href)
      }
    }
  }
})

test("日本語の三本線メニューとFooterは10項目の表記・順番・リンクが完全一致", () => {
  assert.deepEqual(JA_NAVIGATION_ITEMS, jaMobile)
  const nav = loadComponent("components/navbar.tsx", { open: true })("Navbar", { locale: "ja" })
  const footer = loadComponent("components/footer.tsx")("Footer", { locale: "ja" })
  const menu = mobileMenu(nav)
  assert.ok(menu)
  assert.deepEqual(links(menu), jaMobile)
  assert.deepEqual(links(footerQuickLinks(footer)), jaMobile)
  assert.equal(links(menu).filter((link) => link.href === "/book").length, 1, "モバイル予約CTAを二重表示しない")
})

test("日本語PC横並びナビは従来の7項目を維持し、モバイルは開閉できる", () => {
  assert.deepEqual(JA_DESKTOP_NAVIGATION_ITEMS, jaDesktop)
  const draw = loadComponent("components/navbar.tsx")
  const closed = draw("Navbar", { locale: "ja" })
  assert.deepEqual(links(desktopMenu(closed)), jaDesktop)
  assert.equal(mobileMenu(closed), undefined)
  const button = nodes(closed, (node) => node.type === Button && node.props["aria-label"] === "メニュー")[0]
  assert.equal(button.props["aria-expanded"], false)
  button.props.onClick()
  const opened = draw("Navbar", { locale: "ja" })
  assert.deepEqual(links(mobileMenu(opened)), jaMobile)
  const firstLink = nodes(mobileMenu(opened), (node) => node.type === Anchor)[0]
  firstLink.props.onClick()
  assert.equal(mobileMenu(draw("Navbar", { locale: "ja" })), undefined)
})

for (const locale of locales.INTL_LOCALES) {
  test(`${locale}: Navbar・Footerの既存構成と翻訳を維持し、URLは同じpageIdを参照`, () => {
    const { ui } = dictionaries.getDict(locale)
    const expectedNav = ["home", "plans", "seaTurtleGuide", "faq"].map((id, index) => ({ href: fixturePath(locale, id), label: labels[locale].nav[index] }))
    const expectedFooter = ["home", "plans", "book", "seaTurtleGuide", "faq"].map((id, index) => ({ href: fixturePath(locale, id), label: labels[locale].footer[index] }))
    assert.deepEqual(ui.nav.items, expectedNav)
    assert.deepEqual(ui.footer.quickLinks, expectedFooter)
    const nav = loadComponent("components/navbar.tsx", { open: true })("Navbar", { locale, nav: ui.nav })
    assert.deepEqual(links(desktopMenu(nav)), expectedNav)
    assert.deepEqual(links(mobileMenu(nav)), [...expectedNav, { href: fixturePath(locale, "book"), label: ui.nav.book }])
    const footer = loadComponent("components/footer.tsx")("Footer", { locale })
    assert.deepEqual(links(footerQuickLinks(footer)), expectedFooter)
    assert.deepEqual(ui.footer.legalLinks.map((item) => item.href), [fixturePath(locale, "terms"), fixturePath(locale, "privacy"), "/tokushoho"])
    for (const item of ui.nav.items) assert.ok(ui.footer.quickLinks.some((other) => other.href === item.href), item.href)
    assert.equal(ui.nav.homeHref, fixturePath(locale, "home"))
    assert.equal(ui.nav.bookHref, fixturePath(locale, "book"))
    assert.equal(ui.mobileCta.bookHref, ui.nav.bookHref)
  })

  test(`${locale}: nav未指定の英語フォールバックも現在の言語のURLを使用`, () => {
    const fallback = getIntlNavFallback(locale)
    const expected = ["home", "plans", "seaTurtleGuide", "faq"].map((id, index) => ({ href: fixturePath(locale, id), label: labels.en.nav[index] }))
    assert.deepEqual(fallback.items, expected)
    assert.equal(fallback.homeHref, fixturePath(locale, "home"))
    assert.equal(fallback.bookHref, fixturePath(locale, "book"))
    const nav = loadComponent("components/navbar.tsx", { open: true })("Navbar", { locale })
    assert.deepEqual(links(desktopMenu(nav)), expected)
    assert.deepEqual(links(mobileMenu(nav)), [...expected, { href: fixturePath(locale, "book"), label: fallback.book }])
  })

  test(`${locale}: 固定CTAは同じ言語の予約URLを使い、予約ページ上では予約CTAを隠す`, () => {
    const { mobileCta } = dictionaries.getDict(locale).ui
    for (const cta of [mobileCta, undefined]) {
      const home = loadComponent("components/mobile-cta.tsx", { pathname: fixturePath(locale, "home") })("MobileCTA", { locale, cta })
      assert.deepEqual(links(home).map((link) => link.href), [fixturePath(locale, "book")])
      const booking = loadComponent("components/mobile-cta.tsx", { pathname: fixturePath(locale, "book") })("MobileCTA", { locale, cta })
      assert.deepEqual(links(booking), [])
      assert.equal(nodes(booking, (node) => node.type === Button).length, 1, "LINE相談の導線は残す")
    }
  })
}

test("言語スイッチャーは4言語のホーム正本へリンクする", () => {
  const nav = loadComponent("components/navbar.tsx", { languageOpen: true })("Navbar", { locale: "ja" })
  const languageLabels = ["日本語", "English", "한국어", "繁體中文"]
  for (const [index, locale] of ["ja", ...locales.INTL_LOCALES].entries()) {
    const matched = links(nav).filter((link) => link.label === languageLabels[index])
    assert.ok(matched.length > 0)
    for (const link of matched) assert.equal(link.href, fixturePath(locale, "home"))
  }
})

test("ナビ・Footer・固定CTA・辞書へ内部URLを再直書きしない", () => {
  const files = ["components/navbar.tsx", "components/footer.tsx", "components/mobile-cta.tsx", "lib/navigation.ts", ...locales.INTL_LOCALES.map((locale) => `lib/i18n/${locale}.ts`)]
  const failures = []
  for (const file of files) {
    const ast = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    function visit(node, urlField = false) {
      const field = (ts.isPropertyAssignment(node) || ts.isJsxAttribute(node)) && ["href", "homeHref", "bookHref"].includes(node.name.getText(ast))
      const within = urlField || field
      if (within && (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) && /^\/(?!\/)/.test(node.text)) {
        failures.push(`${file}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}: ${node.text}`)
      }
      ts.forEachChild(node, (child) => visit(child, within))
    }
    visit(ast)
  }
  assert.deepEqual(failures, [], `URLの重複管理:\n${failures.join("\n")}`)
})
