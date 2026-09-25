// 導入演出中は案内UIの表示だけを遅らせる。同意状態や計測の可否は変更しない。
export const NIGHT_ENTRANCE_CHANGE = "night-entrance-change"

export function isNightEntranceActive(): boolean {
  return typeof document !== "undefined" && !!document.querySelector('[data-night-entrance="active"]')
}
