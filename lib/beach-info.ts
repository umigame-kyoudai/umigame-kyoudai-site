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
