// ============================================================
// プラン分類の単一ソース（Single Source of Truth）
// ------------------------------------------------------------
// セットプランの判定・時間枠・含まれるツアー併記を一元管理する。
// 予約API(app/api/booking/route.ts)・予約フォーム(components/booking-form.tsx)・
// 参加者フォーム(components/participant-form.tsx) は全てここを import して参照する。
//
// 【セットを増やすとき】このファイルの集合と COMBO_CONTENT_TEXT を更新すれば、
//   3ファイルすべてに反映される（個別のコピペ更新漏れによるバグを防ぐ）。
// ============================================================

// セットプラン全般（スタッフ指名不可・複合の備考ブロック付与・60歳お断りの対象）
// C1/C2＝昼夜セット、C3/C4＝海空セット、C5/C6＝まるごと1日セット（トリプル）
export const COMBO_PLAN_IDS = new Set(["C1", "C2", "C3", "C4", "C5", "C6"])
// 夜のヤシガニ探検（ナイトツアー）を含む昼夜セット
export const NIGHT_COMBO_PLAN_IDS = new Set(["C1", "C2"])
// ドローンSUP（昼・連続）を含む海空セット
export const DAY_COMBO_PLAN_IDS = new Set(["C3", "C4"])
// 朝シュノーケル＋昼SUP＋夜ナイトの3アクティビティ複合（夜時刻あり＋SUP連続の両方）
export const TRIPLE_COMBO_PLAN_IDS = new Set(["C5", "C6"])

// スタッフ指名を利用できないプラン
export const STAFF_UNAVAILABLE_PLAN_IDS = new Set([
  "S3", "S4", "S5", "S6", "S7", "slide-boat", "C1", "C2", "C3", "C4", "C5", "C6",
])
// 開始時刻が固定でない（確定時にLINEで案内する）プラン
export const TIME_OPTIONAL_PLAN_IDS = new Set(["S4", "S6", "S7"])
// 通常シュノーケルを含み、60歳以上をお断りするプラン（S1 とセットプラン）
export const SENIOR_RESTRICTED_PLAN_IDS = new Set(["S1", "C1", "C2", "C3", "C4", "C5", "C6"])
// 3歳以下が無料で参加できるプラン（ナイトツアー）
export const FREE_UNDER3_PLAN_IDS = new Set(["S3", "S5"])

// セットの夜（ヤシガニ探検）開始時刻の候補
export const COMBO_NIGHT_TIMES = ["19:20", "21:10"]
// セットの海亀（シュノーケル）開始時刻の候補
export const COMBO_TURTLE_TIMES = ["09:00", "11:00", "14:00", "16:00"]
// ドローンSUPは海況・水位で調整するため、時刻は確定時にご案内
export const DAY_SUP_TIME_NOTE = "海況・水位により調整（予約確定時にご案内）"

export const isComboPlan = (planId: string): boolean => COMBO_PLAN_IDS.has(planId)
export const isTripleComboPlan = (planId: string): boolean => TRIPLE_COMBO_PLAN_IDS.has(planId)
// SUP（ドローンSUP・連続）を含む = 海空セット(C3/C4) + トリプル(C5/C6)
export const planHasSup = (planId: string): boolean =>
  DAY_COMBO_PLAN_IDS.has(planId) || isTripleComboPlan(planId)
// 夜（ナイトツアー）を含み夜時刻の選択が必要 = 昼夜セット(C1/C2) + トリプル(C5/C6)
export const planHasNight = (planId: string): boolean =>
  NIGHT_COMBO_PLAN_IDS.has(planId) || isTripleComboPlan(planId)
// ナイトツアー単品（3歳以下区分・子どもの最低年齢判定に使用）
export const isNightTourPlan = (planId: string): boolean => planId === "S3" || planId === "S5"

// 複合プランの「内容」行（含まれる単品ツアーの併記）。備考の [COMBO booking] に入る。
export const COMBO_CONTENT_TEXT: Record<string, string> = {
  C1: "内容：S1 ウミガメシュノーケル + S3 ヤシガニ探検",
  C2: "内容：S2 【貸切】ウミガメシュノーケル + S5 【貸切】ヤシガニ探検",
  C3: "内容：S1 ウミガメシュノーケル + S6 ドローンSUP",
  C4: "内容：S2 【貸切】ウミガメシュノーケル + S7 【貸切】ドローンSUP",
  C5: "内容：S1 ウミガメシュノーケル + S6 ドローンSUP + S3 ナイトツアー",
  C6: "内容：S2 【貸切】ウミガメシュノーケル + S7 【貸切】ドローンSUP + S5 【貸切】ナイトツアー",
}
export const getComboContentText = (planId: string): string =>
  COMBO_CONTENT_TEXT[planId] || ""
