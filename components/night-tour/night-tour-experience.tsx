"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowUpRight, Menu, Moon, X } from "lucide-react"
import { NIGHT_GUIDE } from "@/lib/staff"
import { SITE_CONFIG } from "@/lib/site-config"
import styles from "./night-tour.module.css"

/** 演出が動かなくても本文・写真・予約リンクはすべて読める。 */
export function NightExperience({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = root.current
    if (!element) return
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    let dispose = () => {}
    const setup = () => {
      dispose()
      if (preference.matches) return
      const reveals = Array.from(element.querySelectorAll<HTMLElement>("[data-night-reveal]"))
      const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-night-reveal", "visible")
            observer?.unobserve(entry.target)
          }
        }
      }, { threshold: 0.08 })
      reveals.forEach(node => {
        if (observer && node.getBoundingClientRect().top > window.innerHeight) node.dataset.nightReveal = "pending"
        observer?.observe(node)
      })

      const cleanups = Array.from(element.querySelectorAll<HTMLElement>("[data-night-light]")).map(node => {
        let frame = 0
        const move = (event: PointerEvent) => {
          cancelAnimationFrame(frame)
          const rect = node.getBoundingClientRect()
          const x = ((event.clientX - rect.left) / rect.width) * 100
          const y = ((event.clientY - rect.top) / rect.height) * 100
          frame = requestAnimationFrame(() => {
            node.style.setProperty("--light-x", `${x}%`)
            node.style.setProperty("--light-y", `${y}%`)
          })
        }
        const reset = () => {
          cancelAnimationFrame(frame)
          node.style.removeProperty("--light-x")
          node.style.removeProperty("--light-y")
        }
        node.addEventListener("pointermove", move, { passive: true })
        node.addEventListener("pointerdown", move, { passive: true })
        node.addEventListener("pointerleave", reset)
        return () => {
          reset()
          node.removeEventListener("pointermove", move)
          node.removeEventListener("pointerdown", move)
          node.removeEventListener("pointerleave", reset)
        }
      })
      dispose = () => {
        observer?.disconnect()
        reveals.forEach(node => { node.dataset.nightReveal = "visible" })
        cleanups.forEach(cleanup => cleanup())
      }
    }
    setup()
    preference.addEventListener("change", setup)
    return () => { dispose(); preference.removeEventListener("change", setup) }
  }, [])

  return <div ref={root} className={className} data-night-world>{children}</div>
}

const sections = [
  { href: "#guide", label: `${NIGHT_GUIDE.name}のこと` },
  { href: "#encounters", label: "夜の探索" },
  { href: "#details", label: "参加のご案内" },
]

export function NightNavigation() {
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus() }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label={`${SITE_CONFIG.siteNameJa} 夜の部・ホームへ`}>
        <span className={styles.brandLogo} aria-hidden="true" />
        <span className={styles.brandNight}><Moon size={12} strokeWidth={1.8} aria-hidden="true" />夜の部</span>
      </Link>
      <nav aria-label="ナイトツアー内のメニュー" className={styles.desktopNav}>
        {sections.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}
      </nav>
      <div className={styles.headerActions}>
        <a href="#reserve" className={styles.headerBook}>冒険を予約 <ArrowUpRight size={15} aria-hidden="true" /></a>
        <button ref={toggle} type="button" className={styles.menuButton} aria-label={open ? "メニューを閉じる" : "メニューを開く"} aria-expanded={open} aria-controls="night-menu" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <nav id="night-menu" aria-label="ナイトツアーのモバイルメニュー" className={styles.mobileNav} hidden={!open}>
        {sections.map(item => <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}<ArrowUpRight size={17} aria-hidden="true" /></a>)}
        <Link href="/plans" onClick={() => setOpen(false)}>ほかのツアーを見る<ArrowUpRight size={17} aria-hidden="true" /></Link>
      </nav>
    </header>
  )
}
