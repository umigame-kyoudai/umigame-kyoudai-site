"use client"

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react"
import { ArrowDown } from "lucide-react"
import { NIGHT_ENTRANCE_CHANGE } from "@/lib/night-entrance"
import styles from "./night-tour.module.css"

const clamp = (value: number) => Math.max(0, Math.min(1, value))

/** 通常の縦スクロールを使う入口。JSなし・動きを減らす設定では静かな一枚の扉になる。 */
export function NightEntrance({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const gateRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const skipRef = useRef<() => void>()
  const openedRef = useRef(false)

  useEffect(() => {
    const track = trackRef.current
    const stage = stageRef.current
    const gate = gateRef.current
    const content = contentRef.current
    if (!track || !stage || !gate || !content) return
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    let dispose = () => {}

    const setup = () => {
      dispose()
      let frame = 0
      let travel = 0
      let wasActive: boolean | undefined
      let enhanced = !preference.matches
      // 参加条件・予約等への直接リンクは入口で遮らない。
      let hashTarget = ""
      try { hashTarget = decodeURIComponent(window.location.hash.slice(1)) } catch { /* malformed hash */ }
      const bypass = !!hashTarget && !!document.getElementById(hashTarget)
      if (bypass) enhanced = false
      if (bypass) openedRef.current = true
      track.dataset.enhanced = String(enhanced)
      track.dataset.bypassed = String(bypass)
      track.dataset.completed = String(openedRef.current)

      const phase = (active: boolean) => {
        if (wasActive === active) return
        wasActive = active
        track.dataset.nightEntrance = active ? "active" : "open"
        // 闇の裏にある予約ボタンへキーボードのフォーカスが入らないようにする。
        content.inert = active && enhanced
        if (active && enhanced) content.setAttribute("aria-hidden", "true")
        else content.removeAttribute("aria-hidden")
        gate.inert = !active
        gate.setAttribute("aria-hidden", String(!active))
        // スキップしたリンクにフォーカスが残っている場合は、見える本文へ渡す。
        if (!active && gate.contains(document.activeElement)) content.focus({ preventScroll: true })
        window.dispatchEvent(new Event(NIGHT_ENTRANCE_CHANGE))
      }

      const renderProgress = (progress: number) => {
        const reveal = clamp((progress - 0.045) / 0.89)
        const eased = reveal * reveal * (3 - 2 * reveal)
        const copy = clamp(1 - progress / 0.31)
        track.style.setProperty("--gate-left", `${-102 * eased}%`)
        track.style.setProperty("--gate-right", `${102 * eased}%`)
        track.style.setProperty("--gate-copy-opacity", String(copy))
        track.style.setProperty("--gate-cue-visibility", copy > 0.05 ? "visible" : "hidden")
        track.style.setProperty("--gate-copy-y", `${-28 * (1 - copy)}px`)
        track.style.setProperty("--gate-glow", String(Math.sin(reveal * Math.PI) * 0.6))
        track.style.setProperty("--gate-scale", String(1.045 - 0.045 * eased))
        track.style.setProperty("--gate-progress", String(progress))
      }

      const finish = () => {
        if (openedRef.current) return
        const before = content.getBoundingClientRect().top
        openedRef.current = true
        renderProgress(1)
        track.dataset.completed = "true"
        track.style.removeProperty("height")
        phase(false)
        // 演出のスクロール区間を取り除いても、表示中の本文が跳ねないよう位置を保つ。
        const shift = content.getBoundingClientRect().top - before
        if (Math.abs(shift) > 0.5) window.scrollBy({ top: shift, behavior: "instant" })
      }

      const update = () => {
        // スクロールを戻したり表示設定を切り替えたりしても、一度開いた入口は閉じない。
        if (openedRef.current) { renderProgress(1); phase(false); return }
        if (!enhanced) {
          if (gate.getBoundingClientRect().bottom <= 0) finish()
          else phase(true)
          return
        }
        const progress = clamp(-track.getBoundingClientRect().top / travel)
        if (progress >= 0.94) { finish(); return }
        renderProgress(progress)
        phase(true)
      }
      const queueUpdate = () => {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(update)
      }
      const measure = () => {
        if (enhanced && !openedRef.current) {
          // svhに基づく扉の高さを使い、スマホのアドレスバー開閉で進行量を変えない。
          travel = Math.max(1, gate.offsetHeight * 1.1)
          track.style.height = `${stage.offsetHeight + travel}px`
        }
        queueUpdate()
      }

      skipRef.current = () => {
        if (enhanced) window.scrollTo({ top: window.scrollY + track.getBoundingClientRect().top + travel, behavior: "instant" })
        else window.scrollTo({ top: window.scrollY + content.getBoundingClientRect().top, behavior: "instant" })
        update()
        content.focus({ preventScroll: true })
      }

      measure()
      update()
      window.addEventListener("scroll", queueUpdate, { passive: true })
      window.addEventListener("resize", measure, { passive: true })
      const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
      resizeObserver?.observe(stage)
      dispose = () => {
        cancelAnimationFrame(frame)
        resizeObserver?.disconnect()
        window.removeEventListener("scroll", queueUpdate)
        window.removeEventListener("resize", measure)
        track.style.removeProperty("height")
        content.inert = false
        content.removeAttribute("aria-hidden")
        gate.inert = false
        track.dataset.nightEntrance = "open"
        window.dispatchEvent(new Event(NIGHT_ENTRANCE_CHANGE))
      }
    }
    setup()
    preference.addEventListener("change", setup)
    return () => { dispose(); skipRef.current = undefined; preference.removeEventListener("change", setup) }
  }, [])

  const skip = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!skipRef.current) return
    event.preventDefault()
    skipRef.current()
  }

  return (
    <div ref={trackRef} className={styles.entranceTrack} data-night-entrance="active">
      <div ref={stageRef} className={styles.entranceStage}>
        <section ref={gateRef} className={styles.gate} aria-labelledby="night-gate-title">
          <div className={`${styles.gatePanel} ${styles.gateLeft}`} aria-hidden="true" />
          <div className={`${styles.gatePanel} ${styles.gateRight}`} aria-hidden="true" />
          <div className={styles.gateGlow} aria-hidden="true" />
          <div className={styles.gateCopy}>
            <h2 id="night-gate-title" className={styles.gateTitle}>さあ、野生に帰ろう。</h2>
          </div>
          <a href="#night-tour-start" className={styles.gateScroll} onClick={skip} aria-label="夜の森へ進む（演出をスキップ）"><ArrowDown size={18} strokeWidth={1} aria-hidden="true" /></a>
        </section>
        <div ref={contentRef} id="night-tour-start" className={styles.heroStage} tabIndex={-1}>{children}</div>
      </div>
    </div>
  )
}
