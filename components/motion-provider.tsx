"use client"

import { MotionConfig } from "framer-motion"
import type { ReactNode } from "react"

// OSの「視差効果を減らす」設定を尊重し、framer-motionの
// transform/layoutアニメーションを自動的に無効化する
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
