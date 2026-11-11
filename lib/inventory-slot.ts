// 予約在庫（管理システム docs/130）：予約画面の時刻ボタンで使う、空きの読み方（ブラウザでも使う。重い部品は読み込まない）。
export type SlotState = { state: "OPEN" | "FULL" | "CLOSED" | "NOT_OFFERED" | "UNMANAGED"; remaining: number | null }
export type DaySlots = { main: Record<string, SlotState>; night: Record<string, SlotState> }
export const DAY_TIME = "-"
// 選べるか：空きの情報が無い時・在庫を管理していない時刻は今まで通り選べる（送信は今の仮予約）。人数は3歳未満も数える。
export const slotSelectable = (slot: SlotState | undefined, people: number) =>
  !slot || slot.state === "UNMANAGED" || (slot.state === "OPEN" && (slot.remaining === null || slot.remaining >= Math.max(1, people)))
// ボタンの下に出す文（空き・満席・受付なし）。何も出さない時は null。
export const LOW_REMAINING = 5
export function slotNote(slot: SlotState | undefined, people: number, copy: { full: string; closed: string; remaining: (n: number) => string; tooMany: (n: number) => string }): string | null {
  if (!slot || slot.state === "UNMANAGED") return null
  if (slot.state === "FULL" || (slot.state === "OPEN" && slot.remaining === 0)) return copy.full
  if (slot.state !== "OPEN") return copy.closed
  if (slot.remaining !== null && slot.remaining < Math.max(1, people)) return copy.tooMany(slot.remaining)
  if (slot.remaining !== null && slot.remaining <= LOW_REMAINING) return copy.remaining(slot.remaining)
  return null
}
export const SLOT_COPY_JA = { full: "満席", closed: "受付なし", remaining: (n: number) => `残り${n}名`, tooMany: (n: number) => `残り${n}名` }

// 英語・韓国語・繁体字の予約画面（貸切プラン）で使う文。
type IntlLocale = "en" | "ko" | "zh-tw"
export const SLOT_COPY_INTL: Record<IntlLocale, { full: string; closed: string; remaining: (n: number) => string; tooMany: (n: number) => string }> = {
  en: { full: "Full", closed: "Unavailable", remaining: (n) => `${n} left`, tooMany: (n) => `${n} left` },
  ko: { full: "마감", closed: "접수 불가", remaining: (n) => `남은 ${n}명`, tooMany: (n) => `남은 ${n}명` },
  "zh-tw": { full: "已額滿", closed: "不開放", remaining: (n) => `剩餘${n}位`, tooMany: (n) => `剩餘${n}位` },
}
export const BOOKING_CONFIRMED_INTL: Record<IntlLocale, { title: string; body: string; slotFull: string; dayFull: string }> = {
  en: { title: "Your booking is confirmed!", body: "We checked availability and confirmed your booking. We will send the details on LINE.", slotFull: "That time has just filled up. Please choose another date or time.", dayFull: "This date is full. Please choose another date." },
  ko: { title: "예약이 확정되었습니다!", body: "빈자리를 확인하고 예약을 확정했습니다. 자세한 안내는 LINE으로 보내드립니다.", slotFull: "선택하신 시간이 방금 마감되었습니다. 다른 날짜나 시간을 선택해 주세요.", dayFull: "이 날짜는 마감되었습니다. 다른 날짜를 선택해 주세요." },
  "zh-tw": { title: "預約已確定！", body: "已確認空位並確定您的預約。詳細資訊將透過LINE通知您。", slotFull: "您選擇的時段剛剛額滿，請選擇其他日期或時段。", dayFull: "此日期已額滿，請選擇其他日期。" },
}
