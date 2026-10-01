"use client"

import { useEffect } from "react"

const REVEAL_MS = 800
const STAGGER_MS = 90

/**
 * [data-motion] の中にある [data-reveal] 要素を、画面に入ったときにふわっと表示する。
 * - 監視は IntersectionObserver 1つだけ。表示し終えた要素は監視をやめる
 * - 最初から画面内にある要素は隠さない（チラつき防止）
 * - JS が動かない環境・「視差効果を減らす」設定では何もしない＝最初から全部見えている
 */
export function ScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-motion] [data-reveal]"))
    const timers: number[] = []

    const reset = (el: HTMLElement) => {
      delete el.dataset.revealState
      el.style.transitionDelay = ""
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // 同時に画面へ入った要素（横並びのカードなど）は少しずつずらして出す
        let order = 0
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          observer.unobserve(el)
          const delay = Math.min(order++, 4) * STAGGER_MS
          el.style.transitionDelay = `${delay}ms`
          el.dataset.revealState = "shown"
          // 表示し終えたら属性を外し、元のホバー演出などに干渉しないようにする
          timers.push(window.setTimeout(() => reset(el), REVEAL_MS + delay + 100))
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    )

    for (const el of targets) {
      if (el.getBoundingClientRect().top < window.innerHeight) continue
      el.dataset.revealState = "pending"
      observer.observe(el)
    }

    return () => {
      observer.disconnect()
      timers.forEach((id) => window.clearTimeout(id))
      targets.forEach(reset)
    }
  }, [])

  return null
}
