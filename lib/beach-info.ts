// シュノーケルツアーの開催候補ビーチと現地設備の単一ソース。
// プラン詳細（S1/S2 の locations）と /access ページの両方がここを参照する。
// 集合場所は当日の海況で選ぶため「候補」であり、確定は予約後にLINEで案内する運用。
export interface BeachInfo {
  name: string
  /** ウミガメ遭遇の目安（プラン詳細の表示用。/access では使用しない） */
  encounterRate: number
  parking: string
  toilet: boolean
  shower: boolean
  note?: string
}

export const SNORKEL_BEACHES: BeachInfo[] = [
  { name: "新城海岸", encounterRate: 95, parking: "¥2,000", toilet: true, shower: true },
  { name: "東平安名ビーチ", encounterRate: 80, parking: "無料", toilet: false, shower: false, note: "事前にトイレを済ませてください" },
  { name: "ワイワイビーチ", encounterRate: 80, parking: "無料", toilet: false, shower: false, note: "事前にトイレを済ませてください" },
  { name: "シギラビーチ", encounterRate: 80, parking: "¥1,000", toilet: true, shower: false, note: "業者が多くウミガメ写真撮影は保証できない場合あり" },
]

// サンセットSUP（S4）の催行候補地（2026-07-12 オーナー提供）。
// 当日の風向き・海況でこの中から選定し、前日にLINEで確定する運用。
// /access ページとプラン詳細の記載はこのリストと一致させること。
export const SUNSET_SUP_SPOTS: Array<{ name: string; mapUrl: string }> = [
  { name: "トゥリバー海浜公園", mapUrl: "https://maps.app.goo.gl/WJgNZk1uy7DUAbxg8" },
  { name: "パシャビーチ", mapUrl: "https://maps.app.goo.gl/ZhsBrm6gjGCuF7sRA" },
  { name: "与那覇ビーチ北", mapUrl: "https://maps.app.goo.gl/qf9vHu4H15zoRC5D7" },
  { name: "インギャーマリンガーデン", mapUrl: "https://maps.app.goo.gl/UfoswiPzLbB2mwRp7" },
  { name: "西浜ビーチ", mapUrl: "https://maps.app.goo.gl/BxMdRiVyRUkPwf6CA" },
]

// サンセットSUPの月別集合時間の目安（日没の約90分前をキリのよい時刻に丸めたもの）。
// 正確な時刻は前日にLINEで確定する。ツアーは約2時間＝日没の約30分後に解散。
// 指定月の集合・解散の目安（解散＝集合の約2時間後＝日没の約30分後）
export function getSunsetSupGuide(month: number): { meet: string; end: string } {
  const entry = SUNSET_SUP_MEETING_TIMES.find((t) => t.month === month) ?? SUNSET_SUP_MEETING_TIMES[0]
  const [h, m] = entry.time.split(":").map(Number)
  const end = `${String(h + 2).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  return { meet: entry.time, end }
}

export const SUNSET_SUP_MEETING_TIMES: Array<{ month: number; time: string }> = [
  { month: 1, time: "16:45" },
  { month: 2, time: "17:00" },
  { month: 3, time: "17:15" },
  { month: 4, time: "17:30" },
  { month: 5, time: "17:45" },
  { month: 6, time: "18:00" },
  { month: 7, time: "18:00" },
  { month: 8, time: "17:45" },
  { month: 9, time: "17:15" },
  { month: 10, time: "16:45" },
  { month: 11, time: "16:30" },
  { month: 12, time: "16:30" },
]
