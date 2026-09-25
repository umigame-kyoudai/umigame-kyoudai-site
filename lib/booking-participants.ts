// 代表者は参加者1人目の大人。人数・年齢・レンタル等の入力値はそのまま保持する。
export function syncRepresentativeName<T extends { name: string; category: string }>(
  participants: T[],
  representativeName: string,
): T[] {
  const first = participants[0]
  // 入力中の空白を残す。送信時のtrimは予約フォーム側で行う。
  const name = representativeName
  if (!first || first.category !== "adult" || first.name === name) return participants
  return [{ ...first, name }, ...participants.slice(1)]
}
